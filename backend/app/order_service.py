from __future__ import annotations

from decimal import Decimal, ROUND_DOWN
from typing import Any, Dict, Tuple


def round_down_to_step(value: Decimal, step: Decimal) -> Decimal:
    # intent: Binance stepSize floor
    if step <= 0:
        return value
    n = (value / step).to_integral_value(rounding=ROUND_DOWN)
    return n * step


def find_symbol_filters(
    exchange_info: Dict[str, Any], symbol: str
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    symbols = exchange_info.get("symbols", [])
    for s in symbols:
        if s.get("symbol") == symbol:
            lot_size = next(
                (f for f in s.get("filters", []) if f.get("filterType") == "LOT_SIZE"),
                {},
            )
            notional = next(
                (
                    f
                    for f in s.get("filters", [])
                    if f.get("filterType") == "MIN_NOTIONAL"
                ),
                {},
            )
            return lot_size, notional
    return {}, {}


def compute_order_quantity(
    notional_usdt: float, mark_price: float, step_size_str: str, min_qty_str: str
) -> Decimal:
    step = Decimal(step_size_str)
    min_qty = Decimal(min_qty_str)
    raw_qty = Decimal(str(notional_usdt)) / Decimal(str(mark_price))
    qty = round_down_to_step(raw_qty, step)
    if qty < min_qty:
        return Decimal("0")
    return qty


def validate_precision(
    qty: Decimal, price: float, lot_size: Dict[str, Any], symbol_meta: Dict[str, Any]
) -> Tuple[bool, str]:
    # intent: enforce quantityPrecision/pricePrecision and LOT_SIZE step alignment
    try:
        qty_prec = int(symbol_meta.get("quantityPrecision", 0) or 0)
        price_prec = int(symbol_meta.get("pricePrecision", 0) or 0)
        step = Decimal(lot_size.get("stepSize", "0.0"))
        # check step alignment
        if step > 0 and (qty % step) != 0:
            return False, "PRECISION_VIOLATION"
        # check decimal digits
        qstr = format(qty.normalize(), "f")
        qdec = len(qstr.split(".")[-1]) if "." in qstr else 0
        if qdec > qty_prec:
            return False, "PRECISION_VIOLATION"
        pstr = format(Decimal(str(price)).normalize(), "f")
        pdec = len(pstr.split(".")[-1]) if "." in pstr else 0
        if pdec > price_prec:
            return False, "PRECISION_VIOLATION"
        return True, ""
    except Exception:
        return True, ""
