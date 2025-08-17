from typing import Literal

from pydantic import BaseModel


# intent: shared API request/response schemas for mock endpoints
class TradeRequest(BaseModel):
    symbol: str
    notional: float
    leverage: int
    side: Literal["BUY", "SELL"]


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
