// intent: 헤더 컴포넌트 - 로고, 프로덕트명, 헬스체크 상태 표시
import { useState, useEffect } from 'react';
import './Header.css';

interface HealthStatus {
  status: string;
  env: {
    useTestnet: boolean;
    hasKeys: boolean;
  };
  version: string;
}

interface BinanceHealthStatus {
  status: string;
  binance: {
    reachable: boolean;
    tsOffsetMs: number;
    testnet: boolean;
  };
}

interface ApiKeyStatus {
  status: string;
  message: string;
  testnet: boolean;
}

export const Header = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [binanceHealthStatus, setBinanceHealthStatus] =
    useState<BinanceHealthStatus | null>(null);
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);

  const fetchHealthStatus = async () => {
    try {
      // 백엔드 서버 헬스체크
      const healthResponse = await fetch('http://localhost:3000/healthz');
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setHealthStatus(healthData);
      }

      // Binance 연결성 체크
      const binanceResponse = await fetch(
        'http://localhost:3000/health/binance'
      );
      if (binanceResponse.ok) {
        const binanceData = await binanceResponse.json();
        setBinanceHealthStatus(binanceData);
      }

      // API Key 유효성 체크
      const apiKeyResponse = await fetch(
        'http://localhost:3000/health/binance/api-key'
      );
      if (apiKeyResponse.ok) {
        const apiKeyData = await apiKeyResponse.json();
        setApiKeyStatus(apiKeyData);
      }
    } catch {
      // 에러 처리 - 상태는 그대로 유지
    }
  };

  useEffect(() => {
    fetchHealthStatus();
    // 2분마다 헬스체크 업데이트 (로그 부하 감소)
    const interval = setInterval(fetchHealthStatus, 120000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    if (status === 'ok' || status === 'valid') return 'var(--buy)';
    if (status === 'error' || status === 'invalid') return 'var(--sell)';
    return 'var(--text-muted)';
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left">
          <img src="/binance-logo.svg" alt="Binance" className="binance-logo" />
          <div className="header-text">
            <h1>RemoCon</h1>
            <p>Futures Remote Control</p>
          </div>
        </div>

        <div className="header-right">
          <div className="health-item">
            <div
              className="health-indicator"
              style={{
                backgroundColor: getStatusColor(
                  healthStatus?.status || 'unknown'
                ),
              }}
            />
            <span className="health-label">Backend</span>
          </div>
          <div className="health-item">
            <div
              className="health-indicator"
              style={{
                backgroundColor: getStatusColor(
                  binanceHealthStatus?.status || 'unknown'
                ),
              }}
            />
            <span className="health-label">Binance</span>
          </div>
          <div className="health-item">
            <div
              className="health-indicator"
              style={{
                backgroundColor: getStatusColor(
                  apiKeyStatus?.status || 'unknown'
                ),
              }}
            />
            <span className="health-label">API Key</span>
          </div>
        </div>
      </div>
    </header>
  );
};
