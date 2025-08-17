// API 설정 (확장성 있는 구조)
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  endpoints: {
    symbols: '/api/symbols',
    health: '/healthz',
    positions: '/api/positions',
    trade: '/api/order', // 경로 수정
  },
};

interface Symbol {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
}

interface Position {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  leverage: number;
  unRealizedProfit: string;
  marginType: string;
}

// API 호출 함수 (확장성 있는 구조)
export const apiCall = async <T>(endpoint: string): Promise<T> => {
  try {
    const url = `${API_CONFIG.baseURL}${endpoint}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch ${endpoint}:`, error);
    throw error;
  }
};

// 심볼 관련 API 함수들
export const symbolsAPI = {
  fetchSymbols: async (): Promise<Symbol[]> => {
    const data = await apiCall<{ symbols: Symbol[] }>(API_CONFIG.endpoints.symbols);
    return data.symbols || [];
  },
};

// 포지션 관련 API 함수들
export const positionsAPI = {
  fetchPositions: async (): Promise<Position[]> => {
    const data = await apiCall<Position[]>(API_CONFIG.endpoints.positions);
    return data || [];
  },

  closePosition: async (symbol: string): Promise<TradeResponse> => {
    const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.positions}/${symbol}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },
};

interface TradeRequest {
  symbol: string;
  size: number; // notional -> size
  leverage: number;
  side: 'buy' | 'sell'; // 'BUY' | 'SELL' -> 'buy' | 'sell'
}

interface TradeResponse {
  // 바이낸스 응답이 복잡하므로, 주요 필드만 정의하거나 any로 처리
  orderId: number;
  symbol: string;
  side: string;
  type: string;
  status: string;
  [key: string]: any; // 다른 필드들도 포함 가능
}

// 거래 관련 API 함수들
export const tradeAPI = {
  placeOrder: async (tradeData: TradeRequest): Promise<TradeResponse> => {
    const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.trade}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tradeData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },
};
