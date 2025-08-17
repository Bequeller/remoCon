import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from starlette import status

from app.clients.binance_client import BinanceFuturesClient
from app.models.schemas import TradeRequest
from app.services.trade import TradeService
from app.utils.errors import AppError

router = APIRouter()
logger = logging.getLogger(__name__)


# Dependency for BinanceFuturesClient
async def get_binance_client() -> BinanceFuturesClient:
    return BinanceFuturesClient()


# Dependency for TradeService
def get_trade_service(
    client: BinanceFuturesClient = Depends(get_binance_client),
) -> TradeService:
    return TradeService(client)


@router.post(
    "/order",
    status_code=status.HTTP_201_CREATED,
    summary="Place a market order",
    response_description="Details of the placed order",
)
async def place_market_order(
    trade_request: TradeRequest,
    trade_service: TradeService = Depends(get_trade_service),
) -> Any:
    """
    Places a new market order.

    - **symbol**: The trading symbol (e.g., `BTCUSDT`).
    - **side**: Order side (`buy` or `sell`).
    - **size**: Order size in USDT (must be > 0).
    - **leverage**: Leverage (1 to 100).
    """
    try:
        result = await trade_service.place_order(trade_request)
        return result
    except AppError as e:
        logger.error(f"Trade failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    except Exception as e:
        logger.exception(f"An unexpected error occurred: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {e}",
        ) from e
