# RemoCon - Binance Futures Trading Remote Controller

<div align="center">
  <img src="public/assets/binance-logo.svg" alt="RemoCon Logo" width="64" height="64">
  <h3>Binance Futures RemoCon</h3>
  <p>Binance Futures 원클릭 매수/매도 + 포지션 모니터링</p>
</div>

## 🎯 서비스 개요

**RemoCon**은 Binance Futures 거래를 위한 단순하고 효율적인 웹 기반 리모트 컨트롤러입니다.

### 핵심 기능
- **원클릭 거래**: 매수/매도 버튼 클릭만으로 즉시 시장가 주문 실행
- **실시간 포지션**: 현재 보유 포지션 실시간 모니터링 (2초 폴링)
- **자동 로깅**: 모든 거래 내역 자동 CSV 저장 및 다운로드
- **한글 UI**: 직관적인 한국어 인터페이스
- **모의거래**: 실제 거래 전 안전한 테스트 환경

### 기술 스택
- **Backend**: Python 3.11 + FastAPI + Uvicorn
- **Frontend**: Vanilla JavaScript + CSS3 (SPA)
- **배포**: Docker + Docker Compose
- **API**: Binance Futures REST API

## 🚀 빠른 시작

### 1. Docker로 실행 (권장)

```bash
# 저장소 클론
git clone git@github.com:Bequeller/remoCon.git
cd remoCon

# 환경변수 설정
cp env.example .env
nano .env  # API 키 입력

# Docker Compose로 실행
docker-compose up -d

# 웹 브라우저에서 접속
open http://localhost:3000/app/
```

### 2. 직접 실행

```bash
# 의존성 설치
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 환경변수 설정
export BINANCE_API_KEY="your_api_key"
export BINANCE_API_SECRET="your_api_secret"
export AUTH_TOKEN="your_auth_token"
export USE_TESTNET="true"

# 서버 시작
uvicorn app.main:app --host 0.0.0.0 --port 3000

# 접속: http://localhost:3000/app/
```

## ⚙️ 환경 설정

### 필수 환경변수

```bash
# Binance API 설정 (필수)
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_API_SECRET=your_binance_api_secret_here

# 인증 토큰 (필수)
AUTH_TOKEN=your-very-strong-secret-token-here

# 환경 설정
USE_TESTNET=true                    # true: 테스트넷, false: 메인넷
CORS_ORIGIN=http://localhost:3000   # CORS 허용 도메인
ALLOWED_SYMBOLS=BTCUSDT,ETHUSDT     # 거래 허용 심볼
LOG_LEVEL=INFO                      # 로그 레벨
```

### Binance API 키 설정
1. [Binance](https://www.binance.com) 로그인
2. API Management → Create API
3. **Futures 거래 권한만** 활성화
4. **IP 제한** 설정 권장
5. 테스트넷에서 충분히 테스트 후 메인넷 사용

## 📱 사용 방법

### 기본 거래 흐름

1. **심볼 선택**: 드롭다운에서 거래할 암호화폐 선택
2. **금액 설정**: 거래할 금액 비율(%) 입력
3. **레버리지**: 슬라이더로 1x~25x 레버리지 조정
4. **매수/매도**: 큰 버튼 클릭으로 즉시 주문 실행
5. **포지션 확인**: 하단 테이블에서 실시간 포지션 모니터링

### 주요 기능

#### 💹 거래 실행
- **매수 버튼**: 🟢 설정한 비율만큼 롱 포지션 진입
- **매도 버튼**: 🔴 설정한 비율만큼 숏 포지션 진입 또는 청산
- **즉시 실행**: 시장가 주문으로 즉시 체결
- **토스트 알림**: 거래 성공/실패 즉시 알림

#### 📊 포지션 모니터링
- **실시간 업데이트**: 2초마다 자동 새로고침
- **미실현 PnL**: 실시간 손익 계산
- **포지션 정보**: 심볼, 수량, 진입가, 레버리지 표시
- **청산 기능**: 🔴 버튼으로 개별 포지션 청산

#### 📋 로그 관리
- **자동 저장**: 매수/매도 시 자동으로 CSV 파일 저장
- **일별 파일**: 하루에 하나의 로그 파일 생성
- **다운로드**: 테이블 더블클릭으로 오늘 로그 다운로드
- **서버 저장**: 로컬이 아닌 서버 log 디렉토리에 저장

## 🛡️ 보안 주의사항

### ⚠️ 중요 경고
- **테스트넷 먼저**: 반드시 테스트넷에서 충분히 테스트
- **메인넷 주의**: 실제 자금 거래 시 각별한 주의 필요
- **API 키 보안**: API 키를 절대 공유하지 말 것

### 보안 권장사항
1. **권한 최소화**: Futures 거래 권한만 활성화
2. **IP 제한**: 특정 IP에서만 접근 가능하도록 설정
3. **강력한 토큰**: AUTH_TOKEN을 복잡하게 설정
4. **HTTPS 사용**: 프로덕션에서는 HTTPS 필수
5. **정기 순환**: API 키 정기적 교체

## 📁 프로젝트 구조

```
RemoCon/
├── app/                    # FastAPI 백엔드
│   ├── main.py            # 메인 애플리케이션
│   ├── clients/           # Binance API 클라이언트
│   ├── config.py          # 환경 설정
│   └── ...
├── public/                # 프론트엔드 정적 파일
│   ├── index.html         # 메인 페이지
│   ├── scripts/           # JavaScript 모듈
│   ├── styles/            # CSS 스타일
│   └── assets/            # 이미지, 아이콘
├── log/                   # 거래 로그 저장
├── docker-compose.yml     # Docker Compose 설정
├── Dockerfile            # Docker 이미지 정의
└── requirements.txt      # Python 의존성
```

## 🔧 개발 및 배포

### 로컬 개발
```bash
# 개발 서버 실행
./scripts/serve.sh

# Docker 빌드
./scripts/docker-build.sh

# Docker 실행
./scripts/docker-run.sh
```

### 헬스체크
```bash
# 서버 상태 확인
curl http://localhost:3000/healthz

# API 문서 확인
open http://localhost:3000/docs
```

## 📝 API 문서

### 주요 엔드포인트
- `GET /healthz` - 서버 상태 및 Binance 연결 확인
- `POST /api/trade` - 거래 주문 실행
- `GET /api/positions` - 현재 포지션 조회
- `POST /api/save-log` - 거래 로그 저장
- `GET /api/download-log/{filename}` - 로그 파일 다운로드

### 상세 API 문서
서버 실행 후 [http://localhost:3000/docs](http://localhost:3000/docs)에서 확인

## 🐛 문제 해결

### 자주 묻는 질문

**Q: 주문이 실행되지 않아요**
- API 키/시크릿 확인
- 테스트넷/메인넷 설정 확인
- 네트워크 연결 상태 확인

**Q: 포지션이 업데이트되지 않아요**
- 페이지 새로고침 시도
- 헬스체크에서 Binance 연결 상태 확인

**Q: 로그 다운로드가 안 돼요**
- 오늘 거래 내역이 있는지 확인
- 서버 log 디렉토리 권한 확인

### 로그 확인
```bash
# Docker 로그
docker-compose logs -f remocon

# 거래 로그 위치
ls -la log/
```

## 📄 라이선스

이 프로젝트는 개인 및 교육 목적으로만 사용됩니다.

## ⚠️ 면책 조항

- 이 소프트웨어는 교육 및 개인 사용 목적으로 제공됩니다
- 실제 거래에서 발생하는 손실에 대해 개발자는 책임지지 않습니다
- 사용자의 책임 하에 신중하게 사용하시기 바랍니다
- 투자 결정은 항상 본인의 판단과 책임 하에 이루어져야 합니다

---

<div align="center">
  <p>⚡ Made with FastAPI & Vanilla JavaScript</p>
  <p>🔒 Always trade responsibly</p>
</div>
