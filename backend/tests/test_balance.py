#!/usr/bin/env python3
"""잔고 조회 기능 테스트 스크립트"""

import asyncio
import os
import sys

# 프로젝트 루트를 Python 경로에 추가
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.balance import balance_service


async def test_balance():
    """잔고 조회 테스트"""
    print("=== Futures 잔고 조회 테스트 ===")

    try:
        # 전체 잔고 조회
        print("\n1. 전체 잔고 조회 중...")
        balances = await balance_service.get_balances()

        if not balances:
            print("❌ 잔고 데이터가 없습니다.")
            return

        print(f"✅ 총 {len(balances)}개 자산의 잔고를 조회했습니다.")

        # 잔고가 있는 자산만 필터링하여 출력
        non_zero_balances = [b for b in balances if float(b.balance) > 0]

        if non_zero_balances:
            print("\n📊 잔고가 있는 자산:")
            for balance in non_zero_balances:
                print(f"  {balance.asset}:")
                print(f"    총 잔고: {balance.balance}")
                print(f"    사용 가능: {balance.availableBalance}")
                print(f"    크로스 지갑: {balance.crossWalletBalance}")
                print(f"    미실현 손익: {balance.crossUnPnl}")
                print(f"    최대 출금: {balance.maxWithdrawAmount}")
                print()
        else:
            print("⚠️  잔고가 있는 자산이 없습니다.")

        # USDT 잔고만 조회 테스트
        print("\n2. USDT 잔고만 조회 중...")
        usdt_balances = await balance_service.get_balances(asset="USDT")

        if usdt_balances:
            usdt = usdt_balances[0]
            print(f"✅ USDT 잔고: {usdt.balance}")
            print(f"   사용 가능: {usdt.availableBalance}")
        else:
            print("❌ USDT 잔고를 찾을 수 없습니다.")

    except Exception as e:
        print(f"❌ 테스트 실패: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_balance())
