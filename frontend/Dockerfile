# intent: Vite React 앱을 위한 멀티스테이지 Dockerfile - 개발 및 프로덕션 환경 지원

# 개발 스테이지
FROM node:20-alpine AS development

WORKDIR /app

# 패키지 파일 복사 및 의존성 설치
COPY package*.json ./
RUN npm ci --only=production=false

# 소스 코드 복사
COPY . .

# 포트 노출
EXPOSE 3000

# 개발 서버 실행 (HMR 지원)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

# 빌드 스테이지
FROM node:20-alpine AS builder

WORKDIR /app

# 패키지 파일 복사 및 의존성 설치
COPY package*.json ./
RUN npm ci --only=production=false

# 소스 코드 복사 및 빌드
COPY . .
RUN npm run build

# 프로덕션 스테이지
FROM node:20-alpine AS production

WORKDIR /app

# 빌드된 파일 복사
COPY --from=builder /app/dist ./dist

# 정적 서버 설치
RUN npm install -g serve

# 포트 노출
EXPOSE 3000

# 정적 파일 서빙
CMD ["serve", "-s", "dist", "-l", "3000"]
