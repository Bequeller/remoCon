import hashlib
import hmac
import logging
import time
from typing import Any, Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential_jitter

from app.core.config import BINANCE_API_KEY, BINANCE_SECRET_KEY, BINANCE_TESTNET

# 로거 설정
logger = logging.getLogger(__name__)


class BinanceFuturesClient:
    """Minimal Binance USDⓈ-M Futures client (testnet toggle, HMAC signing).

    Only public GETs are used in step 2, private endpoints kept for later.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        use_testnet: Optional[bool] = None,
        timeout_seconds: float = 5.0,
    ) -> None:
        self.api_key = api_key or BINANCE_API_KEY or ""
        self.api_secret = api_secret or BINANCE_SECRET_KEY or ""

        # config.py에서 testnet 설정 가져오기
        self.use_testnet = use_testnet if use_testnet is not None else BINANCE_TESTNET
        self.base_url = (
            "https://testnet.binancefuture.com"
            if self.use_testnet
            else "https://fapi.binance.com"
        )
        self._client = httpx.AsyncClient(
            base_url=self.base_url, timeout=timeout_seconds
        )
        self._ts_offset_ms: int = 0

        # 초기화 로깅
        logger.info(
            f"BinanceFuturesClient initialized: testnet={self.use_testnet}, base_url={self.base_url}"
        )
        logger.info(
            f"API Key present: {bool(self.api_key)}, API Secret present: {bool(self.api_secret)}"
        )
        if not self.api_key or not self.api_secret:
            logger.warning("API key or secret is missing - private endpoints will fail")

    async def close(self) -> None:
        await self._client.aclose()

    @retry(
        stop=stop_after_attempt(2), wait=wait_exponential_jitter(initial=0.1, max=0.6)
    )
    async def sync_time(self) -> None:
        """Update local timestamp offset against Binance server time."""
        resp = await self._client.get("/fapi/v1/time")
        resp.raise_for_status()
        server_ms = int(resp.json()["serverTime"])
        local_ms = int(time.time() * 1000)
        self._ts_offset_ms = server_ms - local_ms

    def _now_ms(self) -> int:
        return int(time.time() * 1000) + self._ts_offset_ms

    @retry(
        stop=stop_after_attempt(2), wait=wait_exponential_jitter(initial=0.1, max=0.6)
    )
    async def get_exchange_info(self) -> dict[str, Any]:
        resp = await self._client.get("/fapi/v1/exchangeInfo")
        resp.raise_for_status()
        return resp.json()

    @retry(
        stop=stop_after_attempt(2), wait=wait_exponential_jitter(initial=0.1, max=0.6)
    )
    async def get_mark_price(self, symbol: Optional[str] = None) -> Any:
        """Use premiumIndex for broader testnet compatibility."""
        params = {"symbol": symbol} if symbol else None
        resp = await self._client.get("/fapi/v1/premiumIndex", params=params)
        resp.raise_for_status()
        return resp.json()

    async def set_leverage(self, symbol: str, leverage: int) -> dict[str, Any]:
        return await self._signed_request(
            method="POST",
            path="/fapi/v1/leverage",
            params={"symbol": symbol, "leverage": leverage},
        )

    async def place_market_order(
        self, symbol: str, side: str, quantity: str, reduce_only: bool = False
    ) -> dict[str, Any]:
        return await self._signed_request(
            method="POST",
            path="/fapi/v1/order",
            params={
                "symbol": symbol,
                "side": side,
                "type": "MARKET",
                "quantity": quantity,
                "reduceOnly": str(reduce_only).lower(),
            },
        )

    async def get_position_risk(self, symbol: Optional[str] = None) -> Any:
        logger.info(f"Getting position risk for symbol: {symbol or 'all'}")
        params: dict[str, Any] = {}
        if symbol:
            params["symbol"] = symbol
        try:
            result = await self._signed_request(
                "GET", "/fapi/v2/positionRisk", params=params
            )
            logger.info(
                f"Successfully retrieved position risk data: {len(result) if isinstance(result, list) else 'single item'}"
            )
            return result
        except Exception as e:
            logger.error(f"Failed to get position risk: {str(e)}")
            raise

    async def get_account_info(self) -> dict[str, Any]:
        """계좌 정보 조회 (API 키 검증용)"""
        logger.info("Getting account information")
        try:
            result = await self._signed_request("GET", "/fapi/v2/account")
            logger.info("Successfully retrieved account information")
            return result
        except Exception as e:
            logger.error(f"Failed to get account info: {str(e)}")
            raise

    async def get_balance(self) -> list[dict[str, Any]]:
        """Futures 잔고 정보 조회"""
        logger.info("Getting futures balance information")
        try:
            result = await self._signed_request("GET", "/fapi/v2/balance")
            logger.info(
                f"Successfully retrieved balance data: {len(result) if isinstance(result, list) else 'single item'}"
            )
            return result
        except Exception as e:
            logger.error(f"Failed to get balance: {str(e)}")
            raise

    async def _signed_request(
        self, method: str, path: str, params: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        logger.info(f"Making signed request: {method} {path}")

        if not self.api_key or not self.api_secret:
            logger.error("API key/secret required for private endpoints")
            logger.error(
                f"API Key present: {bool(self.api_key)}, API Secret present: {bool(self.api_secret)}"
            )
            raise RuntimeError("API key/secret required for private endpoints")

        if self._ts_offset_ms == 0:
            logger.info("Syncing time with Binance server")
            await self.sync_time()

        params = params.copy() if params else {}
        params["timestamp"] = self._now_ms()
        query = str(httpx.QueryParams(params))
        signature = hmac.new(
            self.api_secret.encode(), query.encode(), hashlib.sha256
        ).hexdigest()
        headers = {"X-MBX-APIKEY": self.api_key}
        req_kwargs = {"headers": headers}

        logger.info(f"Request details: method={method}, path={path}, params={params}")
        logger.info(f"Signature generated: {signature[:10]}...")

        try:
            if method.upper() == "GET":
                resp = await self._client.get(
                    path, params={**params, "signature": signature}, **req_kwargs
                )
            else:
                resp = await self._client.post(
                    path, params={**params, "signature": signature}, **req_kwargs
                )

            logger.info(f"Response status: {resp.status_code}")
            resp.raise_for_status()
            result = resp.json()
            logger.info(f"Response data type: {type(result)}")
            return result

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Request failed: {str(e)}")
            raise
