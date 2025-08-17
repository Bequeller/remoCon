# intent: Vite React 앱을 위한 멀티스테이지 Dockerfile - 빌드 최적화 및 정적 서빙

# 빌드 스테이지
FROM node:18-alpine AS builder

WORKDIR /app

# 패키지 파일 복사 및 의존성 설치
COPY package*.json ./
RUN npm ci --only=production=false

# 소스 코드 복사 및 빌드
COPY . .
RUN npm run build

# 프로덕션 스테이지
FROM node:18-alpine AS production

WORKDIR /app

# 빌드된 파일 복사
COPY --from=builder /app/dist ./dist

# 정적 서버 설치
RUN npm install -g serve

# 포트 노출
EXPOSE 3000

# 정적 파일 서빙
CMD ["serve", "-s", "dist", "-l", "3000"]
