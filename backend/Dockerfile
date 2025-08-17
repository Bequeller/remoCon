# Multi-stage build for RemoCon Futures Trading App
FROM python:3.11-slim as builder

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 설치
COPY pyproject.toml .
RUN pip install --no-cache-dir --user .

# 프로덕션 스테이지
FROM python:3.11-slim

# 작업 디렉토리 설정
WORKDIR /app

# 빌드 스테이지에서 Python 패키지 복사
COPY --from=builder /root/.local /root/.local

# 환경 변수 설정
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# 애플리케이션 코드 복사
COPY app/ ./app/

# 포트 노출
EXPOSE 3000

# 헬스체크
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import httpx; import asyncio; import sys; response = asyncio.run(httpx.AsyncClient().get('http://localhost:3000/healthz')); sys.exit(0 if response.status_code == 200 else 1)"

# 애플리케이션 실행
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3000"]
