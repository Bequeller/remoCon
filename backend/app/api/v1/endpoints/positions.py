from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from app.api.deps import get_binance_client
from app.core.security import require_auth
from app.models.schemas import Position
from app.utils.errors import error_response

router = APIRouter()


@router.get(
    "/positions",
    response_model=list[Position],
    tags=["positions"],
    dependencies=[Depends(require_auth)],
)
async def get_positions(
    client=Depends(get_binance_client), request=Depends()
) -> JSONResponse | list[Position]:
    try:
        data = await client.get_position_risk()
    except RuntimeError:
        return error_response(
            "UNAUTHORIZED", "API key/secret missing", 401, request=request
        )
    except Exception as e:
        return error_response("UPSTREAM_ERROR", str(e), 502, request=request)

    results: list[Position] = []
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
