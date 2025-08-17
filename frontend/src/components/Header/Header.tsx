// intent: 헤더 컴포넌트 - 로고, 프로덕트명, 헬스체크 상태 표시
import { useState, useEffect } from 'react';
import './Header.css';

interface HealthStatus {
  status: string;
  env: {
    useTestnet: boolean;
    hasKeys: boolean;
  };
  binance: {
    reachable: boolean;
    tsOffsetMs: number;
  };
  version: string;
}

export const Header = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthStatus = async () => {
    try {
      // 컨테이너 환경에서는 백엔드 서비스에 직접 호출
      const response = await fetch('http://localhost:3000/healthz');
      if (response.ok) {
        const data = await response.json();
        setHealthStatus(data);
        setError(null);
      } else {
        setError('Health check failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthStatus();
    // 30초마다 헬스체크 업데이트
    const interval = setInterval(fetchHealthStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getHealthStatusColor = () => {
    if (isLoading) return 'var(--text-muted)';
    if (error || !healthStatus) return 'var(--sell)';
    if (healthStatus.status === 'ok' && healthStatus.binance.reachable) {
      return 'var(--buy)';
    }
    return 'var(--sell)';
  };

  const getHealthStatusText = () => {
    if (isLoading) return 'Checking...';
    if (error || !healthStatus) return 'Offline';
    if (healthStatus.status === 'ok' && healthStatus.binance.reachable) {
      return 'Online';
    }
    return 'Error';
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
          <div className="health-status">
            <div
              className="health-indicator"
              style={{ backgroundColor: getHealthStatusColor() }}
            />
            <span className="health-text">{getHealthStatusText()}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
