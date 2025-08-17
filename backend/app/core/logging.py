from __future__ import annotations

import logging
import sys


def setup_logger() -> logging.Logger:
    logger = logging.getLogger("app")
    if logger.handlers:
        return logger
    logger.setLevel(logging.WARNING)  # INFO에서 WARNING으로 변경
    handler = logging.StreamHandler(stream=sys.stdout)
    formatter = logging.Formatter(
        fmt="ts=%(asctime)s level=%(levelname)s msg=%(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)

    # FastAPI와 uvicorn 로그 레벨 조정
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("fastapi").setLevel(logging.WARNING)

    # 추가 모듈들의 로그 레벨 조정
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)

    # API 키 모니터링 로그는 유지 (중요한 정보)
    logging.getLogger("app.core.security").setLevel(logging.INFO)

    return logger
