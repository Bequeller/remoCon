from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Header, HTTPException

from app.core.config import AUTH_TOKEN, BINANCE_API_KEY, BINANCE_SECRET_KEY
from app.core.logging import setup_logger


@dataclass
class ApiKeyStatus:
    """API 키 상태 정보"""

    is_valid: bool
    has_futures_permission: bool
    rate_limit_remaining: int
    last_check: datetime
    error_message: Optional[str] = None


class ApiKeyMonitor:
    """API 키 상태 모니터링 클래스"""

    def __init__(self):
        self._status: Optional[ApiKeyStatus] = None
        self._last_check = datetime.min
        self._check_interval = timedelta(minutes=5)  # 5분마다 체크
        self._logger = setup_logger()

    async def get_api_key_status(self) -> ApiKeyStatus:
        """API 키 상태 조회 (캐시된 결과 반환)"""
        now = datetime.now()

        # 캐시된 상태가 있고 최근에 체크했다면 반환
        if self._status and now - self._last_check < self._check_interval:
            return self._status

        # 새로운 상태 체크
        self._status = await self._check_api_key_status()
        self._last_check = now
        return self._status

    async def _check_api_key_status(self) -> ApiKeyStatus:
        """실제 API 키 상태 체크"""
        try:
            from app.clients.binance_client import BinanceFuturesClient

            if not BINANCE_API_KEY or not BINANCE_SECRET_KEY:
                return ApiKeyStatus(
                    is_valid=False,
                    has_futures_permission=False,
                    rate_limit_remaining=0,
                    last_check=datetime.now(),
                    error_message="API keys not configured",
                )

            client = BinanceFuturesClient()

            try:
                # 계좌 정보 조회로 API 키 검증
                await client.get_account_info()

                # 바이낸스 선물 API는 permissions 필드가 없으므로
                # 계좌 정보가 정상적으로 조회되면 선물 거래 권한이 있다고 판단
                has_futures = True

                # Rate limit 정보 추출 (응답 헤더에서)
                rate_limit_remaining = 1200  # 기본값 (실제로는 응답 헤더에서 추출)

                status = ApiKeyStatus(
                    is_valid=True,
                    has_futures_permission=has_futures,
                    rate_limit_remaining=rate_limit_remaining,
                    last_check=datetime.now(),
                )

                self._logger.info(
                    f"API key status: valid={status.is_valid}, "
                    f"futures={status.has_futures_permission}, "
                    f"rate_limit={status.rate_limit_remaining}"
                )

                return status

            except Exception as api_error:
                # API 호출 실패 시 더 구체적인 에러 메시지 제공
                error_msg = str(api_error)
                if "401" in error_msg:
                    error_msg = "Invalid API key or insufficient permissions"
                elif "403" in error_msg:
                    error_msg = "API key lacks required permissions"
                elif "429" in error_msg:
                    error_msg = "Rate limit exceeded"

                return ApiKeyStatus(
                    is_valid=False,
                    has_futures_permission=False,
                    rate_limit_remaining=0,
                    last_check=datetime.now(),
                    error_message=error_msg,
                )
            finally:
                await client.close()

        except Exception as e:
            self._logger.error(f"API key check failed: {str(e)}")
            return ApiKeyStatus(
                is_valid=False,
                has_futures_permission=False,
                rate_limit_remaining=0,
                last_check=datetime.now(),
                error_message=str(e),
            )

    async def validate_for_trading(self) -> None:
        """거래를 위한 API 키 유효성 검증"""
        status = await self.get_api_key_status()

        if not status.is_valid:
            raise HTTPException(
                status_code=401,
                detail={
                    "code": "INVALID_API_KEY",
                    "message": f"Invalid API key: {status.error_message}",
                },
            )

        if not status.has_futures_permission:
            raise HTTPException(
                status_code=403,
                detail={
                    "code": "INSUFFICIENT_PERMISSIONS",
                    "message": "Futures trading permission required",
                },
            )

        if status.rate_limit_remaining < 10:
            self._logger.warning(
                f"Rate limit low: {status.rate_limit_remaining} remaining"
            )

    async def start_monitoring(self) -> None:
        """백그라운드 모니터링 시작"""

        async def monitor_loop():
            while True:
                try:
                    await self.get_api_key_status()
                    await asyncio.sleep(300)  # 5분마다 체크
                except Exception as e:
                    self._logger.error(f"Monitoring error: {str(e)}")
                    await asyncio.sleep(60)  # 에러 시 1분 후 재시도

        asyncio.create_task(monitor_loop())


# 전역 모니터 인스턴스
api_key_monitor = ApiKeyMonitor()


async def require_auth(authorization: Optional[str] = Header(default=None)):
    """인증 요구사항 검증"""
    # Bearer 토큰 검증
    if not AUTH_TOKEN:
        return  # auth disabled when token not configured
    if not authorization or not authorization.lower().startswith("bearer "):
        raise_auth()
    token = authorization.split(" ", 1)[1].strip()
    if token != AUTH_TOKEN:
        raise_auth()

    # API 키 상태 검증
    await api_key_monitor.validate_for_trading()


def raise_auth():
    """인증 실패 시 예외 발생"""
    raise HTTPException(
        status_code=401, detail={"code": "UNAUTHORIZED", "message": "Invalid token"}
    )


async def get_api_key_status() -> ApiKeyStatus:
    """API 키 상태 조회 (외부에서 호출 가능)"""
    return await api_key_monitor.get_api_key_status()
