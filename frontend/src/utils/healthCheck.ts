// 헬스체크 관련 타입들
export interface HealthStatus {
  status: string;
  env: {
    useTestnet: boolean;
    hasKeys: boolean;
  };
  version: string;
}

export interface BinanceHealthStatus {
  status: string;
  binance: {
    reachable: boolean;
    tsOffsetMs: number;
    testnet: boolean;
  };
}

export interface ApiKeyHealthStatus {
  status: string;
  message: string;
  details: {
    is_valid: boolean;
    has_futures_permission: boolean;
    rate_limit_remaining: number;
    last_check: string;
    error_message: string | null;
  };
  testnet: boolean;
}

// 헬스체크 서비스 클래스
class HealthCheckService {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private readonly CACHE_DURATION = 30000; // 30초 캐시

  async getHealthStatus(): Promise<HealthStatus | null> {
    return this.fetchWithCache('/healthz');
  }

  async getBinanceHealthStatus(): Promise<BinanceHealthStatus | null> {
    return this.fetchWithCache('/health/binance');
  }

  async getApiKeyHealthStatus(): Promise<ApiKeyHealthStatus | null> {
    return this.fetchWithCache('/health/binance/api-key');
  }

  private async fetchWithCache<T>(endpoint: string): Promise<T | null> {
    const cacheKey = endpoint;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data as T;
    }

    try {
      const response = await fetch(`http://localhost:3000${endpoint}`);
      if (response.ok) {
        const data = (await response.json()) as T;
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }

  // 캐시 클리어 (필요시 수동 갱신용)
  clearCache() {
    this.cache.clear();
  }
}

export const healthCheckService = new HealthCheckService();
