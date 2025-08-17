// intent: 포지션 테이블 React 컴포넌트 - 백엔드 API 연동
import React, { useState, useEffect } from 'react';
import { positionsAPI } from '../../utils/api';
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
  onPositionClose?: (symbol: string) => void;
}

export const PositionsTable: React.FC<PositionsTableProps> = ({
  onPositionClose,
}) => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closingPositions, setClosingPositions] = useState<Set<string>>(
    new Set()
  );

  // 실제 포지션 데이터 로드
  useEffect(() => {
    const loadPositions = async () => {
      try {
        setLoading(true);
        setError(null);

        // 백엔드 API에서 포지션 데이터 가져오기
        const positionsData = await positionsAPI.fetchPositions();
        setPositions(positionsData);
      } catch (err) {
        console.error('Failed to load positions:', err);
        setError('Failed to load positions. Please try again.');
        setPositions([]); // 에러 시 빈 배열로 설정
      } finally {
        setLoading(false);
      }
    };

    // 초기 로드
    loadPositions();

    // 60초마다 자동 새로고침 (캐시 TTL과 맞춤)
    const interval = setInterval(loadPositions, 60000);

    return () => clearInterval(interval);
  }, []);

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

      // 성공 시 포지션 목록에서 제거
      setPositions((prev) => prev.filter((pos) => pos.symbol !== symbol));

      // 부모 컴포넌트에 알림 (있는 경우)
      if (onPositionClose) {
        onPositionClose(symbol);
      }
    } catch (error) {
      console.error(`Failed to close position for ${symbol}:`, error);

      // 에러 메시지를 사용자에게 표시
      setError(`Failed to close position for ${symbol}. Please try again.`);

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
};
