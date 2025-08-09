#!/bin/bash
# Docker 실행 스크립트 - RemoCon Futures Trading App

set -e

# 환경 변수 파일 체크
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo "⚠️  .env 파일이 없습니다. 샘플 환경변수로 실행합니다."
    echo "📝 프로덕션 사용 시 .env 파일을 생성하고 필수 값들을 설정하세요."
fi

echo "🐳 Starting RemoCon with Docker Compose..."

# Docker Compose로 실행
docker-compose up -d

echo "✅ RemoCon이 시작되었습니다!"
echo ""
echo "🌐 웹 인터페이스: http://localhost:3000"
echo "🔍 헬스체크: http://localhost:3000/healthz"
echo ""
echo "📊 로그 확인:"
echo "   docker-compose logs -f remocon"
echo ""
echo "🛑 중지:"
echo "   docker-compose down"
