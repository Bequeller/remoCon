// intent: 포지션 테이블 React 컴포넌트 - 백엔드 API 연동
import {
  useState,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { positionsAPI } from '../../utils/api';
import { healthCheckService } from '../../utils/healthCheck';
import type { AlertType } from '../Alert';
import './PositionsTable.css';

interface Position {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  leverage: number;
  unRealizedProfit: string;
  marginType: string;
}

interface PositionsTableProps {
  positions?: Position[];
  onPositionClose?: (symbol: string) => void;
  onAddAlert?: (
    type: AlertType,
    title: string,
    message?: string,
    duration?: number
  ) => void;
}

export interface PositionsTableRef {
  refreshPositions: () => Promise<void>;
}

export const PositionsTable = forwardRef<
  PositionsTableRef,
  PositionsTableProps
>(({ positions: externalPositions, onPositionClose, onAddAlert }, ref) => {
  const [internalPositions, setInternalPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  // 외부에서 제공된 positions 또는 내부 positions 사용
  const positions = externalPositions ?? internalPositions;
  const setPositions = externalPositions ? () => {} : setInternalPositions;
  const [error, setError] = useState<string | null>(null);
  const [closingPositions, setClosingPositions] = useState<Set<string>>(
    new Set()
  );
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean | null>(null);
  const [healthCheckError, setHealthCheckError] = useState<string | null>(null);
  const [isRetryingHealthCheck, setIsRetryingHealthCheck] = useState(false);

  // 헬스체크 수행
  const performHealthCheck = useCallback(async (): Promise<boolean> => {
    try {
      const apiKeyHealth = await healthCheckService.getApiKeyHealthStatus();
      if (apiKeyHealth) {
        setIsApiKeyValid(apiKeyHealth.details.is_valid);
        setHealthCheckError(null);
        return apiKeyHealth.details.is_valid;
      }
      setIsApiKeyValid(false);
      setHealthCheckError('Unable to check API key status');
      return false;
    } catch {
      setIsApiKeyValid(false);
      setHealthCheckError('API key validation failed');

      // 헬스체크 실패 알람 표시
      if (onAddAlert) {
        onAddAlert(
          'error',
          'API 키 검증 실패',
          'Binance API 키 검증에 실패했습니다. 설정을 확인해주세요.',
          7000
        );
      }

      return false;
    }
  }, [onAddAlert]);

  // refreshPositions 함수 - 외부에서 호출 가능
  const refreshPositions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 백엔드 API에서 포지션 데이터 가져오기
      const positionsData = await positionsAPI.fetchPositions();
      setInternalPositions(positionsData);

      console.log('Positions refreshed:', positionsData);
    } catch (err) {
      console.error('Failed to refresh positions:', err);
      const errorMessage = 'Failed to refresh positions. Please try again.';
      setError(errorMessage);

      // 에러 알람 표시
      if (onAddAlert) {
        onAddAlert(
          'error',
          '포지션 새로고침 실패',
          '포지션 데이터를 새로고침하는데 실패했습니다.',
          5000
        );
      }

      setInternalPositions([]); // 에러 시 빈 배열로 설정
    } finally {
      setLoading(false);
    }
  }, [onAddAlert]);

  // 부모 컴포넌트에 refreshPositions 메소드 노출
  useImperativeHandle(
    ref,
    () => ({
      refreshPositions,
    }),
    [refreshPositions]
  );

  // Retry Health Check 핸들러
  const handleRetryHealthCheck = useCallback(async () => {
    if (isRetryingHealthCheck) return; // 중복 호출 방지

    try {
      setIsRetryingHealthCheck(true);

      // 캐시 클리어 후 직접 API 호출 (캐시 우회를 위해)
      healthCheckService.clearCache();

      // 직접 fetch 호출로 캐시 우회
      const response = await fetch(
        'http://localhost:3000/health/binance/api-key',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const apiKeyHealth = await response.json();

        if (apiKeyHealth && apiKeyHealth.details.is_valid) {
          setIsApiKeyValid(true);
          setHealthCheckError(null);

          // 외부에서 positions를 제공받지 않은 경우에만 로드
          if (!externalPositions) {
            try {
              const positionsData = await positionsAPI.fetchPositions();
              setInternalPositions(positionsData);
              setError(null);
            } catch (posError) {
              console.error(
                'Failed to load positions after health check:',
                posError
              );
            }
          }

          if (onAddAlert) {
            onAddAlert(
              'success',
              '헬스체크 성공',
              'API 키가 정상적으로 검증되었습니다.',
              3000
            );
          }
        } else {
          setIsApiKeyValid(false);
          setHealthCheckError(
            apiKeyHealth?.details?.error_message || 'API key validation failed'
          );

          if (onAddAlert) {
            onAddAlert(
              'error',
              'API 키 검증 실패',
              apiKeyHealth?.details?.error_message ||
                'API 키가 유효하지 않습니다.',
              5000
            );
          }
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Retry health check failed:', error);
      setIsApiKeyValid(false);
      setHealthCheckError('API key validation failed');

      if (onAddAlert) {
        onAddAlert(
          'error',
          '헬스체크 재시도 실패',
          '네트워크 오류가 발생했습니다. 연결을 확인해주세요.',
          5000
        );
      }
    } finally {
      setIsRetryingHealthCheck(false);
    }
  }, [isRetryingHealthCheck, onAddAlert, externalPositions]);

  // 실제 포지션 데이터 로드
  useEffect(() => {
    // 외부에서 positions를 제공받았으면 로딩하지 않음
    if (externalPositions) {
      setLoading(false);
      return;
    }

    const loadPositions = async () => {
      try {
        setLoading(true);
        setError(null);

        // 백엔드 API에서 포지션 데이터 가져오기
        const positionsData = await positionsAPI.fetchPositions();
        setInternalPositions(positionsData);
      } catch (err) {
        console.error('Failed to load positions:', err);
        const errorMessage = 'Failed to load positions. Please try again.';
        setError(errorMessage);

        // 에러 알람 표시
        if (onAddAlert) {
          onAddAlert(
            'error',
            '포지션 로드 실패',
            '포지션 데이터를 불러오는데 실패했습니다.',
            5000
          );
        }

        setInternalPositions([]); // 에러 시 빈 배열로 설정
      } finally {
        setLoading(false);
      }
    };

    const initializeComponent = async () => {
      const isHealthy = await performHealthCheck();
      if (isHealthy) {
        await loadPositions();
      }
    };

    // 초기 로드 (헬스체크 먼저 수행)
    initializeComponent();

    // 헬스체크는 30초마다, 포지션은 API Key 유효할 때만 60초마다
    const healthInterval = setInterval(async () => {
      const isHealthy = await performHealthCheck();
      if (isHealthy) {
        await loadPositions();
      }
    }, 30000);

    return () => clearInterval(healthInterval);
  }, [performHealthCheck, onAddAlert, externalPositions]);

  const handleClosePosition = async (symbol: string) => {
    // 이미 청산 중인 경우 중복 요청 방지
    if (closingPositions.has(symbol)) {
      return;
    }

    try {
      // 청산 시작 상태 설정
      setClosingPositions((prev) => new Set(prev).add(symbol));

      // 백엔드 API를 통해 실제 포지션 청산
      const result = await positionsAPI.closePosition(symbol);

      console.log(`Position closed successfully for ${symbol}:`, result);

      // 성공 알람 표시
      if (onAddAlert) {
        onAddAlert(
          'success',
          '포지션 청산 성공',
          `${symbol} 포지션이 성공적으로 청산되었습니다.`,
          5000
        );
      }

      // 성공 시 포지션 목록에서 제거
      setPositions((prev) => prev.filter((pos) => pos.symbol !== symbol));

      // 부모 컴포넌트에 알림 (있는 경우)
      if (onPositionClose) {
        onPositionClose(symbol);
      }
    } catch (error) {
      console.error(`Failed to close position for ${symbol}:`, error);

      // 에러 메시지를 사용자에게 표시
      const errorMessage = `Failed to close position for ${symbol}. Please try again.`;
      setError(errorMessage);

      // 에러 알람 표시
      if (onAddAlert) {
        onAddAlert(
          'error',
          '포지션 청산 실패',
          `${symbol} 포지션 청산에 실패했습니다. 다시 시도해주세요.`,
          7000
        );
      }

      // 3초 후 에러 메시지 제거
      setTimeout(() => {
        setError(null);
      }, 3000);
    } finally {
      // 청산 완료 상태 제거
      setClosingPositions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(symbol);
        return newSet;
      });
    }
  };

  const getPositionSide = (positionAmt: string) => {
    const amount = parseFloat(positionAmt);
    return amount > 0 ? 'long' : 'short';
  };

  // 헬스체크 실패 상태 표시
  if (isApiKeyValid === false) {
    return (
      <div className="positions-section">
        <div className="card">
          <div className="panel-header">
            <span className="tab">Positions</span>
          </div>
          <div className="health-check-error">
            <div className="error-icon">🔑</div>
            <div className="error-title">API Key Required</div>
            <div className="error-message">
              {healthCheckError || 'Please configure valid Binance API key'}
            </div>
            <button
              className="retry-button"
              onClick={handleRetryHealthCheck}
              disabled={isRetryingHealthCheck}
            >
              {isRetryingHealthCheck ? 'Checking...' : 'Retry Health Check'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 에러 상태 표시
  if (error) {
    return (
      <div className="positions-section">
        <div className="card">
          <div className="panel-header">
            <span className="tab">Positions</span>
          </div>
          <div className="positions-error">
            <div className="error-icon">⚠️</div>
            <div className="error-text">{error}</div>
            <button
              className="retry-button"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="positions-section">
        <div className="card">
          <div className="panel-header">
            <span className="tab">Positions</span>
          </div>
          <div className="positions-loading">
            <div className="loading-spinner"></div>
            <p>Loading positions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="positions-section">
      <div className="card">
        <div className="panel-header">
          <span className="tab">Positions</span>
        </div>

        <div className="positions-table-wrapper">
          {positions.length === 0 ? (
            <div className="positions-empty">
              <div className="positions-empty-icon">📊</div>
              <div className="positions-empty-text">No positions</div>
              <div className="positions-empty-subtext">
                Start trading to see your positions here
              </div>
            </div>
          ) : (
            <table
              className="positions-table"
              role="table"
              aria-label="Current positions list"
            >
              <thead>
                <tr>
                  <th scope="col">Symbol</th>
                  <th scope="col">Side</th>
                  <th scope="col">Close</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => {
                  const side = getPositionSide(position.positionAmt);

                  return (
                    <tr key={position.symbol} className="position-row">
                      <td className="position-symbol">{position.symbol}</td>
                      <td className="position-side">
                        <span className={`side-badge ${side}`}>
                          {side.toUpperCase()}
                        </span>
                      </td>
                      <td className="position-close-cell">
                        <button
                          className="position-close"
                          onClick={() => handleClosePosition(position.symbol)}
                          title={`Close ${position.symbol} position`}
                          disabled={closingPositions.has(position.symbol)}
                        >
                          {closingPositions.has(position.symbol)
                            ? 'CLOSING...'
                            : 'CLOSE'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
});
