from fastapi import APIRouter

from app.core.config import get_environment_summary

router = APIRouter()


@router.get("/healthz")
async def health():
    """백엔드 서버 자체 헬스체크"""
    env_summary = get_environment_summary()

    return {
        "status": "ok",
        "env": env_summary,
        "version": "0.1.0",
    }


@router.get("/health/binance")
async def binance_health():
    """Binance 연결성 및 시간 동기화 상태 확인"""
    from app.clients.binance_client import BinanceFuturesClient

    client = BinanceFuturesClient()
    reachable = False
    offset_ms = 0

    try:
        await client.sync_time()
        # internal attr exists in client; if absent, keep 0
        offset_ms = getattr(client, "_ts_offset_ms", 0)
        reachable = True
    except Exception:
        reachable = False
    finally:
        await client.close()

    return {
        "status": "ok" if reachable else "error",
        "binance": {
            "reachable": reachable,
            "tsOffsetMs": offset_ms,
            "testnet": client.use_testnet,
        },
    }


@router.get("/health/binance/api-key")
async def validate_api_key():
    """Binance API Key 유효성 검증 엔드포인트"""
    from app.core.security import get_api_key_status

    try:
        status = await get_api_key_status()

        return {
            "status": "valid" if status.is_valid else "invalid",
            "message": (
                "API key is valid and has required permissions"
                if status.is_valid
                else status.error_message
            ),
            "details": {
                "is_valid": status.is_valid,
                "has_futures_permission": status.has_futures_permission,
                "rate_limit_remaining": status.rate_limit_remaining,
                "last_check": status.last_check.isoformat(),
                "error_message": status.error_message,
            },
            "testnet": True,  # config에서 가져오도록 수정 필요
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"API key validation failed: {str(e)}",
            "details": {
                "is_valid": False,
                "has_futures_permission": False,
                "rate_limit_remaining": 0,
                "last_check": None,
                "error_message": str(e),
            },
            "testnet": True,
        }
