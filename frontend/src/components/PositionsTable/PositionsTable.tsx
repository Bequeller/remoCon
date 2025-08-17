// intent: 포지션 테이블 React 컴포넌트
import React, { useState, useEffect } from 'react';
import './PositionsTable.css';

interface Position {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  leverage: string;
  assetPercent: string;
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

  // 임시 포지션 데이터 로드
  useEffect(() => {
    const loadPositions = () => {
      // 임시 데이터 (실제 API 연결 전)
      const tempPositions: Position[] = [
        {
          symbol: 'BTCUSDT',
          positionAmt: '0.001',
          entryPrice: '43250.50',
          leverage: '10x',
          assetPercent: '25.0',
          unRealizedProfit: '125.30',
          marginType: 'cross',
        },
        {
          symbol: 'ETHUSDT',
          positionAmt: '0.05',
          entryPrice: '2650.75',
          leverage: '5x',
          assetPercent: '15.0',
          unRealizedProfit: '-45.20',
          marginType: 'cross',
        },
        {
          symbol: 'SOLUSDT',
          positionAmt: '2.5',
          entryPrice: '98.25',
          leverage: '20x',
          assetPercent: '10.0',
          unRealizedProfit: '67.80',
          marginType: 'cross',
        },
      ];

      setPositions(tempPositions);
      setLoading(false);
    };

    // 실제 구현에서는 API 호출
    setTimeout(loadPositions, 500);
  }, []);

  const handleClosePosition = (symbol: string) => {
    if (onPositionClose) {
      onPositionClose(symbol);
    } else {
      // 기본 동작: 포지션 제거
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
                  <th scope="col">Asset(%)</th>
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
                      <td className="position-asset">
                        {formatNumber(position.assetPercent)}%
                      </td>
                      <td className="position-leverage">{position.leverage}</td>
                      <td className={`position-pnl ${profitColor}`}>
                        {parseFloat(position.unRealizedProfit) >= 0 ? '+' : ''}
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
