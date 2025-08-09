# Docker 배포 가이드

## 빠른 시작

### 1. 환경변수 설정
```bash
# 환경변수 템플릿 복사
cp env.example .env

# .env 파일을 편집하여 실제 값 입력
nano .env
```

### 2. Docker Compose로 실행 (권장)
```bash
# 빌드 및 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f remocon

# 중지
docker-compose down
```

### 3. 직접 Docker 명령어 사용
```bash
# 이미지 빌드
docker build -t remocon-futures .

# 컨테이너 실행
docker run -d \
  --name remocon \
  -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/log:/app/log \
  remocon-futures
```

## 스크립트 사용

### 빌드 스크립트
```bash
# 기본 빌드 (latest 태그)
./scripts/docker-build.sh

# 특정 태그로 빌드
./scripts/docker-build.sh v1.0.0
```

### 실행 스크립트
```bash
# Docker Compose로 실행
./scripts/docker-run.sh
```

## 접속 확인

- **웹 인터페이스**: http://localhost:3000
- **헬스체크**: http://localhost:3000/healthz
- **API 문서**: http://localhost:3000/docs

## 환경변수 설정

### 필수 환경변수
- `BINANCE_API_KEY`: Binance API 키
- `BINANCE_API_SECRET`: Binance API 시크릿
- `AUTH_TOKEN`: API 인증 토큰

### 선택적 환경변수
- `USE_TESTNET=true`: 테스트넷 사용 (기본값: true)
- `CORS_ORIGIN=http://localhost:3000`: CORS 설정
- `ALLOWED_SYMBOLS=BTCUSDT,ETHUSDT`: 허용 심볼
- `LOG_LEVEL=INFO`: 로그 레벨

## 보안 주의사항

1. **API 키 보안**
   - Futures 거래 권한만 부여
   - IP 제한 설정 권장
   - 정기적인 키 순환

2. **네트워크 보안**
   - 프로덕션 환경에서는 리버스 프록시 사용
   - HTTPS 설정 필수
   - 방화벽 설정

3. **환경변수 관리**
   - `.env` 파일을 Git에 커밋하지 말 것
   - 강력한 `AUTH_TOKEN` 설정
   - 환경별 분리 관리

## 모니터링

### 로그 확인
```bash
# 실시간 로그
docker-compose logs -f remocon

# 특정 라인 수만 확인
docker-compose logs --tail=100 remocon
```

### 컨테이너 상태 확인
```bash
# 컨테이너 상태
docker-compose ps

# 리소스 사용량
docker stats remocon-futures
```

### 헬스체크
```bash
# 헬스체크 확인
curl http://localhost:3000/healthz
```

## 문제 해결

### 컨테이너가 시작되지 않는 경우
1. 환경변수 설정 확인
2. 포트 충돌 확인 (3000번 포트)
3. 로그 확인: `docker-compose logs remocon`

### API 연결 오류
1. Binance API 키/시크릿 확인
2. 네트워크 연결 상태 확인
3. 테스트넷/메인넷 설정 확인

### 권한 오류
```bash
# 로그 디렉토리 권한 수정
sudo chmod 755 log/
sudo chown -R $USER:$USER log/
```
