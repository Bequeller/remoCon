// intent: 거래 실행 로직 서비스
import { CONSTANTS } from '../core/constants.js';
import { elements, showToast } from '../core/dom-utils.js';
import {
  mockState,
  validateAssetLimits,
  getMockPrice,
  createTradeData,
  updateMockPosition,
  updatePositionsPnL,
} from './mock-service.js';
import { saveTradeToCSV } from './csv-service.js';

// 주문 실행
export async function placeOrder(side) {
  const percent = Number(elements.sizePercentEl.value || 0);
  const notional = Math.round((mockState.availableBalance * percent) / 100);

  if (notional <= 0) {
    showToast('warning', '주문 금액이 0입니다');
    return;
  }

  // 자산 규모 검증
  const symbol = elements.symbolEl.value;
  const existing = mockState.positions.find((p) => p.symbol === symbol);
  const currentPercent = existing ? parseFloat(existing.assetPercent || 0) : 0;

  const validation = validateAssetLimits(side, percent, currentPercent);
  if (!validation.valid) {
    showToast('error', validation.message);
    return;
  }

  // 주문 실행
  const price = getMockPrice(symbol);
  const leverage = Number(elements.leverageEl.value);
  const quantity = (notional / price).toFixed(CONSTANTS.PRECISION.QUANTITY);
  const orderId = `MOCK${mockState.nextOrderId++}`;

  // 포지션 업데이트
  updateMockPosition(
    symbol,
    side,
    parseFloat(quantity),
    price,
    leverage,
    percent
  );

  // 거래 내역 추가
  const tradeData = createTradeData(
    symbol,
    side,
    percent,
    quantity,
    price,
    leverage,
    orderId
  );
  mockState.tradeHistory.push(tradeData);

  // 잔고 업데이트 (매수만 차감)
  if (side === 'BUY') {
    mockState.availableBalance = Math.max(
      0,
      mockState.availableBalance - notional
    );
  }

  // 배경 애니메이션 트리거
  triggerTradeAnimation(side);

  // 거래별 차별화된 메시지
  const toastType = side === 'BUY' ? 'buy' : 'sell';
  const emoji = side === 'BUY' ? '🟢' : '🔴';
  const action = side === 'BUY' ? '매수' : '매도';
  showToast(
    toastType,
    `${emoji} ${action} 주문 성공: ${symbol} ${percent}% (${orderId})`
  );

  // 후처리
  await saveTradeToCSV();

  return true; // 성공 반환
}

// 포지션 카드 애니메이션 트리거
function triggerTradeAnimation(side) {
  const positionsCard = elements.positionsCard;
  const className = side === 'BUY' ? 'trade-buy' : 'trade-sell';

  // 기존 애니메이션 클래스 제거
  positionsCard.classList.remove('trade-buy', 'trade-sell');

  // 새 애니메이션 클래스 추가
  requestAnimationFrame(() => {
    positionsCard.classList.add(className);

    // 0.8초 후 애니메이션 제거
    setTimeout(() => {
      positionsCard.classList.remove(className);
    }, 500);
  });
}

// 포지션 로드
export async function loadPositions() {
  updatePositionsPnL();
  return mockState.positions;
}
