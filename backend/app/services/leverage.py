from __future__ import annotations

from typing import Optional


class LeverageManager:
    """심볼별 현재 레버리지 캐시(기본 5분) 및 변경 시에만 갱신 호출"""

    def __init__(self, ttl_seconds: int = 300) -> None:
        self._ttl = ttl_seconds
        self._cache: dict[str, tuple[int, float]] = {}

    def _is_fresh(self, symbol: str) -> bool:
        import time

        if symbol not in self._cache:
            return False
        _, ts = self._cache[symbol]
        return (time.time() - ts) < self._ttl

    def get_cached(self, symbol: str) -> Optional[int]:
        if not self._is_fresh(symbol):
            return None
        return self._cache[symbol][0]

    async def ensure(self, client, symbol: str, leverage: int) -> None:
        current = self.get_cached(symbol)
        if current == leverage:
            return
        resp = await client.set_leverage(symbol=symbol, leverage=leverage)
        # Assume response contains leverage field; fallback to requested value
        applied = (
            int(resp.get("leverage", leverage)) if isinstance(resp, dict) else leverage
        )
        import time

        self._cache[symbol] = (applied, time.time())
