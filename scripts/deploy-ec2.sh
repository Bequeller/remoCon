#!/bin/bash
# RemoCon EC2 자동 배포 스크립트

set -e

echo "🚀 RemoCon EC2 배포를 시작합니다..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 시스템 업데이트
log_info "시스템 업데이트 중..."
sudo apt update && sudo apt upgrade -y

# Docker 설치 확인
if ! command -v docker &> /dev/null; then
    log_info "Docker 설치 중..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    log_info "Docker 설치 완료"
else
    log_info "Docker가 이미 설치되어 있습니다"
fi

# Git 설치 확인
if ! command -v git &> /dev/null; then
    log_info "Git 설치 중..."
    sudo apt install git -y
fi

# RemoCon 저장소 클론
if [ -d "remoCon" ]; then
    log_warn "remoCon 디렉토리가 이미 존재합니다. 업데이트 중..."
    cd remoCon
    git pull origin main
else
    log_info "RemoCon 저장소 클론 중..."
    git clone https://github.com/Bequeller/remoCon.git
    cd remoCon
fi

# 환경변수 파일 확인
if [ ! -f ".env" ]; then
    log_warn ".env 파일이 없습니다. 템플릿을 생성합니다."
    cat > .env << 'EOF'
# Binance API 설정 (필수)
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_API_SECRET=your_binance_api_secret_here

# 인증 토큰 (필수)
AUTH_TOKEN=your-very-strong-secret-token-here

# 환경 설정
USE_TESTNET=true
CORS_ORIGIN=http://localhost
ALLOWED_SYMBOLS=BTCUSDT,ETHUSDT,ADAUSDT,SOLUSDT,XRPUSDT
LOG_LEVEL=INFO
EOF
    
    log_error "⚠️  중요: .env 파일을 편집하여 실제 API 키를 입력하세요!"
    log_error "편집 명령어: nano .env"
    read -p "Enter를 눌러 .env 파일을 편집하세요..." -r
    nano .env
fi

# Docker 그룹 적용 (새 세션에서)
if ! groups $USER | grep -q docker; then
    log_info "Docker 그룹 권한을 적용하기 위해 새 세션을 시작합니다..."
    newgrp docker << 'EOFDOCKER'
    
# Docker Compose 실행
log_info "RemoCon 컨테이너 시작 중..."
docker compose up -d

# 컨테이너 상태 확인
sleep 5
if docker compose ps | grep -q "Up"; then
    log_info "✅ RemoCon이 성공적으로 시작되었습니다!"
else
    log_error "❌ 컨테이너 시작에 실패했습니다. 로그를 확인하세요:"
    docker compose logs
    exit 1
fi

EOFDOCKER
else
    # Docker Compose 실행
    log_info "RemoCon 컨테이너 시작 중..."
    docker compose up -d
    
    # 컨테이너 상태 확인
    sleep 5
    if docker compose ps | grep -q "Up"; then
        log_info "✅ RemoCon이 성공적으로 시작되었습니다!"
    else
        log_error "❌ 컨테이너 시작에 실패했습니다. 로그를 확인하세요:"
        docker compose logs
        exit 1
    fi
fi

# 공인 IP 조회
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "localhost")

# 결과 출력
echo ""
echo "🎉 RemoCon 배포 완료!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 웹 접속: http://${PUBLIC_IP}/"
echo "🔍 헬스체크: http://${PUBLIC_IP}/healthz"
echo "📊 API 문서: http://${PUBLIC_IP}/docs"
echo ""
echo "📋 유용한 명령어:"
echo "  로그 확인: docker compose logs -f remocon"
echo "  상태 확인: docker compose ps"
echo "  재시작: docker compose restart"
echo "  중지: docker compose down"
echo ""
echo "⚠️  보안 알림:"
echo "  1. .env 파일의 AUTH_TOKEN을 강력한 비밀번호로 변경하세요"
echo "  2. 테스트넷에서 충분히 테스트 후 메인넷을 사용하세요"
echo "  3. EC2 보안그룹에서 80번 포트(HTTP)를 열어두세요"
echo ""
echo "🔒 항상 책임감 있게 거래하세요!"
