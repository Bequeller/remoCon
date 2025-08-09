// intent: CSV 로그 관리 서비스
import { CSV_HEADERS } from '../core/constants.js';
import { mockState } from './mock-service.js';
import { showToast } from '../core/dom-utils.js';

// 개별 거래 CSV 저장
export async function saveTradeToCSV() {
  if (mockState.tradeHistory.length === 0) return;

  const latestTrade = mockState.tradeHistory[mockState.tradeHistory.length - 1];
  const profitPct =
    mockState.tradeHistory.length > 1
      ? (
          ((latestTrade.balance - mockState.tradeHistory[0].balance) /
            mockState.tradeHistory[0].balance) *
          100
        ).toFixed(2)
      : '0.00';

  // CSV 한 줄 데이터 생성
  const csvRow = [
    latestTrade.timestamp,
    latestTrade.orderId,
    latestTrade.symbol,
    latestTrade.side,
    latestTrade.assetPercent + '%',
    latestTrade.quantity,
    latestTrade.price,
    latestTrade.notional,
    latestTrade.leverage,
    latestTrade.balance,
    profitPct + '%',
  ]
    .map((cell) => `"${cell}"`)
    .join(',');

  // 파일명: trade_log_YYYY-MM-DD.csv (log/ 제거, 서버에서 처리)
  const today = new Date().toISOString().split('T')[0];
  const filename = `trade_log_${today}.csv`;

  // 서버에서 파일 존재 여부 확인 후 헤더 추가 결정
  await saveToLogDirectory(filename, csvRow + '\n');
}

// 서버를 통해 로그 디렉토리에 파일 저장
async function saveToLogDirectory(filename, content) {
  try {
    const response = await fetch('/api/save-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: filename,
        content: content,
      }),
    });

    if (response.ok) {
      console.log(`로그 저장 완료: ${filename}`);
    } else {
      console.error('로그 저장 실패:', response.statusText);
      downloadCSVFallback(filename.split('/').pop(), content);
    }
  } catch (error) {
    console.error('로그 저장 오류:', error);
    downloadCSVFallback(filename.split('/').pop(), content);
  }
}

// CSV 파일 다운로드 (폴백용)
function downloadCSVFallback(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 전체 거래 내역 CSV 내보내기
export async function exportTradeHistory() {
  const today = new Date().toISOString().split('T')[0];
  const filename = `trade_log_${today}.csv`;

  try {
    // 서버에서 파일 다운로드
    const response = await fetch(`/api/download-log/${filename}`);

    if (response.ok) {
      const blob = await response.blob();
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('success', `로그 파일 다운로드 완료: ${filename}`);
    } else if (response.status === 404) {
      showToast('info', '오늘 거래 내역이 없습니다');
    } else {
      throw new Error(`다운로드 실패: ${response.statusText}`);
    }
  } catch (error) {
    console.error('로그 다운로드 오류:', error);
    showToast('error', '로그 다운로드 중 오류가 발생했습니다');
  }
}
