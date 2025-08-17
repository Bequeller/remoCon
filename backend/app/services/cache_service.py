from __future__ import annotations

from typing import Any

from cachetools import TTLCache


class SymbolMetaCache:
    """exchangeInfo 결과 30초 TTL 캐시"""

    def __init__(self, ttl_seconds: int = 30) -> None:
        self._ttl = ttl_seconds
        self._cache: TTLCache[str, dict[str, Any]] = TTLCache(maxsize=2, ttl=self._ttl)

    async def get_exchange_info(self, client) -> dict[str, Any]:
        key = "exchangeInfo"
        if key in self._cache:
            return self._cache[key]
        data = await client.get_exchange_info()
        self._cache[key] = data
        return data


class PriceCache:
    """markPrice/premiumIndex 2초 TTL 캐시 (심볼별)"""

    def __init__(self, ttl_seconds: int = 2) -> None:
        self._ttl = ttl_seconds
        self._cache: TTLCache[str, Any] = TTLCache(maxsize=512, ttl=self._ttl)

    async def get_mark_price(self, client, symbol: str | None = None) -> Any:
        key = symbol or "__ALL__"
        if key in self._cache:
            return self._cache[key]
        data = await client.get_mark_price(symbol=symbol)
        self._cache[key] = data
        return data
