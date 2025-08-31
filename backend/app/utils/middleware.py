from __future__ import annotations

import logging
import time
import uuid
from collections.abc import Callable

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


async def access_log_middleware(request: Request, call_next: Callable):
    req_id = str(uuid.uuid4())
    request.state.request_id = req_id
    start = time.perf_counter()

    try:
        response = await call_next(request)
    except HTTPException:
        # let FastAPI handle HTTPException
        raise
    except Exception as e:
        # standard error envelope on unexpected errors
        elapsed = int((time.perf_counter() - start) * 1000)
        logger.error(
            f"reqId={req_id} route={request.url.path} code=UNHANDLED_ERROR cause={e}"
        )
        return JSONResponse(
            status_code=500,
            content={
                "requestId": req_id,
                "code": "UNHANDLED_ERROR",
                "message": "Internal server error",
            },
        )
    elapsed = int((time.perf_counter() - start) * 1000)
    # 모든 요청 로깅 (디버깅용)
    if response.status_code >= 400:
        logger.error(
            f"reqId={req_id} route={request.url.path} status={response.status_code} latencyMs={elapsed}"
        )
    else:
        logger.info(
            f"reqId={req_id} route={request.url.path} status={response.status_code} latencyMs={elapsed}"
        )
    return response
