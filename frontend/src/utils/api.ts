// API 설정 (확장성 있는 구조)
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  endpoints: {
    symbols: '/symbols',
    health: '/healthz',
    positions: '/api/positions',
    trade: '/api/trade',
  },
};

// API 호출 함수 (확장성 있는 구조)
export const apiCall = async (endpoint: string): Promise<any> => {
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
  fetchSymbols: async (): Promise<any[]> => {
    const data = await apiCall(API_CONFIG.endpoints.symbols);
    return data.symbols || [];
  },
};

// 포지션 관련 API 함수들
export const positionsAPI = {
  fetchPositions: async (): Promise<any[]> => {
    const data = await apiCall(API_CONFIG.endpoints.positions);
    return data || [];
  },
};

// 거래 관련 API 함수들
export const tradeAPI = {
  placeTrade: async (tradeData: any): Promise<any> => {
    const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.trade}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tradeData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },
};
