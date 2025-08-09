import os
from typing import AsyncGenerator

from app.clients.binance import BinanceFuturesClient
from fastapi import Request


# intent: provide app-scoped Binance client dependency
async def get_binance_client(request: Request) -> AsyncGenerator[BinanceFuturesClient, None]:
    # intent: provide app-scoped singleton client from app.state
    client = getattr(request.app.state, "binance_client", None)
    if client is None:
        # fallback (should not happen if startup is configured)
        use_testnet = (os.getenv("USE_TESTNET", "true").lower() == "true")
        client = BinanceFuturesClient(use_testnet=use_testnet)
        request.app.state.binance_client = client
    yield client


