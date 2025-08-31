"""Position management service for Binance futures trading."""

import csv
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

from app.clients.binance_client import BinanceFuturesClient
from app.core.config import POSITION_CACHE_TTL
from app.models.schemas import Position

logger = logging.getLogger(__name__)


class PositionService:
    """포지션 관리 서비스"""

    def __init__(self):
        self._position_cache = {}
        self._cache_ttl = POSITION_CACHE_TTL
        # CSV 파일 경로 설정
        self.csv_file_path = Path(__file__).parent.parent.parent / "data" / "trades.csv"
        self.csv_file_path.parent.mkdir(parents=True, exist_ok=True)

    def _is_cache_valid(self, timestamp: float) -> bool:
        """캐시가 유효한지 확인"""
        return time.time() - timestamp < self._cache_ttl

    def _save_trade_to_csv(self, trade_data: dict[str, Any]) -> None:
        """거래 데이터를 CSV 파일에 저장"""
        try:
            file_exists = self.csv_file_path.exists()

            with open(
                self.csv_file_path, mode="a", newline="", encoding="utf-8"
            ) as file:
                fieldnames = [
                    "timestamp",
                    "symbol",
                    "side",
                    "quantity",
                    "price",
                    "leverage",
                    "order_id",
                    "status",
                    "binance_status",
                    "order_type",
                    "trade_result",
                    "error_message",
                    "user",
                ]
                writer = csv.DictWriter(file, fieldnames=fieldnames)

                # 파일이 없으면 헤더 작성
                if not file_exists:
                    writer.writeheader()

                # 현재 시간 가져오기
                timestamp = datetime.now().isoformat()

                # 거래 데이터 준비
                row = {
                    "timestamp": timestamp,
                    "symbol": trade_data.get("symbol", ""),
                    "side": trade_data.get("side", ""),
                    "quantity": trade_data.get("quantity", ""),
                    "price": trade_data.get("price", ""),
                    "leverage": trade_data.get("leverage", ""),
                    "order_id": str(trade_data.get("orderId", "")),
                    "status": trade_data.get("status", ""),
                    "binance_status": trade_data.get(
                        "status", ""
                    ),  # 바이낸스 원본 상태
                    "order_type": trade_data.get("order_type", ""),
                    "trade_result": trade_data.get("trade_result", ""),
                    "error_message": trade_data.get("error_message", ""),
                    "user": trade_data.get(
                        "user", ""
                    ),  # 청산 시에는 user 정보가 없을 수 있음
                }

                writer.writerow(row)
                logger.info(
                    f"Position close data saved to CSV: {trade_data.get('symbol', '')} {trade_data.get('side', '')} - {trade_data.get('trade_result', '')}"
                )

        except Exception as e:
            logger.error(f"Failed to save position close to CSV: {e}")
            # CSV 저장 실패해도 청산은 계속 진행

    async def get_positions(
        self, symbol: Optional[str] = None, bypass_cache: bool = False
    ) -> list[Position]:
        """
        현재 활성 포지션 정보를 조회합니다.

        Args:
            symbol: 특정 심볼의 포지션만 조회 (선택사항)

        Returns:
            활성 포지션 목록
        """
        # 캐시 키 생성
        cache_key = f"positions_{symbol or 'all'}"
        logger.info(
            f"Checking cache for key: {cache_key}, bypass_cache: {bypass_cache}"
        )

        # 캐시 우회 옵션이 있으면 캐시를 사용하지 않음
        if not bypass_cache:
            # 캐시 확인
            if cache_key in self._position_cache:
                cached_data, timestamp = self._position_cache[cache_key]
                if self._is_cache_valid(timestamp):
                    logger.info(
                        f"Returning cached data for {cache_key}, age: {time.time() - timestamp:.1f}s"
                    )
                    return cached_data
                else:
                    logger.info(
                        f"Cache expired for {cache_key}, age: {time.time() - timestamp:.1f}s"
                    )

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
        logger.info(f"Cache updated for {cache_key} with {len(results)} positions")

        return results

    async def close_position(
        self, symbol: str, user: str = "unknown"
    ) -> dict[str, Any]:
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
        # 청산 시도 상태를 CSV에 기록
        logger.info(f"Starting position close attempt for {symbol} by user {user}")
        attempt_close_data = {
            "symbol": symbol,
            "side": "CLOSE",  # 청산 작업임을 표시
            "quantity": "0",  # 아직 계산되지 않음
            "leverage": "0",  # 청산에서는 레버리지 정보 없음
            "trade_result": "ATTEMPTING",  # 청산 시도 상태
            "error_message": "",
            "order_id": "",
            "status": "ATTEMPTING",
            "order_type": "CLOSE_POSITION",
            "user": user,  # 사용자 정보 추가
        }
        self._save_trade_to_csv(attempt_close_data)

        # 현재 포지션 정보 조회
        positions = await self.get_positions(symbol)

        if not positions:
            # 청산 실패 상태 기록
            failed_close_data = {
                "symbol": symbol,
                "side": "CLOSE",
                "quantity": "0",
                "leverage": "0",
                "trade_result": "FAILED",
                "error_message": f"No active position found for {symbol}",
                "order_id": "",
                "status": "FAILED",
                "order_type": "CLOSE_POSITION",
                "user": user,  # 사용자 정보 추가
            }
            self._save_trade_to_csv(failed_close_data)
            raise ValueError(f"No active position found for {symbol}")

        position = positions[0]  # 해당 심볼의 첫 번째 포지션
        position_amt = float(position.positionAmt)

        if position_amt == 0:
            # 청산 실패 상태 기록
            failed_close_data = {
                "symbol": symbol,
                "side": "CLOSE",
                "quantity": "0",
                "leverage": "0",
                "trade_result": "FAILED",
                "error_message": f"No position amount for {symbol}",
                "order_id": "",
                "status": "FAILED",
                "order_type": "CLOSE_POSITION",
                "user": user,  # 사용자 정보 추가
            }
            self._save_trade_to_csv(failed_close_data)
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

            # 청산 성공 상태를 CSV에 기록
            logger.info(
                f"Position close completed successfully for {symbol} by user {user}"
            )
            success_close_data = {
                **result,  # 바이낸스 API 응답 데이터 포함 (먼저 추가해서 덮어쓰기 방지)
                "symbol": symbol,
                "side": side,
                "quantity": quantity,
                "leverage": position.leverage,
                "trade_result": "COMPLETED",  # 청산 성공 상태
                "error_message": "",
                "order_type": "CLOSE_POSITION",
                "user": user,  # 사용자 정보 추가 (마지막에 추가해서 덮어쓰기 방지)
            }
            self._save_trade_to_csv(success_close_data)

            # 캐시 무효화 (포지션 정보 갱신 필요)
            # 특정 심볼과 전체 포지션 캐시 모두 무효화
            cache_keys_to_delete = [f"positions_{symbol}", "positions_all"]
            for cache_key in cache_keys_to_delete:
                if cache_key in self._position_cache:
                    del self._position_cache[cache_key]
                    logger.info(
                        f"Cache invalidated for {cache_key} after position close"
                    )

            return result

        except Exception as e:
            # 청산 실패 상태를 CSV에 기록
            failed_close_data = {
                "symbol": symbol,
                "side": side,
                "quantity": quantity,
                "leverage": position.leverage,
                "trade_result": "FAILED",  # 청산 실패 상태
                "error_message": str(e),
                "order_id": "",
                "status": "FAILED",
                "order_type": "CLOSE_POSITION",
                "user": user,  # 사용자 정보 추가
            }
            self._save_trade_to_csv(failed_close_data)

            raise RuntimeError(
                f"Failed to close position for {symbol}: {str(e)}"
            ) from e
        finally:
            await client.close()


# 싱글톤 인스턴스
position_service = PositionService()
