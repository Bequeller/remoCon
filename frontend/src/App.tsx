// intent: 메인 앱 컴포넌트 - 컴포넌트 테스트 및 알람 시스템
import { useState, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { SymbolSelector } from './components/SymbolSelector/SymbolSelector';
import { MarketOrder } from './components/MarketOrder/MarketOrder';
import { PositionsTable } from './components/PositionsTable/PositionsTable';
import type { PositionsTableRef } from './components/PositionsTable/PositionsTable';
import { AlertContainer } from './components/Alert';
import type { AlertMessage, AlertType } from './components/Alert';
import { tradeAPI } from './utils/api';
import './App.css';

type UserId = 'user1' | 'user2' | 'user3' | 'user4';

function App() {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserId>('user1');
  const positionsTableRef = useRef<PositionsTableRef>(null);

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

  // MarketOrder용 알람 추가 함수
  const addAlertForMarketOrder = useCallback((alert: AlertMessage) => {
    setAlerts((prev) => [...prev, alert]);
  }, []);

  // 알람 제거 함수
  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  const handleSymbolChange = (symbol: string) => {
    setSelectedSymbol(symbol);
    console.log('Selected symbol:', symbol);
    addAlert('info', '심볼 변경', `${symbol}으로 변경되었습니다.`, 3000);
  };

  const handlePositionClose = async (symbol: string) => {
    console.log('Closing position:', symbol);
    addAlert(
      'warning',
      '포지션 청산',
      `${symbol} 포지션 청산을 시도합니다.`,
      3000
    );

    try {
      // 실제 청산 API 호출
      const response = await fetch(`http://localhost:3000/api/positions/${symbol}/close?user=${selectedUser}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Position close successful:', result);

      addAlert(
        'success',
        '포지션 청산 성공',
        `${symbol} 포지션이 성공적으로 청산되었습니다.`,
        5000
      );
    } catch (error) {
      console.error('Position close failed:', error);
      addAlert(
        'error',
        '포지션 청산 실패',
        `청산 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        7000
      );
    }
  };

  const handleUserChange = (userId: UserId) => {
    setSelectedUser(userId);
    console.log('Selected user changed to:', userId);
    addAlert('info', '사용자 변경', `사용자가 ${userId}으로 변경되었습니다.`, 2000);
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
        user: selectedUser, // 현재 선택된 사용자 정보 추가
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

      // 매수/매도 성공 후 2초 뒤에 포지션 정보 새로고침
      setTimeout(async () => {
        try {
          await positionsTableRef.current?.refreshPositions();
          console.log('Positions refreshed after trade');
        } catch (error) {
          console.error('Failed to refresh positions:', error);
        }
      }, 2000);
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

      <Header
        selectedUser={selectedUser}
        onUserChange={handleUserChange}
      />

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
            <MarketOrder
              symbol={selectedSymbol}
              onTrade={handleTrade}
              onAlert={addAlertForMarketOrder}
            />
          </section>

          <section className="positions-section">
            <PositionsTable
              ref={positionsTableRef}
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
