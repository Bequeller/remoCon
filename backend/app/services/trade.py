# backend/app/services/trade.py

import csv
import logging
from datetime import datetime
from decimal import ROUND_DOWN, Decimal
from pathlib import Path
from typing import Any

from app.clients.binance_client import BinanceFuturesClient
from app.models.schemas import TradeRequest
from app.utils.errors import AppError

logger = logging.getLogger(__name__)


class TradeService:
    def __init__(self, binance_client: BinanceFuturesClient):
        self.client = binance_client
        # CSV 파일 경로 설정
        self.csv_file_path = Path(__file__).parent.parent.parent / "data" / "trades.csv"
        self.csv_file_path.parent.mkdir(parents=True, exist_ok=True)

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
                    "quantity": trade_data.get("origQty", ""),
                    "price": trade_data.get("avgPrice", ""),
                    "leverage": trade_data.get("leverage", ""),
                    "order_id": str(trade_data.get("orderId", "")),
                    "status": trade_data.get("status", ""),
                    "binance_status": trade_data.get(
                        "status", ""
                    ),  # 바이낸스 원본 상태
                    "order_type": trade_data.get("type", ""),
                    "trade_result": trade_data.get("trade_result", ""),
                    "error_message": trade_data.get("error_message", ""),
                    "user": trade_data.get("user", ""),
                }

                writer.writerow(row)
                logger.info(
                    f"Trade data saved to CSV: {trade_data.get('symbol', '')} {trade_data.get('side', '')}"
                )

        except Exception as e:
            logger.error(f"Failed to save trade to CSV: {e}")
            # CSV 저장 실패해도 거래는 계속 진행

    async def _get_symbol_info(self, symbol: str) -> dict[str, Any]:
        """Fetches exchange information for a specific symbol."""
        exchange_info = await self.client.get_exchange_info()
        for s in exchange_info.get("symbols", []):
            if s.get("symbol") == symbol:
                return s
        raise AppError(f"Symbol {symbol} not found.")

    async def place_order(self, order_data: TradeRequest) -> dict[str, Any]:
        """Places a market order on Binance Futures."""
        try:
            logger.info(
                f"Starting order placement for {order_data.symbol}, side: {order_data.side}, size: {order_data.size}, leverage: {order_data.leverage}"
            )

            # 거래 시도 상태를 CSV에 기록
            attempt_trade_data = {
                "symbol": order_data.symbol,
                "side": order_data.side.value.upper(),
                "quantity": "0",  # 아직 계산되지 않음
                "leverage": order_data.leverage,
                "trade_result": "ATTEMPTING",  # 거래 시도 상태
                "error_message": "",
                "order_id": "",
                "status": "ATTEMPTING",
                "order_type": "MARKET",
                "user": order_data.user,  # 사용자 정보 추가
            }
            self._save_trade_to_csv(attempt_trade_data)

            # 1. Get symbol info (for quantity precision and min order size)
            symbol_info = await self._get_symbol_info(order_data.symbol)
            quantity_precision = int(symbol_info.get("quantityPrecision", 0))

            # Get minimum quantity from LOT_SIZE filter
            filters = symbol_info.get("filters", [])
            min_qty = Decimal("0.001")  # default
            for f in filters:
                if f.get("filterType") == "LOT_SIZE":
                    min_qty = Decimal(f.get("minQty", "0.001"))
                    break

            logger.debug(
                f"Symbol info - quantity_precision: {quantity_precision}, min_qty: {min_qty}"
            )

            # 2. Get mark price
            mark_price_data = await self.client.get_mark_price(symbol=order_data.symbol)
            mark_price = Decimal(mark_price_data["markPrice"])
            logger.debug(f"Mark price: {mark_price}")
            if mark_price <= 0:
                raise AppError("Invalid mark price.")

            # 3. Calculate quantity from USDT size
            size_in_usdt = Decimal(str(order_data.size))
            logger.debug(f"Size in USDT: {size_in_usdt}")
            quantity = size_in_usdt / mark_price
            logger.debug(f"Calculated quantity: {quantity}")

            # 4. Check minimum quantity and adjust if needed
            if quantity < min_qty:
                logger.warning(
                    f"Calculated quantity {quantity} is less than minimum {min_qty}, adjusting to minimum"
                )
                quantity = min_qty
                # Recalculate size based on minimum quantity
                adjusted_size = quantity * mark_price
                logger.info(
                    f"Adjusted quantity to {quantity}, size changed from {size_in_usdt} to {adjusted_size}"
                )

            # 5. Format quantity based on precision
            quantizer = Decimal("1e-" + str(quantity_precision))
            formatted_quantity = str(quantity.quantize(quantizer, rounding=ROUND_DOWN))
            logger.info(f"Final formatted quantity: {formatted_quantity}")

            if Decimal(formatted_quantity) <= 0:
                logger.error(
                    f"Quantity calculation resulted in zero or negative: {formatted_quantity}"
                )
                logger.error(
                    f"Debug info - size: {size_in_usdt}, mark_price: {mark_price}, precision: {quantity_precision}, min_qty: {min_qty}"
                )
                raise AppError(
                    f"Calculated quantity is zero or negative: {formatted_quantity}"
                )

            # 5. Set leverage
            await self.client.set_leverage(
                symbol=order_data.symbol, leverage=order_data.leverage
            )

            # 6. Place market order
            order_result = await self.client.place_market_order(
                symbol=order_data.symbol,
                side=order_data.side.value.upper(),
                quantity=formatted_quantity,
            )

            # 7. Save trade data to CSV
            trade_csv_data = {
                **order_result,  # 바이낸스 API 응답 데이터 포함 (먼저 추가해서 덮어쓰기 방지)
                "symbol": order_data.symbol,
                "side": order_data.side.value.upper(),
                "quantity": formatted_quantity,
                "leverage": order_data.leverage,
                "trade_result": "COMPLETED",  # 거래 성공 상태
                "error_message": "",
                "user": order_data.user,  # 사용자 정보 추가 (마지막에 추가해서 덮어쓰기 방지)
            }
            self._save_trade_to_csv(trade_csv_data)

            return order_result

        except Exception as e:
            logger.error(f"Error placing order for {order_data.symbol}: {e}")

            # 거래 실패 시 CSV에 기록
            try:
                failed_trade_data = {
                    "symbol": order_data.symbol,
                    "side": order_data.side.value.upper(),
                    "quantity": "0",  # 실패했으므로 수량 0
                    "leverage": order_data.leverage,
                    "trade_result": "FAILED",  # 거래 실패 상태
                    "error_message": str(e),
                    "order_id": "",
                    "status": "FAILED",
                    "order_type": "MARKET",
                    "user": order_data.user,  # 사용자 정보 추가
                }
                self._save_trade_to_csv(failed_trade_data)
            except Exception as csv_error:
                logger.error(f"Failed to save failed trade to CSV: {csv_error}")

            raise AppError(f"Failed to place order: {e}") from e
