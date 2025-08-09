// intent: 메인 애플리케이션 진입점
import { CONSTANTS } from './constants.js';
import { elements, showToast, renderPositions } from './dom-utils.js';
import { mockState } from '../services/mock-service.js';
import { placeOrder, loadPositions } from '../services/trade-service.js';
import { exportTradeHistory } from '../services/csv-service.js';
import { initializeSymbolSelector } from '../components/symbol-selector.js';
import { initializeTradeParams } from '../components/trade-params.js';

// 토큰 관리 (AUTH TOKEN 필드가 있는 경우만)
if (elements.tokenInput) {
  elements.tokenInput.value = localStorage.getItem('AUTH_TOKEN') || '';
  elements.tokenInput.addEventListener('change', () => {
    localStorage.setItem('AUTH_TOKEN', elements.tokenInput.value);
  });
}

// Size 미리보기 업데이트
function updateSizePreview() {
  if (elements.sizePercentEl && elements.sizePreviewEl) {
    const percent = Number(elements.sizePercentEl.value || 0);
    const usdt = Math.round((mockState.availableBalance * percent) / 100);
    elements.sizePreviewEl.textContent = `≈ ${usdt} USDT (Balance: ${mockState.availableBalance})`;
  }
}

// 레버리지 표시 업데이트
function updateLeverageDisplay() {
  if (elements.leverageEl && elements.levVal) {
    const v = elements.leverageEl.value + 'x';
    elements.levVal.textContent = v;
  }
}

// 이벤트 리스너 (요소가 존재할 때만)
if (elements.sizePercentEl) {
  elements.sizePercentEl.addEventListener('input', updateSizePreview);
}
if (elements.leverageEl) {
  elements.leverageEl.addEventListener('input', updateLeverageDisplay);
}

// HTTP 요청 함수
async function request(path, opts = {}) {
  const headers = opts.headers || {};
  const token = elements.tokenInput
    ? elements.tokenInput.value.trim()
    : localStorage.getItem('AUTH_TOKEN') || '';
  if (token) headers['Authorization'] = 'Bearer ' + token;
  headers['Content-Type'] = 'application/json';
  const res = await fetch(path, { ...opts, headers });
  let data;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

// 헬스체크
async function checkHealth() {
  try {
    const r = await fetch('/healthz');
    if (elements.health) {
      elements.health.textContent = 'health: ' + (r.ok ? 'ok' : 'fail');
    }
  } catch {
    if (elements.health) {
      elements.health.textContent = 'health: fail';
    }
  }
}

// 거래 버튼 이벤트 (요소가 존재할 때만)
if (elements.buyBtn) {
  elements.buyBtn.addEventListener('click', async () => {
    const success = await placeOrder('BUY');
    if (success) {
      updateSizePreview();
      await loadAndRenderPositions();
    }
  });
}

if (elements.sellBtn) {
  elements.sellBtn.addEventListener('click', async () => {
    const success = await placeOrder('SELL');
    if (success) {
      updateSizePreview();
      await loadAndRenderPositions();
    }
  });
}

// 포지션 로드 및 렌더링
async function loadAndRenderPositions() {
  const positions = await loadPositions();
  renderPositions(positions);
}

// 폴링 관리
let pollTimer = 0;
function startPolling() {
  if (pollTimer) clearInterval(pollTimer);

  // 폴링 체크박스가 없거나 체크되지 않은 경우
  if (!elements.pollChk || !elements.pollChk.checked) {
    if (elements.pollTick) {
      elements.pollTick.textContent = 'off';
    }
    return;
  }

  if (elements.pollTick) {
    elements.pollTick.textContent = 'on';
  }
  pollTimer = setInterval(loadAndRenderPositions, 2000);
}

// 폴링 체크박스가 존재할 때만 이벤트 리스너 추가
if (elements.pollChk) {
  elements.pollChk.addEventListener('change', startPolling);
}

// CSV 내보내기 이벤트 (테이블 더블클릭)
document.addEventListener('dblclick', (e) => {
  if (e.target.closest('table')) {
    exportTradeHistory();
  }
});

// 기존 setStatus 함수 호환성 (deprecated)
window.setStatus = function (ok, msg) {
  showToast(ok ? 'success' : 'error', msg);
};

// 포지션 청산 함수 (전역 접근용)
window.liquidatePosition = async function (symbol) {
  const { liquidatePosition } = await import('../services/mock-service.js');
  const { saveTradeToCSV } = await import('../services/csv-service.js');

  const result = liquidatePosition(symbol);

  if (result.success) {
    showToast('success', `🔴 ${result.message} (${result.orderId})`);
    await saveTradeToCSV();
    await loadAndRenderPositions();
  } else {
    showToast('error', result.message);
  }
};

// 초기화
(async () => {
  // 심볼 선택기 초기화
  initializeSymbolSelector();

  // 거래 파라미터 초기화
  initializeTradeParams();

  await checkHealth();
  await loadAndRenderPositions();
  // 폴링 자동 시작 (폴링 요소가 있는 경우에만)
  if (elements.pollChk) {
    startPolling();
  } else {
    // 폴링 요소가 없으면 단순히 2초마다 자동 새로고침
    setInterval(loadAndRenderPositions, 2000);
  }

  // 초기 표시 업데이트 (요소가 존재할 때만)
  updateSizePreview();
  updateLeverageDisplay();
  showToast('info', '모의거래 모드 활성화! 매수/매도 시 자동 CSV 저장');
})();
