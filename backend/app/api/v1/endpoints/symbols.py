from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.api.deps import get_binance_client
from app.models.schemas import Symbol, SymbolsResponse
from app.services.cache_service import SymbolMetaCache

router = APIRouter()

# 서비스 인스턴스
symbol_cache = SymbolMetaCache()


@router.get(
    "/symbols", response_model=SymbolsResponse, summary="Get available trading symbols"
)
async def get_symbols(client=Depends(get_binance_client)):
    """거래 가능한 심볼 목록을 반환합니다. TRADING 상태이고 USDT 페어인 모든 심볼을 필터링합니다."""
    try:
        exchange_info = await symbol_cache.get_exchange_info(client)

        # 거래 가능한 심볼만 필터링
        trading_symbols = []
        for symbol_info in exchange_info.get("symbols", []):
            symbol = symbol_info.get("symbol", "")
            status = symbol_info.get("status", "")
            quote_asset = symbol_info.get("quoteAsset", "")

            # TRADING 상태이고 USDT 페어인 모든 심볼
            if status == "TRADING" and quote_asset == "USDT":
                trading_symbols.append(
                    Symbol(
                        symbol=symbol,
                        baseAsset=symbol_info.get("baseAsset", ""),
                        quoteAsset=quote_asset,
                    )
                )

        return SymbolsResponse(symbols=trading_symbols)

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"ok": False, "error": f"Failed to fetch symbols: {str(e)}"},
        )
