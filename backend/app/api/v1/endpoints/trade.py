from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.clients.binance_client import BinanceFuturesClient
from app.core.logging import setup_logger
from app.core.security import require_auth
from app.models.schemas import TradeRequest, TradeResponse
from app.services.cache_service import PriceCache, SymbolMetaCache
from app.services.leverage_service import LeverageManager
from app.services.trade_service import (
    compute_order_quantity,
    find_symbol_filters,
    validate_precision,
)
from app.utils.errors import error_response

router = APIRouter()

# 서비스 인스턴스
symbol_cache = SymbolMetaCache()
price_cache = PriceCache()
leverage_manager = LeverageManager()


@router.post(
    "/trade",
    response_model=TradeResponse,
    tags=["trade"],
    dependencies=[Depends(require_auth)],
)
async def post_trade(
    trade_req: TradeRequest, request=Depends()
) -> JSONResponse | TradeResponse:
    # 직접 BinanceFuturesClient 생성
    client = BinanceFuturesClient()

    try:
        # 1) 입력 1차 검증
        if trade_req.notional <= 0:
            return error_response("INVALID_NOTIONAL", "notional must be > 0", 400)
        if trade_req.leverage < 1 or trade_req.leverage > 25:
            return error_response("INVALID_LEVERAGE", "leverage must be in [1,25]", 400)

        # 2) 메타/가격 조회(캐시)
        ex = await symbol_cache.get_exchange_info(client)
        mp = await price_cache.get_mark_price(client, symbol=trade_req.symbol)
        mark_price = (
            float(mp["markPrice"])
            if isinstance(mp, dict)
            else float(mp[0]["markPrice"])
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
            (s for s in ex.get("symbols", []) if s.get("symbol") == trade_req.symbol),
            {},
        )
        ok, code = validate_precision(qty, mark_price, lot_size, sym_meta)
        if not ok:
            return error_response(code, "precision violation", 400)
        notional_check = float(qty) * mark_price
        min_notional_val = (
            float(min_notional.get("notional", "0")) if min_notional else 0.0
        )
        if notional_check < min_notional_val:
            return error_response(
                "MIN_NOTIONAL_VIOLATION", "order notional below minimum", 400
            )

        # 4) 레버리지 보장(변경시에만)
        await leverage_manager.ensure(client, trade_req.symbol, trade_req.leverage)

        # 5) 주문 실행(MARKET)
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
    finally:
        await client.close()
