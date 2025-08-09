// intent: DOM 조작 유틸리티 함수 분리
export const el = (id) => document.getElementById(id);

// DOM 요소들
export const elements = {
  tokenInput: el('token'),
  health: el('health'),
  symbolEl: el('symbol'),
  sizePercentEl: el('sizePercent'),
  leverageEl: el('leverage'),
  levVal: el('levVal'),
  sizePreviewEl: el('sizePreview'),
  sideEl: el('side'),
  buyBtn: el('buy'),
  sellBtn: el('sell'),
  toastContainer: el('toast-container'),
  pollChk: el('poll'),
  pollTick: el('pollTick'),
  positionsTbody: el('positions'),
  positionsCard: el('positions-card'),
};

// Toast 알림 시스템 (다중 토스트 지원)
export function showToast(type, message) {
  const emojis = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
    buy: '', // 이모지가 메시지에 포함되므로 빈 문자열
    sell: '', // 이모지가 메시지에 포함되므로 빈 문자열
  };

  // 새로운 토스트 요소 생성
  const toastEl = document.createElement('div');
  const emoji = emojis[type] || 'ℹ️';
  toastEl.textContent = emoji ? `${emoji} ${message}` : message;
  toastEl.className = `toast ${type}`;

  // 컨테이너에 추가
  elements.toastContainer.appendChild(toastEl);

  // 애니메이션을 위한 지연
  requestAnimationFrame(() => {
    toastEl.classList.add('show');
  });

  // 자동 제거
  setTimeout(() => {
    toastEl.classList.remove('show');
    // 애니메이션 완료 후 DOM에서 제거
    setTimeout(() => {
      if (toastEl.parentNode) {
        toastEl.parentNode.removeChild(toastEl);
      }
    }, 300); // transition 시간과 맞춤
  }, 5000);
}

// 포지션 테이블 렌더링
export function renderPositions(rows) {
  elements.positionsTbody.innerHTML = '';
  if (!rows || rows.length === 0) {
    elements.positionsTbody.innerHTML =
      '<tr><td colspan="4" class="muted">No positions</td></tr>';
    return;
  }
  for (const p of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.symbol}</td>
      <td>${p.assetPercent}%</td>
      <td>${p.leverage}x</td>
      <td>
        <button 
          class="btn-liquidate" 
          data-symbol="${p.symbol}"
          aria-label="Market close position"
          title="Market close"
        >
          Market
        </button>
      </td>
    `;
    elements.positionsTbody.appendChild(tr);
  }

  // 청산 버튼 이벤트 리스너 추가
  bindLiquidationButtons();
}

// 청산 버튼 이벤트 바인딩
function bindLiquidationButtons() {
  document.querySelectorAll('.btn-liquidate').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const symbol = e.target.dataset.symbol;
      if (window.liquidatePosition) {
        window.liquidatePosition(symbol);
      }
    });
  });
}
