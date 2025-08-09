// intent: 모킹 데이터 및 포지션 관리
import { CONSTANTS } from '../core/constants.js';

// 모킹 데이터 상태
export const mockState = {
  availableBalance: CONSTANTS.INITIAL_BALANCE,
  initialBalance: CONSTANTS.INITIAL_BALANCE,
  positions: [],
  tradeHistory: [],
  nextOrderId: 1,
};

// 자산 검증 함수
export function validateAssetLimits(side, percent, currentPercent) {
  if (side === 'BUY') {
    if (currentPercent + percent > CONSTANTS.MAX_ASSET_PERCENT) {
      return {
        valid: false,
        message: `매수 실패: 총 자산이 100% 초과 (현재: ${currentPercent}%, 요청: ${percent}%)`,
      };
    }
  } else if (side === 'SELL') {
    if (percent > currentPercent) {
      return {
        valid: false,
        message: `매도 실패: 보유 자산 부족 (보유: ${currentPercent}%, 요청: ${percent}%)`,
      };
    }
  }
  return { valid: true };
}

// 시장 가격 조회
export function getMockPrice(symbol) {
  return CONSTANTS.MOCK_PRICES[symbol] || CONSTANTS.DEFAULT_PRICE;
}

// 손익 계산
export function calculatePnL(position, currentPrice) {
  const qty = parseFloat(position.positionAmt);
  const entryPrice = parseFloat(position.entryPrice);
  return qty * (currentPrice - entryPrice);
}

// 거래 데이터 생성
export function createTradeData(
  symbol,
  side,
  percent,
  quantity,
  price,
  leverage,
  orderId
) {
  return {
    timestamp: new Date().toISOString(),
    orderId,
    symbol,
    side,
    quantity,
    price,
    notional: Math.round((mockState.availableBalance * percent) / 100),
    leverage,
    balance: mockState.availableBalance,
    assetPercent: percent,
  };
}

// 포지션 업데이트
export function updateMockPosition(
  symbol,
  side,
  quantity,
  price,
  leverage,
  assetPercent
) {
  const existing = mockState.positions.find((p) => p.symbol === symbol);

  if (existing) {
    const currentPercent = parseFloat(existing.assetPercent || 0);
    const newPercent =
      side === 'BUY'
        ? currentPercent + assetPercent
        : currentPercent - assetPercent;

    if (Math.abs(newPercent) < CONSTANTS.MIN_POSITION_PERCENT) {
      // 포지션 청산
      const pnl = calculatePnL(existing, price);
      mockState.availableBalance += pnl;
      mockState.positions = mockState.positions.filter(
        (p) => p.symbol !== symbol
      );
    } else {
      // 포지션 업데이트
      const currentQty = parseFloat(existing.positionAmt);
      const newQty =
        side === 'BUY' ? currentQty + quantity : currentQty - quantity;

      let avgPrice;
      if (Math.abs(newQty) > Math.abs(currentQty)) {
        // 포지션 확대: 가중평균 계산
        const totalValue =
          currentQty * parseFloat(existing.entryPrice) +
          (side === 'BUY' ? quantity : -quantity) * price;
        avgPrice = Math.abs(totalValue / newQty);
      } else {
        // 포지션 축소: 기존 진입가 유지
        avgPrice = parseFloat(existing.entryPrice);
      }

      existing.positionAmt = newQty.toFixed(CONSTANTS.PRECISION.QUANTITY);
      existing.entryPrice = avgPrice.toFixed(CONSTANTS.PRECISION.PRICE);
      existing.leverage = leverage;
      existing.assetPercent = Math.abs(newPercent).toFixed(
        CONSTANTS.PRECISION.PERCENT
      );
      existing.unRealizedProfit = calculatePnL(
        {
          positionAmt: newQty.toFixed(CONSTANTS.PRECISION.QUANTITY),
          entryPrice: avgPrice.toFixed(CONSTANTS.PRECISION.PRICE),
        },
        price
      ).toFixed(CONSTANTS.PRECISION.PRICE);
    }
  } else if (Math.abs(quantity) > CONSTANTS.MIN_QUANTITY_THRESHOLD) {
    // 새 포지션 생성
    const positionQty = side === 'BUY' ? quantity : -quantity;
    mockState.positions.push({
      symbol,
      positionAmt: positionQty.toFixed(CONSTANTS.PRECISION.QUANTITY),
      entryPrice: price.toFixed(CONSTANTS.PRECISION.PRICE),
      leverage,
      assetPercent: assetPercent.toFixed(CONSTANTS.PRECISION.PERCENT),
      unRealizedProfit: '0.00',
      marginType: 'cross',
    });
  }
}

// 포지션 업데이트 (PnL 계산)
export function updatePositionsPnL() {
  mockState.positions.forEach((position) => {
    const currentPrice = getMockPrice(position.symbol);
    position.unRealizedProfit = calculatePnL(position, currentPrice).toFixed(
      CONSTANTS.PRECISION.PRICE
    );
  });
}

// 포지션 청산 (시장가)
export function liquidatePosition(symbol) {
  const positionIndex = mockState.positions.findIndex(
    (p) => p.symbol === symbol
  );
  if (positionIndex === -1) {
    return { success: false, message: 'Position not found' };
  }

  const position = mockState.positions[positionIndex];
  const currentPrice = getMockPrice(symbol);

  // 청산 시 자산 반환 계산
  const assetPercent = parseFloat(position.assetPercent || 0);
  const returnAmount = (assetPercent / 100) * mockState.initialBalance;
  mockState.availableBalance += returnAmount;

  // 청산 거래 내역 추가
  const liquidationTrade = {
    timestamp: new Date().toISOString(),
    orderId: `LIQ${mockState.nextOrderId++}`,
    symbol: position.symbol,
    side: 'LIQUIDATE',
    assetPercent: position.assetPercent,
    quantity: position.positionAmt,
    price: currentPrice.toFixed(CONSTANTS.PRECISION.PRICE),
    notional: returnAmount.toFixed(CONSTANTS.PRECISION.PRICE),
    leverage: position.leverage,
    balance: mockState.availableBalance.toFixed(CONSTANTS.PRECISION.PRICE),
    profitPercent: '0.00', // 청산은 손익 계산 복잡하므로 0으로 처리
  };

  mockState.tradeHistory.push(liquidationTrade);

  // 포지션 제거
  mockState.positions.splice(positionIndex, 1);

  return {
    success: true,
    message: `${symbol} position liquidated`,
    orderId: liquidationTrade.orderId,
    returnAmount: returnAmount.toFixed(CONSTANTS.PRECISION.PRICE),
  };
}
