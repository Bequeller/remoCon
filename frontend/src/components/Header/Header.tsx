// intent: 헤더 컴포넌트 - 로고, 프로덕트명, 헬스체크 상태 표시
import { useState, useEffect } from 'react';
import './Header.css';
import { healthCheckService } from '../../utils/healthCheck';
import type {
  HealthStatus,
  BinanceHealthStatus,
  ApiKeyHealthStatus,
} from '../../utils/healthCheck';

export const Header = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [binanceHealthStatus, setBinanceHealthStatus] =
    useState<BinanceHealthStatus | null>(null);
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyHealthStatus | null>(
    null
  );

  const fetchHealthStatus = async () => {
    // 분리된 헬스체크 서비스 사용
    const [health, binanceHealth, apiKeyHealth] = await Promise.all([
      healthCheckService.getHealthStatus(),
      healthCheckService.getBinanceHealthStatus(),
      healthCheckService.getApiKeyHealthStatus(),
    ]);

    if (health) setHealthStatus(health);
    if (binanceHealth) setBinanceHealthStatus(binanceHealth);
    if (apiKeyHealth) setApiKeyStatus(apiKeyHealth);
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
