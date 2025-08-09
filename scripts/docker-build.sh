#!/bin/bash
# Docker 빌드 스크립트 - RemoCon Futures Trading App

set -e

echo "🐳 Building RemoCon Docker Image..."

# 이미지 태그 설정
IMAGE_NAME="remocon-futures"
TAG="${1:-latest}"
FULL_TAG="${IMAGE_NAME}:${TAG}"

echo "📦 Building image: ${FULL_TAG}"

# Docker 이미지 빌드
docker build -t "${FULL_TAG}" .

echo "✅ Build completed successfully!"
echo "📋 Image: ${FULL_TAG}"
echo ""
echo "🚀 To run the container:"
echo "   docker run -p 3000:3000 ${FULL_TAG}"
echo ""
echo "🛠️  Or use docker-compose:"
echo "   docker-compose up -d"
