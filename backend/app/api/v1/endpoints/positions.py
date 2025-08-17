from typing import Optional

from fastapi import APIRouter, Request

from app.services.position_service import position_service
from app.utils.errors import error_response

router = APIRouter()


@router.get(
    "/positions",
    response_model=None,
    tags=["positions"],
    summary="Get current trading positions",
    description="Retrieve all active futures positions with caching for performance",
)
async def get_positions(request: Request, symbol: Optional[str] = None):
    """
    현재 활성 포지션 정보를 조회합니다.

    Args:
        symbol: 특정 심볼의 포지션만 조회 (선택사항)
        request: FastAPI 요청 객체

    Returns:
        활성 포지션 목록 또는 에러 응답
    """
    try:
        positions = await position_service.get_positions(symbol=symbol)
        return positions

    except RuntimeError:
        return error_response(
            "UNAUTHORIZED", "API key/secret missing or invalid", 401, request=request
        )
    except Exception as e:
        return error_response(
            "UPSTREAM_ERROR",
            f"Failed to fetch positions: {str(e)}",
            502,
            request=request,
        )
