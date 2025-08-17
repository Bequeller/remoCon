import os
from collections.abc import AsyncGenerator

from fastapi import Request

from external.binance import BinanceFuturesClient


# intent: provide app-scoped Binance client dependency
async def get_binance_client(
    request: Request,
) -> AsyncGenerator[BinanceFuturesClient, None]:
    # intent: provide app-scoped singleton client from app.state
    client = getattr(request.app.state, "binance_client", None)
    if client is None:
        # fallback (should not happen if startup is configured)
        use_testnet = os.getenv("USE_TESTNET", "true").lower() == "true"
        client = BinanceFuturesClient(use_testnet=use_testnet)
        request.app.state.binance_client = client
    yield client
