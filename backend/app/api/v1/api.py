from fastapi import APIRouter

from app.api.v1.endpoints import health, positions, symbols, trade

api_router = APIRouter()

# 헬스체크 엔드포인트 등록 (prefix 없음)
api_router.include_router(health.router, tags=["health"])

# API 엔드포인트 등록
api_router.include_router(trade.router, prefix="/api", tags=["trade"])
api_router.include_router(positions.router, prefix="/api", tags=["positions"])
api_router.include_router(symbols.router, prefix="/api", tags=["symbols"])
