from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.clients.binance_client import BinanceFuturesClient
from app.models.schemas import Symbol, SymbolsResponse

router = APIRouter()


@router.get(
    "/symbols", response_model=SymbolsResponse, summary="Get available trading symbols"
)
async def get_symbols():
    """거래 가능한 심볼 목록을 반환합니다. TRADING 상태이고 USDT 페어인 모든 심볼을 필터링합니다."""
    # 직접 BinanceFuturesClient 생성
    client = BinanceFuturesClient()

    try:
        exchange_info = await client.get_exchange_info()

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
    finally:
        await client.close()
