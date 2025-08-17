import os

from fastapi import APIRouter, Depends

from app.api.deps import get_binance_client

router = APIRouter()


@router.get("/healthz")
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
        },
        "binance": {"reachable": reachable, "tsOffsetMs": offset_ms},
        "version": "0.1.0",
    }
