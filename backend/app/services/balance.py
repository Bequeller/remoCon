"""Balance management service for Binance futures trading."""

import time
from typing import Optional

from app.clients.binance_client import BinanceFuturesClient
from app.core.config import POSITION_CACHE_TTL
from app.models.schemas import Balance


class BalanceService:
    """Futures 잔고 관리 서비스"""

    def __init__(self):
        self._balance_cache = {}
        self._cache_ttl = POSITION_CACHE_TTL

    def _is_cache_valid(self, timestamp: float) -> bool:
        """캐시가 유효한지 확인"""
        return time.time() - timestamp < self._cache_ttl

    async def get_balances(self, asset: Optional[str] = None) -> list[Balance]:
        """
        Futures 잔고 정보를 조회합니다.

        Args:
            asset: 특정 자산의 잔고만 조회 (선택사항)

        Returns:
            잔고 목록
        """
        # 캐시 키 생성
        cache_key = f"balances_{asset or 'all'}"

        # 캐시 확인
        if cache_key in self._balance_cache:
            cached_data, timestamp = self._balance_cache[cache_key]
            if self._is_cache_valid(timestamp):
                return cached_data

        # 바이낸스 API 호출
        client = BinanceFuturesClient()
        try:
            data = await client.get_balance()
        finally:
            await client.close()

        # 잔고 데이터 파싱 및 필터링
        results: list[Balance] = []
        for balance_data in data if isinstance(data, list) else []:
            try:
                # 특정 자산 필터링
                if asset and balance_data.get("asset") != asset:
                    continue

                # 잔고 정보 생성
                balance = Balance(
                    accountAlias=balance_data.get("accountAlias", ""),
                    asset=balance_data.get("asset", ""),
                    balance=balance_data.get("balance", "0"),
                    crossWalletBalance=balance_data.get("crossWalletBalance", "0"),
                    crossUnPnl=balance_data.get("crossUnPnl", "0"),
                    availableBalance=balance_data.get("availableBalance", "0"),
                    maxWithdrawAmount=balance_data.get("maxWithdrawAmount", "0"),
                )
                results.append(balance)

            except (ValueError, TypeError) as e:
                # 개별 잔고 파싱 실패 시 로그만 남기고 계속 진행
                print(f"Failed to parse balance data: {e}")
                continue

        # 캐시 업데이트
        self._balance_cache[cache_key] = (results, time.time())

        return results


# 싱글톤 인스턴스
balance_service = BalanceService()
