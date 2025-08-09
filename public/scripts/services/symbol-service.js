// intent: 심볼 데이터 관리 및 검색 서비스
import { CONSTANTS } from '../core/constants.js';

// 심볼 데이터 상태
export const symbolState = {
  allSymbols: [], // 전체 심볼 목록
  filteredSymbols: [], // 필터링된 심볼 목록
  selectedSymbol: 'BTCUSDT', // 선택된 심볼
  searchTerm: '', // 검색어
};

// 기본 심볼 목록 (Binance 데이터 대기용)
const DEFAULT_SYMBOLS = [
  {
    symbol: 'BTCUSDT',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    status: 'TRADING',
  },
  {
    symbol: 'ETHUSDT',
    baseAsset: 'ETH',
    quoteAsset: 'USDT',
    status: 'TRADING',
  },
  {
    symbol: 'BNBUSDT',
    baseAsset: 'BNB',
    quoteAsset: 'USDT',
    status: 'TRADING',
  },
  {
    symbol: 'ADAUSDT',
    baseAsset: 'ADA',
    quoteAsset: 'USDT',
    status: 'TRADING',
  },
  {
    symbol: 'DOTUSDT',
    baseAsset: 'DOT',
    quoteAsset: 'USDT',
    status: 'TRADING',
  },
  {
    symbol: 'XRPUSDT',
    baseAsset: 'XRP',
    quoteAsset: 'USDT',
    status: 'TRADING',
  },
  {
    symbol: 'LTCUSDT',
    baseAsset: 'LTC',
    quoteAsset: 'USDT',
    status: 'TRADING',
  },
  {
    symbol: 'LINKUSDT',
    baseAsset: 'LINK',
    quoteAsset: 'USDT',
    status: 'TRADING',
  },
  {
    symbol: 'BCHUSDT',
    baseAsset: 'BCH',
    quoteAsset: 'USDT',
    status: 'TRADING',
  },
  {
    symbol: 'XLMUSDT',
    baseAsset: 'XLM',
    quoteAsset: 'USDT',
    status: 'TRADING',
  },
];

// 심볼 초기화
export function initializeSymbols(symbolData = null) {
  symbolState.allSymbols = symbolData || DEFAULT_SYMBOLS;
  symbolState.filteredSymbols = [...symbolState.allSymbols];
  return symbolState.allSymbols;
}

// 심볼 검색
export function searchSymbols(searchTerm) {
  symbolState.searchTerm = searchTerm.toUpperCase();

  if (!symbolState.searchTerm) {
    symbolState.filteredSymbols = [...symbolState.allSymbols];
  } else {
    symbolState.filteredSymbols = symbolState.allSymbols.filter(
      (symbol) =>
        symbol.symbol.includes(symbolState.searchTerm) ||
        symbol.baseAsset.includes(symbolState.searchTerm)
    );
  }

  return symbolState.filteredSymbols;
}

// 심볼 선택
export function selectSymbol(symbol) {
  if (symbolState.allSymbols.find((s) => s.symbol === symbol)) {
    symbolState.selectedSymbol = symbol;
    return true;
  }
  return false;
}

// 선택된 심볼 정보 가져오기
export function getSelectedSymbolInfo() {
  return symbolState.allSymbols.find(
    (s) => s.symbol === symbolState.selectedSymbol
  );
}

// USDT 페어만 필터링
export function getUSDTSymbols() {
  return symbolState.allSymbols.filter(
    (symbol) => symbol.quoteAsset === 'USDT'
  );
}

// 인기 심볼 목록
export function getPopularSymbols() {
  const popularList = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOTUSDT'];
  return symbolState.allSymbols.filter((symbol) =>
    popularList.includes(symbol.symbol)
  );
}
