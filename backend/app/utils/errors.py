from __future__ import annotations

import uuid
from typing import Optional

from fastapi import Request
from fastapi.responses import JSONResponse


def error_response(
    code: str, message: str, status_code: int = 400, request: Optional[Request] = None
) -> JSONResponse:
    # intent: standard error envelope
    req_id = None
    if request is not None and hasattr(request, "state"):
        req_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=status_code,
        content={
            "requestId": req_id or str(uuid.uuid4()),
            "code": code,
            "message": message,
        },
    )


class AppError(Exception):
    """Custom application error."""

    pass
