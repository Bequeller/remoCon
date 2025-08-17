from fastapi import APIRouter, HTTPException

from app.core.config import get_environment_summary

router = APIRouter()


@router.get("/health")
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
    from app.clients.binance_client import BinanceFuturesClient

    client = BinanceFuturesClient()

    try:
        # API Key가 설정되어 있는지 확인
        if not client.api_key or not client.api_secret:
            raise HTTPException(
                status_code=400, detail="API key or secret is not configured"
            )

        # get_position_risk를 사용하여 API Key 유효성 검증
        # 빈 파라미터로 호출하면 전체 포지션 정보를 가져옴 (권한 검증용)
        await client.get_position_risk()

        return {
            "status": "valid",
            "message": "API key is valid and has required permissions",
            "testnet": client.use_testnet,
        }

    except HTTPException:
        # 이미 HTTPException이면 그대로 재발생
        raise
    except Exception as e:
        # API Key가 유효하지 않거나 권한이 없는 경우
        return {
            "status": "invalid",
            "message": f"API key validation failed: {str(e)}",
            "testnet": client.use_testnet,
        }
    finally:
        await client.close()
