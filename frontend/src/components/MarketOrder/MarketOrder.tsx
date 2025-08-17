// intent: Market Order React 컴포넌트 - Size를 USDT 단위로 변경
import React, { useState } from 'react';
import './MarketOrder.css';

interface MarketOrderProps {
  onTrade?: (side: 'buy' | 'sell', size: number, leverage: number) => void;
}

export const MarketOrder: React.FC<MarketOrderProps> = ({ onTrade }) => {
  const [size, setSize] = useState(100); // 기본값을 100 USDT로 변경
  const [leverage, setLeverage] = useState(20);

  const handleSizeChange = (value: number) => {
    setSize(Math.max(10, Math.min(10000, value))); // 범위를 10-10000 USDT로 변경
  };

  const handleSizePreset = (presetSize: number) => {
    setSize(presetSize);
  };

  const handleTrade = (side: 'buy' | 'sell') => {
    onTrade?.(side, size, leverage);
    console.log(`${side.toUpperCase()} order:`, { size, leverage });
  };

  const sizePresets = [50, 100, 500, 1000, 5000]; // USDT 기준 프리셋

  return (
    <div className="trade-section">
      <div className="card">
        <div className="panel-header">
          <span className="tab">Market</span>
        </div>

        {/* 거래 파라미터 그리드 */}
        <div className="trade-params-grid">
          {/* Size 입력 - USDT 단위로 변경 */}
          <div className="param-group">
            <div className="param-header">
              <span className="param-label">Size</span>
            </div>
            <div className="param-control">
              <div className="param-input-group">
                <input
                  type="number"
                  min="10"
                  max="10000"
                  step="10"
                  value={size}
                  onChange={(e) => handleSizeChange(Number(e.target.value))}
                  className="param-input"
                  aria-label="Trade size in USDT"
                />
                <span className="param-unit">USDT</span>
              </div>
              <div className="slider-track">
                <div
                  className="slider-progress"
                  style={{ width: `${(size / 10000) * 100}%` }}
                ></div>
              </div>
              <div className="slider-marks">
                <span>10</span>
                <span>2.5K</span>
                <span>5K</span>
                <span>7.5K</span>
                <span>10K</span>
              </div>
            </div>
            <div className="param-presets">
              {sizePresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`preset-btn ${size === preset ? 'active' : ''}`}
                  onClick={() => handleSizePreset(preset)}
                >
                  {preset >= 1000 ? `${preset / 1000}K` : preset}
                </button>
              ))}
            </div>
          </div>

          {/* Leverage 입력 - 2단계에서 구현 예정 */}
          <div className="param-group">
            <div className="param-header">
              <span className="param-label">Leverage</span>
            </div>
            <div className="param-control">
              <div className="param-input-group">
                <input
                  type="number"
                  min="1"
                  max="25"
                  step="1"
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  className="param-input"
                  aria-label="Leverage multiplier"
                />
                <span className="param-unit">x</span>
              </div>
              <div className="slider-track">
                <div
                  className="slider-progress"
                  style={{ width: `${(leverage / 25) * 100}%` }}
                ></div>
              </div>
              <div className="slider-marks">
                <span>1x</span>
                <span>5x</span>
                <span>10x</span>
                <span>20x</span>
                <span>25x</span>
              </div>
            </div>
            <div className="param-presets">
              <button
                type="button"
                className={`preset-btn ${leverage === 1 ? 'active' : ''}`}
                onClick={() => setLeverage(1)}
              >
                1x
              </button>
              <button
                type="button"
                className={`preset-btn ${leverage === 5 ? 'active' : ''}`}
                onClick={() => setLeverage(5)}
              >
                5x
              </button>
              <button
                type="button"
                className={`preset-btn ${leverage === 10 ? 'active' : ''}`}
                onClick={() => setLeverage(10)}
              >
                10x
              </button>
              <button
                type="button"
                className={`preset-btn ${leverage === 20 ? 'active' : ''}`}
                onClick={() => setLeverage(20)}
              >
                20x
              </button>
              <button
                type="button"
                className={`preset-btn ${leverage === 25 ? 'active' : ''}`}
                onClick={() => setLeverage(25)}
              >
                25x
              </button>
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
