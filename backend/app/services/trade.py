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
            # 1. Get symbol info (for quantity precision)
            symbol_info = await self._get_symbol_info(order_data.symbol)
            quantity_precision = int(symbol_info.get("quantityPrecision", 0))

            # 2. Get mark price
            mark_price_data = await self.client.get_mark_price(symbol=order_data.symbol)
            mark_price = Decimal(mark_price_data["markPrice"])
            if mark_price <= 0:
                raise AppError("Invalid mark price.")

            # 3. Calculate quantity from USDT size
            size_in_usdt = Decimal(str(order_data.size))
            quantity = size_in_usdt / mark_price

            # 4. Format quantity based on precision
            quantizer = Decimal("1e-" + str(quantity_precision))
            formatted_quantity = str(quantity.quantize(quantizer, rounding=ROUND_DOWN))

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
