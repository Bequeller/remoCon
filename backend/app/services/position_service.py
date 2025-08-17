"""Position management service for Binance futures trading."""

import time
from typing import Optional

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


# 싱글톤 인스턴스
position_service = PositionService()
