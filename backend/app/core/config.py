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
    """환경변수를 불린 값으로 변환"""
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.lower() in {"1", "true", "yes", "y"}


def _int_env(name: str, default: int) -> int:
    """환경변수를 정수 값으로 변환"""
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


# =============================================================================
# Binance API Configuration
# =============================================================================
BINANCE_API_KEY: Optional[str] = os.getenv("BINANCE_API_KEY")
BINANCE_SECRET_KEY: Optional[str] = os.getenv("BINANCE_SECRET_KEY")
USE_TESTNET: bool = _bool_env("USE_TESTNET", True)


# Binance API 설정 검증
def get_binance_config() -> dict:
    """바이낸스 API 설정을 반환"""
    return {
        "api_key": BINANCE_API_KEY,
        "api_secret": BINANCE_SECRET_KEY,
        "use_testnet": USE_TESTNET,
        "has_valid_keys": bool(BINANCE_API_KEY and BINANCE_SECRET_KEY),
    }


# =============================================================================
# Server Configuration
# =============================================================================
HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = _int_env("PORT", 3000)
DEBUG: bool = _bool_env("DEBUG", False)

# CORS Configuration
CORS_ORIGIN: str = os.getenv("CORS_ORIGIN", "http://localhost:8080")

# Authentication
AUTH_TOKEN: Optional[str] = os.getenv("AUTH_TOKEN")


# =============================================================================
# Logging Configuration
# =============================================================================
LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")


# =============================================================================
# Cache Configuration
# =============================================================================
POSITION_CACHE_TTL: int = _int_env("POSITION_CACHE_TTL", 5)  # 5초


# =============================================================================
# Trading Configuration
# =============================================================================
# 최대 레버리지 설정
MAX_LEVERAGE: int = _int_env("MAX_LEVERAGE", 25)


# =============================================================================
# Configuration Validation
# =============================================================================
def validate_config() -> dict:
    """설정 유효성 검증 및 요약 반환"""
    binance_config = get_binance_config()

    return {
        "server": {
            "host": HOST,
            "port": PORT,
            "debug": DEBUG,
            "cors_origin": CORS_ORIGIN,
        },
        "binance": binance_config,
        "cache": {
            "position_cache_ttl": POSITION_CACHE_TTL,
        },
        "trading": {
            "max_leverage": MAX_LEVERAGE,
        },
        "logging": {"level": LOG_LEVEL},
        "auth": {"enabled": bool(AUTH_TOKEN)},
    }


# =============================================================================
# Environment Summary
# =============================================================================
def get_environment_summary() -> dict:
    """환경 설정 요약 반환 (헬스체크용)"""
    binance_config = get_binance_config()

    return {
        "useTestnet": binance_config["use_testnet"],
        "hasKeys": binance_config["has_valid_keys"],
        "debug": DEBUG,
        "cache_ttl": POSITION_CACHE_TTL,
    }
