from typing import Optional

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.api.deps import get_binance_client
from app.services.cache_service import PriceCache, SymbolMetaCache

router = APIRouter()

# 서비스 인스턴스
symbol_cache = SymbolMetaCache()
price_cache = PriceCache()


@router.get("/debug/exchangeInfo", summary="Debug Exchange Info (cached)")
async def debug_exchange_info(client=Depends(get_binance_client)):
    try:
        data = await symbol_cache.get_exchange_info(client)
        return {"ok": True, "data": data}
    except Exception as e:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})


@router.get("/debug/markPrice", summary="Debug Mark Price (premiumIndex, cached)")
async def debug_mark_price(
    symbol: Optional[str] = None, client=Depends(get_binance_client)
):
    try:
        data = await price_cache.get_mark_price(client, symbol=symbol)
        return {"ok": True, "data": data}
    except Exception as e:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})
