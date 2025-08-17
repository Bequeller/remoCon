// intent: Market Order React 컴포넌트 - Size를 USDT 단위로 변경
import React, { useState } from 'react';
import './MarketOrder.css';

interface MarketOrderProps {
  onTrade?: (side: 'buy' | 'sell', size: number, leverage: number) => void;
}

export const MarketOrder: React.FC<MarketOrderProps> = ({ onTrade }) => {
  const [size, setSize] = useState(100);
  const [leverage, setLeverage] = useState(10);

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

  const handleTrade = (side: 'buy' | 'sell') => {
    onTrade?.(side, size, leverage);
    console.log(`${side.toUpperCase()} order:`, { size, leverage });
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
            aria-label="Buy order"
          >
            Buy/Long
          </button>
          <button
            className="btn sell"
            type="button"
            onClick={() => handleTrade('sell')}
            aria-label="Sell order"
          >
            Sell/Short
          </button>
        </div>
      </div>
    </div>
  );
};
