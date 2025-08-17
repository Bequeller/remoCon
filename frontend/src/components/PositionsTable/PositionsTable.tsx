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

  const handleClosePosition = (symbol: string) => {
    if (onPositionClose) {
      onPositionClose(symbol);
    } else {
      // 기본 동작: 포지션 제거 (UI에서만)
      setPositions((prev) => prev.filter((pos) => pos.symbol !== symbol));
    }
  };

  const getPositionSide = (positionAmt: string) => {
    const amount = parseFloat(positionAmt);
    return amount > 0 ? 'long' : 'short';
  };

  const formatNumber = (value: string, decimals: number = 2) => {
    return parseFloat(value).toFixed(decimals);
  };

  const getProfitColor = (profit: string) => {
    const value = parseFloat(profit);
    return value >= 0 ? 'positive' : 'negative';
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
                  <th scope="col">Size</th>
                  <th scope="col">Entry Price</th>
                  <th scope="col">Leverage</th>
                  <th scope="col">PnL</th>
                  <th scope="col">Close</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => {
                  const side = getPositionSide(position.positionAmt);
                  const profitColor = getProfitColor(position.unRealizedProfit);

                  return (
                    <tr key={position.symbol} className="position-row">
                      <td className="position-symbol">
                        <div className="position-status">
                          <span className={`status-indicator ${side}`}></span>
                          {position.symbol}
                        </div>
                      </td>
                      <td className="position-size">
                        {formatNumber(position.positionAmt, 4)}
                      </td>
                      <td className="position-entry">
                        ${formatNumber(position.entryPrice)}
                      </td>
                      <td className="position-leverage">
                        {position.leverage}x
                      </td>
                      <td className={`position-pnl ${profitColor}`}>
                        {parseFloat(position.unRealizedProfit) >= 0 ? '+' : ''}$
                        {formatNumber(position.unRealizedProfit)}
                      </td>
                      <td>
                        <button
                          className="position-close"
                          onClick={() => handleClosePosition(position.symbol)}
                          title={`Close ${position.symbol} position`}
                        >
                          Close
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
