from typing import List, Optional, Union
import os
import aiofiles
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from app.schemas import TradeRequest, TradeResponse, Position
from app.deps import get_binance_client
from fastapi import Depends
from fastapi.responses import RedirectResponse, JSONResponse
from app.cache import SymbolMetaCache, PriceCache
from app.leverage import LeverageManager
from app.errors import error_response
from app.order_service import (
    find_symbol_filters,
    compute_order_quantity,
    validate_precision,
)
from app.auth import require_auth
from app.config import ALLOWED_SYMBOLS, CORS_ORIGIN
from fastapi.middleware.cors import CORSMiddleware
from app.middleware import access_log_middleware
from contextlib import asynccontextmanager
from app.clients.binance import BinanceFuturesClient
from pydantic import BaseModel


# intent: minimal FastAPI app with health check and static SPA mount
@asynccontextmanager
async def lifespan(app: FastAPI):
    # intent: create a single AsyncClient-bound Binance client for app lifetime
    use_testnet = os.getenv("USE_TESTNET", "true").lower() == "true"
    app.state.binance_client = BinanceFuturesClient(use_testnet=use_testnet)
    try:
        yield
    finally:
        try:
            await app.state.binance_client.close()
        except Exception:
            pass


app = FastAPI(title="Futures Remote Microservice", version="0.1.0", lifespan=lifespan)
app.middleware("http")(access_log_middleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
symbol_cache = SymbolMetaCache()
price_cache = PriceCache()
leverage_manager = LeverageManager()


@app.get("/healthz")
async def healthz(client=Depends(get_binance_client)):
    # enriched health: env & binance reachability & time sync offset
    use_testnet = os.getenv("USE_TESTNET", "true").lower() == "true"
    api_key = bool(os.getenv("BINANCE_API_KEY"))
    api_sec = bool(os.getenv("BINANCE_API_SECRET"))
    has_keys = api_key and api_sec
    reachable = False
    offset_ms = 0
    try:
        await client.sync_time()
        # internal attr exists in client; if absent, keep 0
        offset_ms = getattr(client, "_ts_offset_ms", 0)
        reachable = True
    except Exception:
        reachable = False
    return {
        "status": "ok",
        "env": {
            "useTestnet": use_testnet,
            "hasKeys": has_keys,
            "allowedSymbols": len(ALLOWED_SYMBOLS),
        },
        "binance": {"reachable": reachable, "tsOffsetMs": offset_ms},
        "version": "0.1.0",
    }


@app.post(
    "/api/trade",
    response_model=TradeResponse,
    tags=["trade"],
    dependencies=[Depends(require_auth)],
)
async def post_trade(
    trade_req: TradeRequest, client=Depends(get_binance_client), request=Depends()
) -> Union[JSONResponse, TradeResponse]:
    # 1) 입력 1차 검증
    if trade_req.notional <= 0:
        return error_response("INVALID_NOTIONAL", "notional must be > 0", 400)
    if trade_req.leverage < 1 or trade_req.leverage > 25:
        return error_response("INVALID_LEVERAGE", "leverage must be in [1,25]", 400)

    # whitelist 검증
    if trade_req.symbol.upper() not in ALLOWED_SYMBOLS:
        return error_response("INVALID_SYMBOL", "symbol not allowed", 400)

    # 2) 메타/가격 조회(캐시)
    ex = await symbol_cache.get_exchange_info(client)
    mp = await price_cache.get_mark_price(client, symbol=trade_req.symbol)
    mark_price = (
        float(mp["markPrice"]) if isinstance(mp, dict) else float(mp[0]["markPrice"])
    )  # defensive

    # 3) 거래 필터 추출 및 수량 계산
    lot_size, min_notional = find_symbol_filters(ex, trade_req.symbol)
    step_size = lot_size.get("stepSize", "0.001")
    min_qty = lot_size.get("minQty", "0")
    qty = compute_order_quantity(trade_req.notional, mark_price, step_size, min_qty)
    if qty.is_zero():
        return error_response("MIN_QTY_VIOLATION", "quantity below minQty", 400)
    # precision enforcement
    sym_meta = next(
        (s for s in ex.get("symbols", []) if s.get("symbol") == trade_req.symbol), {}
    )
    ok, code = validate_precision(qty, mark_price, lot_size, sym_meta)
    if not ok:
        return error_response(code, "precision violation", 400)
    notional_check = float(qty) * mark_price
    min_notional_val = float(min_notional.get("notional", "0")) if min_notional else 0.0
    if notional_check < min_notional_val:
        return error_response(
            "MIN_NOTIONAL_VIOLATION", "order notional below minimum", 400
        )

    # 4) 레버리지 보장(변경시에만)
    await leverage_manager.ensure(client, trade_req.symbol, trade_req.leverage)

    # 5) 주문 실행(MARKET)
    try:
        resp = await client.place_market_order(
            symbol=trade_req.symbol,
            side=trade_req.side,
            quantity=str(qty.normalize()),
            reduce_only=False,
        )
        # 간단 표준화(실제 Binance 응답 키에 맞춰 최소 매핑)
        order_id = str(resp.get("orderId", resp.get("clientOrderId", "unknown")))
        executed = resp.get("executedQty") or resp.get("origQty") or str(qty)
        avg_price = resp.get("avgPrice") or resp.get("price") or str(mark_price)
        status = resp.get("status", "FILLED")
        # order log
        from app.logging_utils import setup_logger

        req_id = getattr(getattr(request, "state", {}), "request_id", "")
        setup_logger().info(
            f"reqId={req_id} symbol={trade_req.symbol} side={trade_req.side} qty={executed} status={status}"
        )
        return TradeResponse(
            orderId=order_id,
            symbol=trade_req.symbol,
            side=trade_req.side,
            executedQty=str(executed),
            avgPrice=str(avg_price),
            status=str(status),
        )
    except Exception as e:
        return error_response("UPSTREAM_ERROR", str(e), 502, request=request)


@app.get(
    "/api/positions",
    response_model=List[Position],
    tags=["positions"],
    dependencies=[Depends(require_auth)],
)
async def get_positions(
    client=Depends(get_binance_client), request=Depends()
) -> Union[JSONResponse, List[Position]]:
    try:
        data = await client.get_position_risk()
    except RuntimeError:
        return error_response(
            "UNAUTHORIZED", "API key/secret missing", 401, request=request
        )
    except Exception as e:
        return error_response("UPSTREAM_ERROR", str(e), 502, request=request)

    results: List[Position] = []
    for p in data if isinstance(data, list) else []:
        try:
            amt = float(p.get("positionAmt", "0"))
        except Exception:
            amt = 0.0
        if amt == 0.0:
            continue
        results.append(
            Position(
                symbol=p.get("symbol", ""),
                positionAmt=p.get("positionAmt", "0"),
                entryPrice=p.get("entryPrice", "0"),
                leverage=int(p.get("leverage", 0) or 0),
                unRealizedProfit=p.get("unRealizedProfit", "0"),
                marginType=str(p.get("marginType", "cross")).lower(),
            )
        )
    return results


# 로그 저장 요청 스키마
class SaveLogRequest(BaseModel):
    filename: str
    content: str


@app.get("/")
async def root_index():
    return RedirectResponse(url="/app/")


@app.post("/api/save-log")
async def save_log(request: SaveLogRequest):
    """거래 로그를 log 디렉토리에 저장"""
    try:
        # log 디렉토리 생성 (없으면)
        log_dir = Path("log")
        log_dir.mkdir(exist_ok=True)

        # 파일 경로 검증 (보안: 상위 디렉토리 접근 방지)
        file_path = log_dir / Path(request.filename).name

        # 파일이 존재하지 않으면 CSV 헤더 추가
        file_exists = file_path.exists()
        mode = "a" if file_exists else "w"

        content_to_write = request.content
        if not file_exists and request.filename.endswith(".csv"):
            # CSV 헤더 추가 (하루의 첫 거래일 때만)
            csv_header = (
                '"Timestamp","OrderID","Symbol","Side","AssetPercent",'
                '"Quantity","Price","Notional","Leverage","Balance","Profit%"\n'
            )
            content_to_write = csv_header + content_to_write

        async with aiofiles.open(file_path, mode, encoding="utf-8") as f:
            await f.write(content_to_write)

        return {"success": True, "message": f"로그 저장 완료: {file_path}"}

    except Exception as e:
        return JSONResponse(
            status_code=500, content={"success": False, "error": str(e)}
        )


@app.get("/api/download-log/{filename}")
async def download_log(filename: str):
    """log 디렉토리에서 파일 다운로드"""
    try:
        # 파일 경로 검증 (보안: 상위 디렉토리 접근 방지)
        log_dir = Path("log")
        file_path = log_dir / Path(filename).name

        if not file_path.exists():
            return JSONResponse(
                status_code=404,
                content={"success": False, "error": "파일을 찾을 수 없습니다"},
            )

        # 파일 내용 읽기
        async with aiofiles.open(file_path, "r", encoding="utf-8") as f:
            content = await f.read()

        from fastapi.responses import Response

        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    except Exception as e:
        return JSONResponse(
            status_code=500, content={"success": False, "error": str(e)}
        )


# Mount static files at /app to avoid shadowing API routes
app.mount("/app", StaticFiles(directory="public", html=True), name="static")


# minimal redirect for rules page to static HTML
@app.get("/rules/")
async def rules_redirect():
    return RedirectResponse(url="/app/rules.html")


# Debug endpoints for step 2 verification (will be removed/locked later)
@app.get("/debug/exchangeInfo", summary="Debug Exchange Info (cached)")
async def debug_exchange_info(client=Depends(get_binance_client)):
    try:
        data = await symbol_cache.get_exchange_info(client)
        return {"ok": True, "data": data}
    except Exception as e:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})


@app.get("/debug/markPrice", summary="Debug Mark Price (premiumIndex, cached)")
async def debug_mark_price(
    symbol: Optional[str] = None, client=Depends(get_binance_client)
):
    try:
        data = await price_cache.get_mark_price(client, symbol=symbol)
        return {"ok": True, "data": data}
    except Exception as e:
        return JSONResponse(status_code=500, content={"ok": False, "error": str(e)})
