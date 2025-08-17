from __future__ import annotations

import logging
import sys


def setup_logger() -> logging.Logger:
    logger = logging.getLogger("app")
    if logger.handlers:
        return logger
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler(stream=sys.stdout)
    formatter = logging.Formatter(
        fmt="ts=%(asctime)s level=%(levelname)s msg=%(message)s",
        datefmt="%Y-%m-%dT%H:%M:%S%z",
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger
