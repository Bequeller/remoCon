// intent: 검색 가능한 심볼 선택기 컴포넌트
import { elements, showToast } from '../core/dom-utils.js';
import {
  symbolState,
  initializeSymbols,
  searchSymbols,
  selectSymbol,
  getUSDTSymbols,
} from '../services/symbol-service.js';

// 심볼 선택기 상태
const selectorState = {
  isOpen: false,
  selectedIndex: -1,
};

// 심볼 선택기 초기화
export function initializeSymbolSelector() {
  initializeSymbols();
  createSymbolSelectorUI();
  bindSymbolSelectorEvents();

  // 초기 선택값 설정
  updateSelectedSymbolDisplay();
}

// 심볼 선택기 UI 생성
function createSymbolSelectorUI() {
  const symbolSection = document.querySelector('.symbol-section .card');

  symbolSection.innerHTML = `
    <div class="panel-header">
      <span class="tab">Symbol</span>
    </div>
    <div class="symbol-selector-wrapper">
      <div class="symbol-selector">
        <button type="button" class="symbol-selector-btn" id="symbol-selector-btn">
          <span class="selected-symbol" id="selected-symbol">BTCUSDT</span>
          <span class="selector-arrow">▼</span>
        </button>
        
        <div class="symbol-dropdown" id="symbol-dropdown">
          <div class="symbol-search-wrapper">
            <input 
              type="text" 
              id="symbol-search" 
              class="symbol-search" 
              placeholder="심볼 검색 (예: BTC, ETH)"
              autocomplete="off"
            />
          </div>
          
          <div class="symbol-categories">
            <button type="button" class="category-btn active" data-category="usdt">USDT</button>
          </div>
          
          <div class="symbol-list" id="symbol-list">
            <!-- 심볼 목록이 동적으로 생성됨 -->
          </div>
        </div>
      </div>
    </div>
  `;

  // 초기 심볼 목록 렌더링
  renderSymbolList(getUSDTSymbols());
}

// 심볼 목록 렌더링
function renderSymbolList(symbols) {
  const symbolList = document.getElementById('symbol-list');

  if (symbols.length === 0) {
    symbolList.innerHTML = '<div class="no-symbols">검색 결과가 없습니다</div>';
    return;
  }

  symbolList.innerHTML = symbols
    .map(
      (symbol, index) => `
    <div class="symbol-item ${
      symbol.symbol === symbolState.selectedSymbol ? 'selected' : ''
    }" 
         data-symbol="${symbol.symbol}" 
         data-index="${index}">
      <div class="symbol-info">
        <span class="symbol-name">${symbol.symbol}</span>
        <span class="symbol-desc">${symbol.baseAsset}/${
        symbol.quoteAsset
      }</span>
      </div>
    </div>
  `
    )
    .join('');
}

// 이벤트 바인딩
function bindSymbolSelectorEvents() {
  const selectorBtn = document.getElementById('symbol-selector-btn');
  const dropdown = document.getElementById('symbol-dropdown');
  const searchInput = document.getElementById('symbol-search');
  const symbolList = document.getElementById('symbol-list');

  // 선택기 토글
  selectorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  // 검색 입력
  searchInput.addEventListener('input', (e) => {
    const results = searchSymbols(e.target.value);
    renderSymbolList(results);
    selectorState.selectedIndex = -1;
  });

  // 심볼 선택
  symbolList.addEventListener('click', (e) => {
    const symbolItem = e.target.closest('.symbol-item');
    if (symbolItem) {
      const symbol = symbolItem.dataset.symbol;
      handleSymbolSelection(symbol);
    }
  });

  // 카테고리 버튼
  document.querySelectorAll('.category-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      document
        .querySelectorAll('.category-btn')
        .forEach((b) => b.classList.remove('active'));
      e.target.classList.add('active');

      const category = e.target.dataset.category;
      let symbols;

      if (category === 'popular') {
        symbols = symbolState.allSymbols.filter((s) =>
          ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOTUSDT'].includes(
            s.symbol
          )
        );
      } else {
        symbols = getUSDTSymbols();
      }

      renderSymbolList(symbols);
      searchInput.value = '';
      symbolState.searchTerm = '';
    });
  });

  // 키보드 네비게이션
  searchInput.addEventListener('keydown', handleKeyboardNavigation);

  // 외부 클릭 시 닫기
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.symbol-selector')) {
      closeDropdown();
    }
  });
}

// 드롭다운 토글
function toggleDropdown() {
  selectorState.isOpen = !selectorState.isOpen;
  const dropdown = document.getElementById('symbol-dropdown');
  const arrow = document.querySelector('.selector-arrow');

  if (selectorState.isOpen) {
    dropdown.classList.add('open');
    arrow.textContent = '▲';
    document.getElementById('symbol-search').focus();
  } else {
    closeDropdown();
  }
}

// 드롭다운 닫기
function closeDropdown() {
  selectorState.isOpen = false;
  const dropdown = document.getElementById('symbol-dropdown');
  const arrow = document.querySelector('.selector-arrow');

  dropdown.classList.remove('open');
  arrow.textContent = '▼';
  selectorState.selectedIndex = -1;
}

// 키보드 네비게이션
function handleKeyboardNavigation(e) {
  const items = document.querySelectorAll('.symbol-item');

  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectorState.selectedIndex = Math.min(
        selectorState.selectedIndex + 1,
        items.length - 1
      );
      updateHighlight();
      break;
    case 'ArrowUp':
      e.preventDefault();
      selectorState.selectedIndex = Math.max(
        selectorState.selectedIndex - 1,
        -1
      );
      updateHighlight();
      break;
    case 'Enter':
      e.preventDefault();
      if (selectorState.selectedIndex >= 0) {
        const selectedItem = items[selectorState.selectedIndex];
        handleSymbolSelection(selectedItem.dataset.symbol);
      }
      break;
    case 'Escape':
      closeDropdown();
      break;
  }
}

// 하이라이트 업데이트
function updateHighlight() {
  document.querySelectorAll('.symbol-item').forEach((item, index) => {
    item.classList.toggle('highlighted', index === selectorState.selectedIndex);
  });
}

// 심볼 선택 처리
function handleSymbolSelection(symbol) {
  if (selectSymbol(symbol)) {
    updateSelectedSymbolDisplay();
    closeDropdown();

    // 기존 select 요소도 업데이트 (호환성)
    if (elements.symbolEl) {
      elements.symbolEl.value = symbol;
    }

    showToast('info', `심볼 변경: ${symbol}`);
  }
}

// 선택된 심볼 표시 업데이트
function updateSelectedSymbolDisplay() {
  const selectedSymbolEl = document.getElementById('selected-symbol');
  if (selectedSymbolEl) {
    selectedSymbolEl.textContent = symbolState.selectedSymbol;
  }
}

// 외부에서 심볼 목록 업데이트
export function updateSymbolData(newSymbolData) {
  initializeSymbols(newSymbolData);
  renderSymbolList(getUSDTSymbols());
}
