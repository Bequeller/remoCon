// intent: 메인 앱 컴포넌트 - 컴포넌트 테스트 및 알람 시스템
import { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { SymbolSelector } from './components/SymbolSelector/SymbolSelector';
import { MarketOrder } from './components/MarketOrder/MarketOrder';
import { PositionsTable } from './components/PositionsTable/PositionsTable';
import { AlertContainer } from './components/Alert';
import type { AlertMessage, AlertType } from './components/Alert';
import { tradeAPI } from './utils/api';
import './App.css';

function App() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);

  // 알람 추가 함수
  const addAlert = useCallback(
    (type: AlertType, title: string, message?: string, duration?: number) => {
      const id =
        Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const alert: AlertMessage = {
        id,
        type,
        title,
        message,
        duration,
      };

      setAlerts((prev) => [...prev, alert]);
    },
    []
  );

  // 알람 제거 함수
  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  const handleSymbolChange = (symbol: string) => {
    setSelectedSymbol(symbol);
    console.log('Selected symbol:', symbol);
    addAlert('info', '심볼 변경', `${symbol}으로 변경되었습니다.`, 3000);
  };

  const handlePositionClose = (symbol: string) => {
    console.log('Closing position:', symbol);
    addAlert(
      'warning',
      '포지션 청산',
      `${symbol} 포지션 청산을 시도합니다.`,
      3000
    );
    // 실제 구현에서는 API 호출
  };

  const handleTrade = async (
    symbol: string,
    side: 'buy' | 'sell',
    size: number,
    leverage: number
  ) => {
    try {
      const tradeData = {
        symbol,
        size, // notional -> size
        leverage,
        side, // side.toUpperCase() 제거
      };
      const result = await tradeAPI.placeOrder(tradeData); // postTrade -> placeOrder
      console.log('Trade successful:', result);

      // 성공 알람 표시
      addAlert(
        'success',
        '거래 성공',
        `${symbol} ${side.toUpperCase()} 주문이 성공적으로 실행되었습니다.`,
        5000
      );

      // 포지션 목록 새로고침 등의 후속 조치
    } catch (error) {
      console.error('Trade failed:', error);

      // 에러 알람 표시
      addAlert(
        'error',
        '거래 실패',
        `거래 실행 중 오류가 발생했습니다. 다시 시도해주세요.`,
        7000
      );
    }
  };

  return (
    <div className="App">
      {/* 알람 컨테이너 - 상단에 고정 표시 */}
      <AlertContainer alerts={alerts} onClose={removeAlert} />

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
            <MarketOrder symbol={selectedSymbol} onTrade={handleTrade} />
          </section>

          <section className="positions-section">
            <PositionsTable
              onPositionClose={handlePositionClose}
              onAddAlert={addAlert}
            />
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
