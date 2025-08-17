from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


# intent: shared API request/response schemas for mock endpoints
class HealthCheck(BaseModel):
    is_testnet: bool = Field(..., description="바이낸스 테스트넷 사용 여부")
    symbols: list[dict] = Field(..., description="거래 가능한 모든 심볼 정보")


class OrderSide(str, Enum):
    BUY = "buy"
    SELL = "sell"


class TradeRequest(BaseModel):
    symbol: str = Field(..., description="Trading symbol, e.g., BTCUSDT")
    side: OrderSide = Field(..., description="Order side: 'buy' or 'sell'")
    size: float = Field(..., gt=0, description="Order size in USDT")
    leverage: int = Field(..., ge=1, le=100, description="Leverage")


class TradeResponse(BaseModel):
    orderId: str
    symbol: str
    side: Literal["BUY", "SELL"]
    executedQty: str
    avgPrice: str
    status: str


class Position(BaseModel):
    symbol: str
    positionAmt: str
    entryPrice: str
    leverage: int
    unRealizedProfit: str
    marginType: str


class Balance(BaseModel):
    """Futures 잔고 정보"""

    accountAlias: str
    asset: str
    balance: str
    crossWalletBalance: str
    crossUnPnl: str
    availableBalance: str
    maxWithdrawAmount: str


class Symbol(BaseModel):
    symbol: str
    baseAsset: str
    quoteAsset: str


class SymbolsResponse(BaseModel):
    symbols: list[Symbol]


class ErrorResponse(BaseModel):
    requestId: str
    code: str
    message: str
