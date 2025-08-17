// intent: 메인 앱 컴포넌트 - 컴포넌트 테스트
import { useState } from 'react';
import { Header } from './components/Header';
import { SymbolSelector } from './components/SymbolSelector/SymbolSelector';
import { MarketOrder } from './components/MarketOrder/MarketOrder';
import { PositionsTable } from './components/PositionsTable/PositionsTable';
import './App.css';

function App() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');

  const handleSymbolChange = (symbol: string) => {
    setSelectedSymbol(symbol);
    console.log('Selected symbol:', symbol);
  };

  const handlePositionClose = (symbol: string) => {
    console.log('Closing position:', symbol);
    // 실제 구현에서는 API 호출
  };

  const handleTrade = (
    side: 'buy' | 'sell',
    size: number,
    leverage: number
  ) => {
    console.log(`${side.toUpperCase()} trade:`, { size, leverage });
    // 실제 구현에서는 API 호출
  };

  return (
    <div className="App">
      <Header />

      <main className="App-main">
        <div className="container">
          <section className="symbol-section">
            <div className="card">
              <div className="panel-header">
                <span className="tab">Symbol</span>
              </div>
              <div className="row">
                <SymbolSelector
                  onSymbolChange={handleSymbolChange}
                  initialSymbol={selectedSymbol}
                />
              </div>
            </div>
          </section>

          <section className="market-order-section">
            <MarketOrder onTrade={handleTrade} />
          </section>

          <section className="positions-section">
            <PositionsTable onPositionClose={handlePositionClose} />
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
