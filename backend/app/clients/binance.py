import hashlib
import hmac
import os
import time
from typing import Any, Dict, Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential_jitter


class BinanceFuturesClient:
    """Minimal Binance USDⓈ-M Futures client (testnet toggle, HMAC signing).

    Only public GETs are used in step 2, private endpoints kept for later.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        use_testnet: bool = True,
        timeout_seconds: float = 5.0,
    ) -> None:
        self.api_key = api_key or os.getenv("BINANCE_API_KEY") or ""
        self.api_secret = api_secret or os.getenv("BINANCE_API_SECRET") or ""
        self.use_testnet = use_testnet if use_testnet is not None else True
        self.base_url = (
            "https://testnet.binancefuture.com"
            if self.use_testnet
            else "https://fapi.binance.com"
        )
        self._client = httpx.AsyncClient(
            base_url=self.base_url, timeout=timeout_seconds
        )
        self._ts_offset_ms: int = 0

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
    async def get_exchange_info(self) -> Dict[str, Any]:
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

    async def set_leverage(self, symbol: str, leverage: int) -> Dict[str, Any]:
        return await self._signed_request(
            method="POST",
            path="/fapi/v1/leverage",
            params={"symbol": symbol, "leverage": leverage},
        )

    async def place_market_order(
        self, symbol: str, side: str, quantity: str, reduce_only: bool = False
    ) -> Dict[str, Any]:
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
        params: Dict[str, Any] = {}
        if symbol:
            params["symbol"] = symbol
        return await self._signed_request("GET", "/fapi/v2/positionRisk", params=params)

    async def _signed_request(
        self, method: str, path: str, params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        if not self.api_key or not self.api_secret:
            raise RuntimeError("API key/secret required for private endpoints")

        if self._ts_offset_ms == 0:
            await self.sync_time()

        params = params.copy() if params else {}
        params["timestamp"] = self._now_ms()
        query = httpx.QueryParams(params).to_str()
        signature = hmac.new(
            self.api_secret.encode(), query.encode(), hashlib.sha256
        ).hexdigest()
        headers = {"X-MBX-APIKEY": self.api_key}
        req_kwargs = {"headers": headers}
        if method.upper() == "GET":
            resp = await self._client.get(
                path, params={**params, "signature": signature}, **req_kwargs
            )
        else:
            resp = await self._client.post(
                path, params={**params, "signature": signature}, **req_kwargs
            )
        resp.raise_for_status()
        return resp.json()
