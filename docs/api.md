[Architect] [Business] [vRule]

## Futures Remote API 계약서 (v0)

### 공통
- Base URL: 앱 서버 기동 호스트 (기본 `http://localhost:3000`)
 - Base URL: 앱 서버 기동 호스트 (기본 `http://localhost:3004`)
- 인증: `Authorization: Bearer <AUTH_TOKEN>` 필수
- 표준 에러 포맷:
```json
{ "requestId":"<uuid>", "code":"<ERROR_CODE>", "message":"<human readable>" }
```

### POST /api/trade
- 설명: Binance Futures 시장가 주문(원클릭 매수/매도)
- 요청 헤더: `Authorization` 필수, `Content-Type: application/json`
- 요청 바디:
```json
{
  "symbol": "BTCUSDT",
  "notional": 50,
  "leverage": 10,
  "side": "BUY"
}
```
- 제약:
  - `symbol`: 허용 리스트 내 문자열(예: BTCUSDT, ETHUSDT)
  - `notional`: number, > 0
  - `leverage`: integer, 1–25
  - `side`: "BUY" | "SELL"
- 성공 응답 200:
```json
{
  "orderId": "123456789",
  "symbol": "BTCUSDT",
  "side": "BUY",
  "executedQty": "0.001",
  "avgPrice": "50000.0",
  "status": "FILLED"
}
```
- 오류 응답:
  - 400: `INVALID_SYMBOL`, `INVALID_LEVERAGE`, `INVALID_SIDE`, `INVALID_NOTIONAL`, `MIN_QTY_VIOLATION`, `MIN_NOTIONAL_VIOLATION`, `PRECISION_VIOLATION`
  - 402: `INSUFFICIENT_BALANCE`
  - 429: `RATE_LIMITED`
  - 5xx: `UPSTREAM_ERROR`

### GET /api/positions
- 설명: 현재 보유 포지션 조회(정규화 리스트)
- 요청 헤더: `Authorization` 필수
 - 주의: 키 미설정 시 401 `UNAUTHORIZED` 반환
- 성공 응답 200:
```json
[
  {
    "symbol": "BTCUSDT",
    "positionAmt": "0.001",
    "entryPrice": "50000.0",
    "leverage": 10,
    "unRealizedProfit": "1.23",
    "marginType": "cross"
  }
]
```

### 상태 코드/에러 코드 매핑(요약)
- 400 Bad Request: 입력값/거래 필터 위반
  - `INVALID_SYMBOL`, `INVALID_LEVERAGE`, `INVALID_SIDE`, `INVALID_NOTIONAL`
  - `MIN_QTY_VIOLATION`, `MIN_NOTIONAL_VIOLATION`, `PRECISION_VIOLATION`
- 401 Unauthorized: 누락/잘못된 토큰 → `UNAUTHORIZED`
- 402 Payment Required: `INSUFFICIENT_BALANCE`
- 429 Too Many Requests: `RATE_LIMITED`
- 5xx: Binance/네트워크 등 상위 장애 → `UPSTREAM_ERROR`

### 처리 규칙(핵심)
- 캐시: `exchangeInfo` 30초, `markPrice` 2초 TTL
- 레버리지: 요청값과 상이 시에만 설정 호출(캐시 5분)
- 주문 재시도: 없음(네트워크 타임아웃 시 사용자 안내)
- GET 재시도: 지수 backoff 최대 1회(exchangeInfo/markPrice/positionRisk)

### 보안
- 서버 환경변수 사용: `BINANCE_API_KEY`, `BINANCE_API_SECRET`, `AUTH_TOKEN`, `USE_TESTNET`, `ALLOWED_SYMBOLS`, `CORS_ORIGIN`
- FastAPI 권장 미들웨어: `CORSMiddleware`, 인증 `Depends` 기반 토큰 검증
- 로그 최소화: 요청ID/결과코드만, 민감정보/키/서명/원시응답 저장 금지

### 테스트 케이스(간단)
- 정상: BTCUSDT, 50 USDT, 10x, BUY → 200 + `status: FILLED`
- 경계: `minNotional` 바로 아래/위 → 400 또는 200
- 실패: 미허용 심볼/레버리지 초과/잔고 부족/429 → 해당 상태/코드 반환


