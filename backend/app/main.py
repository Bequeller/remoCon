from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.endpoints import health, positions, symbols, trade
from app.clients.binance_client import BinanceFuturesClient
from app.core.config import CORS_ORIGIN, get_binance_config
from app.utils.middleware import access_log_middleware


# intent: minimal FastAPI app with health check and static SPA mount
@asynccontextmanager
async def lifespan(app: FastAPI):
    # intent: create a single AsyncClient-bound Binance client for app lifetime
    binance_config = get_binance_config()
    app.state.binance_client = BinanceFuturesClient(
        use_testnet=binance_config["use_testnet"]
    )

    # API 키 모니터링 시작
    from app.core.security import api_key_monitor

    await api_key_monitor.start_monitoring()

    try:
        yield
    finally:
        try:
            await app.state.binance_client.close()
        except Exception:
            pass


app = FastAPI(title="Futures Remote Microservice", version="0.1.0", lifespan=lifespan)

# 미들웨어 설정
app.middleware("http")(access_log_middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(health.router, tags=["health"])
app.include_router(trade.router, prefix="/api", tags=["trade"])
app.include_router(positions.router, prefix="/api", tags=["positions"])
app.include_router(symbols.router, prefix="/api", tags=["symbols"])
