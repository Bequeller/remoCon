# backend/app/services/trade.py

import logging
from decimal import ROUND_DOWN, Decimal
from typing import Any

from app.clients.binance_client import BinanceFuturesClient
from app.models.schemas import TradeRequest
from app.utils.errors import AppError

logger = logging.getLogger(__name__)


class TradeService:
    def __init__(self, binance_client: BinanceFuturesClient):
        self.client = binance_client

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
            return order_result

        except Exception as e:
            logger.error(f"Error placing order for {order_data.symbol}: {e}")
            raise AppError(f"Failed to place order: {e}") from e
