from __future__ import annotations

import os
from typing import Optional

try:
    # Optional: load .env when present
    from dotenv import load_dotenv  # type: ignore

    load_dotenv(override=False)
except Exception:
    pass


def _bool_env(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.lower() in {"1", "true", "yes", "y"}


AUTH_TOKEN: Optional[str] = os.getenv("AUTH_TOKEN")
USE_TESTNET: bool = _bool_env("USE_TESTNET", True)
CORS_ORIGIN: str = os.getenv("CORS_ORIGIN", "http://localhost:3000")

_allowed = os.getenv("ALLOWED_SYMBOLS", "BTCUSDT,ETHUSDT")
ALLOWED_SYMBOLS: list[str] = [
    s.strip().upper() for s in _allowed.split(",") if s.strip()
]
