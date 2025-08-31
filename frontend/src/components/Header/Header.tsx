// intent: 헤더 컴포넌트 - 로고, 프로덕트명, 헬스체크 상태 표시, 사용자 구분 선택
import { useState, useEffect } from 'react';
import './Header.css';
import { healthCheckService } from '../../utils/healthCheck';
import type {
  HealthStatus,
  BinanceHealthStatus,
  ApiKeyHealthStatus,
} from '../../utils/healthCheck';

type UserId = 'user1' | 'user2' | 'user3' | 'user4';

interface UserOption {
  value: UserId;
  label: string;
  description: string;
  color: string;
}

export const Header = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [binanceHealthStatus, setBinanceHealthStatus] =
    useState<BinanceHealthStatus | null>(null);
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyHealthStatus | null>(
    null
  );
  const [selectedUser, setSelectedUser] = useState<UserId>('user1');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // 사용자 옵션들
  const userOptions: UserOption[] = [
    {
      value: 'user1',
      label: '유저1',
      description: '기본 사용자',
      color: '#2196F3', // 파란색
    },
    {
      value: 'user2',
      label: '유저2',
      description: '보조 사용자',
      color: '#4CAF50', // 초록색
    },
    {
      value: 'user3',
      label: '유저3',
      description: '테스트 사용자',
      color: '#FF9800', // 주황색
    },
    {
      value: 'user4',
      label: '유저4',
      description: '관리자 사용자',
      color: '#E91E63', // 분홍색
    },
  ];

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

  // 드랍다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-selector')) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const getStatusColor = (status: string) => {
    if (status === 'ok' || status === 'valid') return 'var(--buy)';
    if (status === 'error' || status === 'invalid') return 'var(--sell)';
    return 'var(--text-muted)';
  };

  const getCurrentUser = () => {
    return userOptions.find((user) => user.value === selectedUser);
  };

  const handleUserChange = (userId: UserId) => {
    setSelectedUser(userId);
    setIsDropdownOpen(false);
    console.log(`사용자 변경: ${userId}`);
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
          {/* 사용자 선택 드랍다운 */}
          <div className="user-selector">
            <div
              className="user-selector-button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                borderColor: getCurrentUser()?.color || '#ccc',
              }}
            >
              <div
                className="user-indicator"
                style={{
                  backgroundColor: getCurrentUser()?.color || '#ccc',
                }}
              />
              <span className="user-label">
                {getCurrentUser()?.label || '유저'}
              </span>
              <span className="dropdown-arrow">
                {isDropdownOpen ? '▲' : '▼'}
              </span>
            </div>

            {isDropdownOpen && (
              <div className="user-dropdown">
                {userOptions.map((user) => (
                  <div
                    key={user.value}
                    className={`user-option ${
                      selectedUser === user.value ? 'selected' : ''
                    }`}
                    onClick={() => handleUserChange(user.value)}
                  >
                    <div
                      className="user-option-indicator"
                      style={{ backgroundColor: user.color }}
                    />
                    <div className="user-option-content">
                      <div className="user-option-label">{user.label}</div>
                      <div className="user-option-description">
                        {user.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 헬스체크 상태들 */}
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
