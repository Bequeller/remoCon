from typing import Optional

from fastapi import APIRouter, Query, Request

from app.services.position import position_service
from app.utils.errors import error_response

router = APIRouter()


@router.post(
    "/positions/{symbol}/close",
    response_model=None,
    tags=["positions"],
    summary="Close a specific position",
    description="Close a position for the specified symbol using market order",
)
async def close_position(request: Request, symbol: str, user: str = "unknown"):
    """
    특정 심볼의 포지션을 청산합니다.

    Args:
        symbol: 청산할 포지션의 심볼 (예: "BTCUSDT")
        request: FastAPI 요청 객체

    Returns:
        청산 결과 또는 에러 응답
    """
    try:
        result = await position_service.close_position(symbol=symbol, user=user)
        return {
            "status": "success",
            "message": f"Position closed successfully for {symbol}",
            "data": result,
        }

    except ValueError as e:
        return error_response(
            "BAD_REQUEST",
            str(e),
            400,
            request=request,
        )
    except RuntimeError as e:
        return error_response(
            "UPSTREAM_ERROR",
            str(e),
            502,
            request=request,
        )
    except Exception as e:
        return error_response(
            "INTERNAL_ERROR",
            f"Failed to close position: {str(e)}",
            500,
            request=request,
        )


@router.get(
    "/positions",
    response_model=None,
    tags=["positions"],
    summary="Get current trading positions",
    description="Retrieve all active futures positions with caching for performance",
)
async def get_positions(
    request: Request, symbol: Optional[str] = None, bypass_cache: bool = Query(False)
):
    """
    현재 활성 포지션 정보를 조회합니다.

    Args:
        symbol: 특정 심볼의 포지션만 조회 (선택사항)
        request: FastAPI 요청 객체

    Returns:
        활성 포지션 목록 또는 에러 응답
    """
    try:
        positions = await position_service.get_positions(
            symbol=symbol, bypass_cache=bypass_cache
        )
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
