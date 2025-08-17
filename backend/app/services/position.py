"""Position management service for Binance futures trading."""

import time
from typing import Any, Optional

from app.clients.binance_client import BinanceFuturesClient
from app.core.config import POSITION_CACHE_TTL
from app.models.schemas import Position


class PositionService:
    """포지션 관리 서비스"""

    def __init__(self):
        self._position_cache = {}
        self._cache_ttl = POSITION_CACHE_TTL

    def _is_cache_valid(self, timestamp: float) -> bool:
        """캐시가 유효한지 확인"""
        return time.time() - timestamp < self._cache_ttl

    async def get_positions(self, symbol: Optional[str] = None) -> list[Position]:
        """
        현재 활성 포지션 정보를 조회합니다.

        Args:
            symbol: 특정 심볼의 포지션만 조회 (선택사항)

        Returns:
            활성 포지션 목록
        """
        # 캐시 키 생성
        cache_key = f"positions_{symbol or 'all'}"

        # 캐시 확인
        if cache_key in self._position_cache:
            cached_data, timestamp = self._position_cache[cache_key]
            if self._is_cache_valid(timestamp):
                return cached_data

        # 바이낸스 API 호출
        client = BinanceFuturesClient()
        try:
            data = await client.get_position_risk(symbol=symbol)
        finally:
            await client.close()

        # 포지션 데이터 파싱 및 필터링
        results: list[Position] = []
        for position_data in data if isinstance(data, list) else []:
            try:
                # 포지션 수량 확인
                position_amt = float(position_data.get("positionAmt", "0"))
                if position_amt == 0.0:
                    continue  # 포지션이 없는 경우 스킵

                # 포지션 정보 생성
                position = Position(
                    symbol=position_data.get("symbol", ""),
                    positionAmt=position_data.get("positionAmt", "0"),
                    entryPrice=position_data.get("entryPrice", "0"),
                    leverage=int(position_data.get("leverage", 0) or 0),
                    unRealizedProfit=position_data.get("unRealizedProfit", "0"),
                    marginType=str(position_data.get("marginType", "cross")).lower(),
                )
                results.append(position)

            except (ValueError, TypeError) as e:
                # 개별 포지션 파싱 실패 시 로그만 남기고 계속 진행
                print(f"Failed to parse position data: {e}")
                continue

        # 캐시 업데이트
        self._position_cache[cache_key] = (results, time.time())

        return results

    async def close_position(self, symbol: str) -> dict[str, Any]:
        """
        특정 심볼의 포지션을 청산합니다.

        Args:
            symbol: 청산할 포지션의 심볼 (예: "BTCUSDT")

        Returns:
            청산 결과 정보

        Raises:
            ValueError: 포지션이 없거나 청산할 수 없는 경우
            RuntimeError: API 호출 실패 시
        """
        # 현재 포지션 정보 조회
        positions = await self.get_positions(symbol)

        if not positions:
            raise ValueError(f"No active position found for {symbol}")

        position = positions[0]  # 해당 심볼의 첫 번째 포지션
        position_amt = float(position.positionAmt)

        if position_amt == 0:
            raise ValueError(f"No position amount for {symbol}")

        # 청산 방향 결정 (포지션과 반대 방향)
        side = "SELL" if position_amt > 0 else "BUY"
        quantity = str(abs(position_amt))

        # 바이낸스 API 호출하여 청산 주문
        client = BinanceFuturesClient()
        try:
            result = await client.place_market_order(
                symbol=symbol,
                side=side,
                quantity=quantity,
                reduce_only=True,  # 포지션 감소만 허용
            )

            # 캐시 무효화 (포지션 정보 갱신 필요)
            cache_key = f"positions_{symbol}"
            if cache_key in self._position_cache:
                del self._position_cache[cache_key]

            return result

        except Exception as e:
            raise RuntimeError(
                f"Failed to close position for {symbol}: {str(e)}"
            ) from e
        finally:
            await client.close()


# 싱글톤 인스턴스
position_service = PositionService()
