// intent: Market Order React 컴포넌트 - Size를 USDT 단위로 변경
import React, { useState } from 'react';
import './MarketOrder.css';
import { healthCheckService } from '../../utils/healthCheck';
import type { AlertMessage } from '../Alert/Alert';

interface MarketOrderProps {
  symbol: string;
  onTrade?: (
    symbol: string,
    side: 'buy' | 'sell',
    size: number,
    leverage: number
  ) => void;
  onAlert?: (alert: AlertMessage) => void;
}

export const MarketOrder: React.FC<MarketOrderProps> = ({
  symbol,
  onTrade,
  onAlert,
}) => {
  const [size, setSize] = useState(100);
  const [leverage, setLeverage] = useState(10);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // 헬스체크 수행 및 검증
  const performHealthChecks = async (): Promise<boolean> => {
    try {
      setIsCheckingHealth(true);

      // 각 헬스체크를 독립적으로 수행
      const healthStatus = await healthCheckService.getHealthStatus();
      const binanceHealthStatus =
        await healthCheckService.getBinanceHealthStatus();
      const apiKeyHealthStatus =
        await healthCheckService.getApiKeyHealthStatus();

      // 각 헬스체크 결과 검증
      const healthErrors: string[] = [];

      // 1. 백엔드 헬스체크
      if (!healthStatus || healthStatus.status !== 'ok') {
        healthErrors.push('백엔드 서버 상태가 비정상입니다');
      }

      // 2. 바이낸스 연결 상태
      if (
        !binanceHealthStatus ||
        binanceHealthStatus.status !== 'ok' ||
        !binanceHealthStatus.binance.reachable
      ) {
        healthErrors.push('바이낸스 서버 연결이 불가능합니다');
      }

      // 3. API 키 상태
      if (
        !apiKeyHealthStatus ||
        apiKeyHealthStatus.status !== 'valid' ||
        !apiKeyHealthStatus.details.is_valid
      ) {
        healthErrors.push('API 키가 유효하지 않거나 권한이 부족합니다');
      }

      if (healthErrors.length > 0) {
        // 헬스체크 실패 시 알림 표시
        const alertId = `health-check-error-${Date.now()}`;
        onAlert?.({
          id: alertId,
          type: 'error',
          title: '거래 불가',
          message: `다음 문제가 발견되었습니다:\n• ${healthErrors.join(
            '\n• '
          )}`,
          duration: 8000,
        });
        console.log('헬스체크 실패:', healthErrors);
        return false;
      }

      console.log('헬스체크 성공: 모든 시스템이 정상 작동 중');
      return true;
    } catch (error) {
      console.error('헬스체크 중 오류 발생:', error);
      const alertId = `health-check-error-${Date.now()}`;
      onAlert?.({
        id: alertId,
        type: 'error',
        title: '헬스체크 실패',
        message:
          '시스템 상태 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        duration: 5000,
      });
      return false;
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleSizeChange = (value: number) => {
    setSize(value);
  };

  const handleLeverageChange = (value: number) => {
    setLeverage(value);
  };

  // 레버리지 위험도에 따른 애니메이션 클래스 계산
  const getLeverageAnimationClass = () => {
    if (leverage >= 30) return 'leverage-danger';
    if (leverage >= 15) return 'leverage-warning';
    return '';
  };

  // 사이즈 위험도에 따른 애니메이션 클래스 계산
  const getSizeAnimationClass = () => {
    if (size >= 10000) return 'size-danger';
    if (size >= 5000) return 'size-warning';
    return '';
  };

  // 3자리마다 쉼표 포맷팅
  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleTrade = async (side: 'buy' | 'sell') => {
    // 헬스체크 진행 중이면 중복 실행 방지
    if (isCheckingHealth) {
      return;
    }

    // 헬스체크 수행
    const isHealthy = await performHealthChecks();

    if (!isHealthy) {
      // 헬스체크 실패 - 이미 performHealthChecks에서 알림 표시됨
      return;
    }

    // 헬스체크 성공 시 거래 실행
    onTrade?.(symbol, side, size, leverage);
    console.log(`${side.toUpperCase()} order:`, { symbol, size, leverage });
  };

  return (
    <div className="trade-section">
      <div className="card">
        <div className="panel-header">
          <span className="tab">Market</span>
        </div>

        {/* 거래 파라미터 그리드 */}
        <div className="trade-params-grid">
          {/* Size 입력 */}
          <div className="param-group">
            <div className="param-row">
              <div className="param-label-col">
                <span className="param-label">Size</span>
              </div>
              <div className="param-input-col">
                <div className={`param-input-group ${getSizeAnimationClass()}`}>
                  <input
                    type="text"
                    value={size === 0 ? '' : formatNumber(size)}
                    onChange={(e) => {
                      if (e.target.value === '') {
                        handleSizeChange(0);
                      } else {
                        const rawValue = e.target.value.replace(/,/g, '');
                        const numValue = Number(rawValue);
                        if (!isNaN(numValue) && numValue <= 1000000) {
                          handleSizeChange(numValue);
                        }
                      }
                    }}
                    className="param-input"
                    placeholder="Enter size"
                    aria-label="Trade size in USDT"
                  />
                  <span className="param-unit">USDT</span>
                </div>
              </div>
            </div>
          </div>

          {/* Leverage 입력 */}
          <div className="param-group">
            <div className="param-row">
              <div className="param-label-col">
                <span className="param-label">Leverage</span>
              </div>
              <div className="param-input-col">
                <div
                  className={`param-input-group ${getLeverageAnimationClass()}`}
                >
                  <input
                    type="text"
                    value={leverage === 0 ? '' : leverage}
                    onChange={(e) => {
                      if (e.target.value === '') {
                        handleLeverageChange(0);
                      } else {
                        const numValue = Number(e.target.value);
                        if (!isNaN(numValue) && numValue <= 100) {
                          handleLeverageChange(numValue);
                        }
                      }
                    }}
                    className="param-input"
                    placeholder="Enter leverage"
                    aria-label="Leverage value"
                  />
                  <span className="param-unit">x</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trade execution buttons */}
        <div className="row actions">
          <button
            className="btn buy"
            type="button"
            onClick={() => handleTrade('buy')}
            disabled={isCheckingHealth}
            aria-label="Buy order"
          >
            {isCheckingHealth ? '체크 중...' : 'Buy/Long'}
          </button>
          <button
            className="btn sell"
            type="button"
            onClick={() => handleTrade('sell')}
            disabled={isCheckingHealth}
            aria-label="Sell order"
          >
            {isCheckingHealth ? '체크 중...' : 'Sell/Short'}
          </button>
        </div>
      </div>
    </div>
  );
};
