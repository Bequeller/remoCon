[Architect] [Business] [vRule]

### 단계 0: 준비
- **리포/환경**: `.env.sample` 정의(`BINANCE_API_KEY/SECRET`, `AUTH_TOKEN`, `USE_TESTNET=true`, `ALLOWED_SYMBOLS`, `CORS_ORIGIN`)
- **기본 구조**: 단일 프로세스(정적 SPA + Web API) 템플릿 생성
- **백엔드 표준 스택**: Python 3.11 + FastAPI + Uvicorn
- **완료 기준**: 로컬 부팅, `/healthz` 200

### 단계 1: API 계약/표준
- **계약서**: `POST /api/trade`, `GET /api/positions`, 표준 에러 스키마 정의(OpenAPI 또는 간단 스펙 문서)
- **에러 코드**: `MIN_NOTIONAL_VIOLATION`, `INSUFFICIENT_BALANCE`, `RATE_LIMITED` 등 최소 집합
- **완료 기준**: 스키마 문서 확정, 목업 응답 제공

### 단계 2: Binance 연계 기반
- **HTTP 클라이언트**: `BinanceFuturesClient`(HMAC 서명, 테스트넷 토글, 공용 쿼리 파라미터)
- **엔드포인트 래핑**: `exchangeInfo`, `markPrice|premiumIndex`, `leverage`, `order(MARKET)`, `positionRisk`
- **시계 동기화**: 타임스탬프 오프셋 보정
- **완료 기준**: 테스트넷에서 `exchangeInfo`/`markPrice` 통신 성공

### 단계 3: 캐시/레버리지
- **캐시**: `SymbolMetaCache(30s)`, `PriceCache(2s)` TTL 구현
- **레버리지**: `LeverageManager`(심볼별 캐시 5분, 변경 시에만 호출)
- **완료 기준**: 캐시 적중률/TTL 동작 로깅 확인

### 단계 4: 핵심 주문 로직
- **유효성**: whitelist 심볼, notional > 0, leverage ∈ [1,25], side ∈ {BUY, SELL}
- **수량 산출**: `qty = floor((notional/markPrice) to stepSize)` → `minQty/minNotional`/정밀도 검증
- **주문 전 레버리지 동기화**: 상이 시 `POST /leverage` 후 진행
- **주문 생성**: MARKET, `reduceOnly=false`, 응답 표준화
- **완료 기준**: 테스트넷 BTCUSDT 50 USDT 10x BUY → `FILLED`(또는 부분 체결) 정상 반환

### 단계 5: 포지션 조회
- **조회**: `GET /fapi/v2/positionRisk` → `symbol, positionAmt, entryPrice, leverage, unRealizedProfit, marginType` 매핑
- **완료 기준**: 단일 계정 기준 보유 포지션 정규화 리스트 반환

-### 단계 6: 보안/에러/관측
- **인증**: `AuthMiddleware` 단일 토큰(FastAPI `Depends` 기반)
- **에러 처리**: 캐시성 GET 1회 backoff 재시도, 주문 POST 재시도 없음, 코드 매핑
- **로깅**: `access(ts, reqId, route, status, latencyMs)`, `order(reqId, symbol, side, qty, status)`, `error(reqId, code, message)`
- **완료 기준**: 민감정보 미로그 확인, 표준 에러 포맷 적용

### 단계 7: 최소 UI/UX(SPA)
- **상단 입력**: `종목`, `금액(USDT)`, `레버리지(1–25)`, `사이드(BUY/SELL)`
- **중앙 액션**: `[매수]` `[매도]` 버튼(선택 사이드 강조)
- **하단 포지션**: 테이블 + 2초 폴링 인디케이터
- **피드백**: 성공/실패 토스트(간결 사유)
- **완료 기준**: 단일 화면에서 주문/포지션 조회 왕복 동작

### 단계 8: 테스트
- **정상**: BTCUSDT, 50 USDT, 10x, BUY → `FILLED`
- **경계**: `minNotional` 바로 아래/위
- **실패**: 미허용 심볼, 레버리지 범위 초과, 잔고 부족, 429 레이트리밋
- **완료 기준**: 시나리오 통과, p50 < 800ms(네트워크 제외) 목표 확인

### 단계 9: 배포/운영
- **배포**: 테스트넷 기본, 제한된 `CORS_ORIGIN`
- **헬스체크**: `/healthz`(프로세스/시계/환경 변수 점검)
- **런북**: 레버리지 실패/레이트리밋/외부 장애 대응 가이드
- **완료 기준**: 단일 바이너리/컨테이너로 기동, 테스트넷 운영 시작

### 단계 10: 컷오버 체크리스트
- **보안**: 환경변수/키 분리, HTTPS 종단 확인
- **성능**: 커넥션 재사용, 캐시 히트율 점검
- **유지보수**: 모듈 책임(SRP) 검토, 명명/린트 통과
- **완료 기준**: 체크리스트 all green

### 공통 규범(작업 단위)
- 작은 변경 → 검증 → 짧은 요약(변경 영향: 성능/보안/유지보수 1줄)
- 불필요 기능 배제, 재사용/통합 우선, 병렬 탐색·검증 적용