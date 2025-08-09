from __future__ import annotations

from typing import Optional

from fastapi import Header

from app.config import AUTH_TOKEN


async def require_auth(authorization: Optional[str] = Header(default=None)):
    # intent: simple bearer token auth for internal use
    if not AUTH_TOKEN:
        return  # auth disabled when token not configured
    if not authorization or not authorization.lower().startswith("bearer "):
        raise_auth()
    token = authorization.split(" ", 1)[1].strip()
    if token != AUTH_TOKEN:
        raise_auth()


def raise_auth():
    # Raise FastAPI-compatible JSON error
    from fastapi import HTTPException

    raise HTTPException(
        status_code=401, detail={"code": "UNAUTHORIZED", "message": "Invalid token"}
    )
