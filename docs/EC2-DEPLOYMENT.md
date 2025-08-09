# EC2 배포 가이드 - RemoCon

## 🚀 EC2에서 RemoCon 실행하기

### 1. EC2 인스턴스 설정

#### 인스턴스 사양 권장
- **타입**: t3.micro (프리티어) 또는 t3.small
- **OS**: Ubuntu 22.04 LTS
- **스토리지**: 20GB gp3
- **보안그룹**: HTTP(80), HTTPS(443), Custom(3000) 포트 열기

#### 보안그룹 설정
```
Type        Protocol    Port Range    Source
SSH         TCP         22           My IP
HTTP        TCP         80           0.0.0.0/0
HTTPS       TCP         443          0.0.0.0/0
Custom TCP  TCP         3000         0.0.0.0/0
```

### 2. EC2 초기 설정

#### SSH 접속
```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

#### 시스템 업데이트
```bash
sudo apt update && sudo apt upgrade -y
```

#### Docker 설치
```bash
# Docker 공식 GPG 키 추가
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Docker 저장소 추가
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker 설치
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin -y

# Docker 서비스 시작
sudo systemctl start docker
sudo systemctl enable docker

# 현재 사용자를 docker 그룹에 추가
sudo usermod -aG docker $USER
newgrp docker

# 설치 확인
docker --version
docker compose version
```

#### Git 설치
```bash
sudo apt install git -y
```

### 3. RemoCon 배포

#### 저장소 클론
```bash
cd ~
git clone git@github.com:Bequeller/remoCon.git
# 또는 HTTPS: git clone https://github.com/Bequeller/remoCon.git
cd remoCon
```

#### 환경변수 설정
```bash
# 환경변수 파일 생성
nano .env
```

**.env 파일 내용:**
```bash
# Binance API 설정 (필수)
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_API_SECRET=your_binance_api_secret_here

# 인증 토큰 (필수 - 강력한 비밀번호 사용)
AUTH_TOKEN=your-very-strong-secret-token-here

# 환경 설정
USE_TESTNET=true
CORS_ORIGIN=http://your-ec2-public-ip:3000
ALLOWED_SYMBOLS=BTCUSDT,ETHUSDT,ADAUSDT,SOLUSDT,XRPUSDT
LOG_LEVEL=INFO
```

#### 컨테이너 실행
```bash
# Docker Compose로 실행
docker compose up -d

# 로그 확인
docker compose logs -f remocon
```

### 4. 서비스 상태 확인

#### 헬스체크
```bash
curl http://localhost:3000/healthz
```

#### 웹 브라우저 접속
```
http://your-ec2-public-ip:3000/app/
```

### 5. 도메인 연결 (선택사항)

#### Nginx 설치 및 설정
```bash
sudo apt install nginx -y

# Nginx 설정 파일 생성
sudo nano /etc/nginx/sites-available/remocon
```

**Nginx 설정 내용:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Nginx 활성화
```bash
sudo ln -s /etc/nginx/sites-available/remocon /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 6. SSL 인증서 설정 (권장)

#### Certbot 설치
```bash
sudo apt install snapd
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

#### SSL 인증서 발급
```bash
sudo certbot --nginx -d your-domain.com
```

### 7. 자동 시작 설정

#### Systemd 서비스 생성
```bash
sudo nano /etc/systemd/system/remocon.service
```

**서비스 파일 내용:**
```ini
[Unit]
Description=RemoCon Futures Trading App
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/remoCon
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

#### 서비스 활성화
```bash
sudo systemctl daemon-reload
sudo systemctl enable remocon.service
sudo systemctl start remocon.service

# 상태 확인
sudo systemctl status remocon.service
```

### 8. 모니터링 및 유지보수

#### 로그 모니터링
```bash
# 실시간 로그 확인
docker compose logs -f remocon

# 시스템 리소스 확인
htop
docker stats
```

#### 업데이트 방법
```bash
cd ~/remoCon
git pull origin main
docker compose down
docker compose build --no-cache
docker compose up -d
```

#### 백업 설정
```bash
# 로그 백업 스크립트 생성
nano ~/backup-logs.sh
```

**백업 스크립트:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d)
tar -czf ~/backups/remocon-logs-$DATE.tar.gz ~/remoCon/log/
find ~/backups/ -name "remocon-logs-*.tar.gz" -mtime +30 -delete
```

```bash
chmod +x ~/backup-logs.sh
mkdir -p ~/backups

# 크론탭 설정 (매일 새벽 2시 백업)
crontab -e
# 추가: 0 2 * * * /home/ubuntu/backup-logs.sh
```

### 9. 보안 강화

#### 방화벽 설정
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
```

#### 자동 보안 업데이트
```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 10. 문제 해결

#### 컨테이너가 시작되지 않는 경우
```bash
# 컨테이너 상태 확인
docker compose ps

# 로그 확인
docker compose logs remocon

# 컨테이너 재시작
docker compose restart remocon
```

#### 포트 충돌 문제
```bash
# 포트 사용 확인
sudo netstat -tlnp | grep :3000

# 프로세스 종료
sudo kill -9 <PID>
```

#### 디스크 공간 부족
```bash
# Docker 정리
docker system prune -a

# 로그 파일 정리
sudo journalctl --vacuum-time=7d
```

### 11. 비용 최적화

#### EC2 인스턴스 스케줄링
- **개발/테스트**: 필요시에만 인스턴스 시작
- **운영**: Reserved Instance 또는 Savings Plans 고려
- **모니터링**: CloudWatch로 리소스 사용량 추적

#### 스토리지 최적화
```bash
# 불필요한 Docker 이미지 정리
docker image prune -a

# 로그 로테이션 설정
sudo nano /etc/logrotate.d/remocon
```

---

## 🔧 원클릭 배포 스크립트

전체 과정을 자동화하는 스크립트:

```bash
#!/bin/bash
# deploy-ec2.sh

# Docker 설치
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 저장소 클론
git clone https://github.com/Bequeller/remoCon.git
cd remoCon

# 환경변수 설정 (사용자 입력 필요)
echo "Please configure your .env file:"
cp env.example .env
nano .env

# 서비스 시작
docker compose up -d

echo "RemoCon deployed successfully!"
echo "Access: http://$(curl -s ifconfig.me):3000/app/"
```

**사용법:**
```bash
curl -fsSL https://raw.githubusercontent.com/Bequeller/remoCon/main/scripts/deploy-ec2.sh | bash
```
