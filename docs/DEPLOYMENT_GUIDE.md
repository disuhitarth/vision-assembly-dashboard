# 🚀 Production Deployment Guide

## Overview

This guide covers deploying the Industrial Vision Dashboard to production environments with real hardware integration.

---

## 🏭 Production Architecture

### Recommended Infrastructure
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Web Servers   │    │   Database      │
│   (nginx)       │◄──►│   (Node.js)     │◄──►│   (TimescaleDB) │
│                 │    │   Multiple      │    │   + Redis       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │   Industrial    │              │
         └──────────────►│   Network       │◄─────────────┘
                        │   • PLC         │
                        │   • Vision      │
                        │   • Sensors     │
                        └─────────────────┘
```

---

## 🔧 Environment Setup

### Production Server Requirements
- **OS:** Linux (Ubuntu 20.04+ recommended)
- **CPU:** 4+ cores (8+ for high throughput)
- **RAM:** 8GB+ (16GB+ recommended)
- **Storage:** 100GB+ SSD
- **Network:** Gigabit Ethernet
- **Node.js:** 18.x LTS

### Industrial Network Requirements
- **PLC Network:** Isolated VLAN (192.168.1.0/24)
- **Vision Network:** Dedicated segment for cameras
- **Firewall Rules:** Restricted access to industrial devices
- **Network Monitoring:** SNMP monitoring for all devices

---

## 🐳 Docker Deployment

### Production Docker Compose
```yaml
version: '3.8'

services:
  # TimescaleDB for time-series data
  postgres:
    image: timescale/timescaledb:latest-pg15
    environment:
      POSTGRES_DB: vision_production
      POSTGRES_USER: vision_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init:/docker-entrypoint-initdb.d/
    ports:
      - "5432:5432"
    restart: unless-stopped

  # Redis for caching and sessions
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped

  # Backend API
  api:
    build:
      context: .
      dockerfile: Dockerfile.production
    environment:
      NODE_ENV: production
      MODE: live
      DATABASE_URL: postgresql://vision_user:${DB_PASSWORD}@postgres:5432/vision_production
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
      
      # PLC Configuration
      PLC_HOST: ${PLC_HOST}
      PLC_SLOT: ${PLC_SLOT}
      PLC_RACK: ${PLC_RACK}
      
      # Vision System
      KEYENCE_IP: ${KEYENCE_IP}
      KEYENCE_PORT: ${KEYENCE_PORT}
      
      # Security
      CORS_ORIGIN: https://your-domain.com
      
    ports:
      - "4000:4000"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend (if serving from same server)
  web:
    build:
      context: ./frontend
      dockerfile: Dockerfile.production
    ports:
      - "3000:80"
    depends_on:
      - api
    restart: unless-stopped

  # Prometheus monitoring
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    restart: unless-stopped

  # Grafana dashboards
  grafana:
    image: grafana/grafana:latest
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana:/etc/grafana/provisioning
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  prometheus_data:
  grafana_data:

networks:
  default:
    driver: bridge
  industrial:
    driver: bridge
    ipam:
      config:
        - subnet: 192.168.1.0/24
```

### Production Dockerfile
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime

# Install production dependencies
RUN apk add --no-cache \
    curl \
    postgresql-client \
    redis \
    && rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S app && \
    adduser -S app -u 1001

WORKDIR /app

# Copy application files
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Set ownership and permissions
RUN chown -R app:app /app
USER app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

EXPOSE 4000

CMD ["node", "src/main.js"]
```

---

## ⚙️ Configuration Management

### Environment Variables (.env.production)
```bash
# Application
NODE_ENV=production
MODE=live

# Database  
DATABASE_URL=postgresql://vision_user:STRONG_PASSWORD@postgres:5432/vision_production
REDIS_URL=redis://:STRONG_PASSWORD@redis:6379

# Security
JWT_SECRET=your-ultra-secure-jwt-secret-key-256-bits-minimum
CORS_ORIGIN=https://your-domain.com
SESSION_TIMEOUT=3600

# Industrial Hardware
PLC_HOST=192.168.1.100
PLC_SLOT=0
PLC_RACK=1
PLC_TIMEOUT=5000

KEYENCE_IP=192.168.1.101  
KEYENCE_PORT=8501
VISION_TIMEOUT=3000
DEFECT_THRESHOLD=0.75

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_ENABLED=true
LOG_LEVEL=info

# Performance
API_RATE_LIMIT=5000
WS_MAX_CONNECTIONS=1000
CACHE_TTL=300

# Backup
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"
BACKUP_RETENTION=30
```

### Secrets Management
Use Docker Secrets or Kubernetes Secrets for sensitive data:

```yaml
secrets:
  db_password:
    external: true
  jwt_secret:
    external: true
  redis_password:
    external: true
```

---

## 🔐 Security Hardening

### SSL/TLS Configuration (nginx)
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /path/to/certificate.pem;
    ssl_certificate_key /path/to/private-key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Content-Security-Policy "default-src 'self'";

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

### Firewall Rules (ufw)
```bash
# Basic firewall setup
ufw default deny incoming
ufw default allow outgoing

# SSH access
ufw allow from YOUR_IP_RANGE to any port 22

# HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Industrial network access only
ufw allow from 192.168.1.0/24 to any port 4000
ufw allow from 192.168.1.0/24 to any port 5432

# Monitoring (restricted)
ufw allow from MONITORING_IP to any port 9090
ufw allow from MONITORING_IP to any port 3001

ufw enable
```

---

## 📊 Database Setup

### TimescaleDB Initialization
```sql
-- Create database
CREATE DATABASE vision_production;

-- Connect to database
\c vision_production;

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- Create tables
CREATE TABLE parts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) NOT NULL,
    batch VARCHAR(50) NOT NULL,
    station INTEGER NOT NULL,
    result VARCHAR(20) NOT NULL,
    cycle_time_ms INTEGER NOT NULL,
    quality_score FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE defects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_id UUID REFERENCES parts(id),
    frame_id UUID,
    class VARCHAR(50) NOT NULL,
    confidence FLOAT NOT NULL,
    station INTEGER NOT NULL,
    disposition VARCHAR(20) DEFAULT 'pending',
    bounding_box JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alarms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    station INTEGER,
    status VARCHAR(20) DEFAULT 'active',
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMPTZ,
    cleared_at TIMESTAMPTZ,
    context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertables for time-series optimization
SELECT create_hypertable('parts', 'created_at');
SELECT create_hypertable('defects', 'created_at');
SELECT create_hypertable('alarms', 'created_at');

-- Create indexes
CREATE INDEX idx_parts_batch ON parts(batch);
CREATE INDEX idx_parts_station_time ON parts(station, created_at);
CREATE INDEX idx_defects_class ON defects(class);
CREATE INDEX idx_alarms_status ON alarms(status);

-- Data retention policy (keep 1 year)
SELECT add_retention_policy('parts', INTERVAL '365 days');
SELECT add_retention_policy('defects', INTERVAL '365 days');
SELECT add_retention_policy('alarms', INTERVAL '365 days');
```

---

## 🏭 Hardware Integration

### Allen-Bradley PLC Setup
```javascript
// Production PLC driver configuration
const plcConfig = {
  host: process.env.PLC_HOST,
  slot: parseInt(process.env.PLC_SLOT),
  rack: parseInt(process.env.PLC_RACK),
  timeout: parseInt(process.env.PLC_TIMEOUT),
  
  // Connection pool settings
  maxConnections: 5,
  retryInterval: 5000,
  maxRetries: 3,
  
  // Tag scanning configuration
  scanRate: 100, // milliseconds
  tagGroups: {
    critical: ['Line.State', 'Emergency.Stop'],
    production: ['Part.Counter', 'Station01.CycleTimeMs'],
    process: ['Process.Temperature', 'Process.Pressure']
  }
};
```

### Keyence Vision System Setup
```javascript
// Vision system configuration
const visionConfig = {
  cameras: [
    {
      ip: process.env.KEYENCE_IP,
      port: parseInt(process.env.KEYENCE_PORT),
      station: 1,
      model: 'CV-X200F'
    }
  ],
  
  // Image processing settings  
  imageFormat: 'JPEG',
  imageQuality: 85,
  captureTimeout: 3000,
  
  // AI model settings
  modelPath: './models/production-defect-detection.onnx',
  inputSize: [640, 640],
  confidenceThreshold: parseFloat(process.env.DEFECT_THRESHOLD),
  nmsThreshold: 0.45
};
```

---

## 📈 Monitoring & Alerting

### Prometheus Metrics
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'vision-dashboard'
    static_configs:
      - targets: ['api:4000']
    metrics_path: '/metrics'
    scrape_interval: 10s

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

rule_files:
  - "rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Alerting Rules
```yaml
# rules/vision-alerts.yml
groups:
  - name: vision-dashboard
    rules:
      - alert: HighDefectRate
        expr: defect_rate > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High defect rate detected"
          
      - alert: PLCConnectionLost
        expr: plc_connection_status == 0
        for: 30s
        labels:
          severity: critical
        annotations:
          summary: "PLC connection lost"
          
      - alert: VisionSystemDown
        expr: vision_system_status == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Vision system offline"
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  release:
    types: [published]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:e2e

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: docker/build-push-action@v3
        with:
          context: .
          file: ./Dockerfile.production
          push: true
          tags: |
            vision-dashboard:latest
            vision-dashboard:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to production
        run: |
          # SSH to production server and update deployment
          ssh ${{ secrets.PROD_SERVER }} "
            cd /opt/vision-dashboard &&
            docker-compose pull &&
            docker-compose up -d --remove-orphans &&
            docker system prune -f
          "
```

---

## 📦 Backup & Recovery

### Automated Backup Script
```bash
#!/bin/bash
# backup-production.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/vision-dashboard"
S3_BUCKET="your-backup-bucket"

# Database backup
pg_dump $DATABASE_URL | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Application files backup  
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /opt/vision-dashboard

# Upload to S3
aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz s3://$S3_BUCKET/database/
aws s3 cp $BACKUP_DIR/app_$DATE.tar.gz s3://$S3_BUCKET/application/

# Cleanup old local backups (keep 7 days)
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
```

### Recovery Procedure
```bash
# Stop services
docker-compose down

# Restore database
gunzip -c backup.sql.gz | psql $DATABASE_URL

# Restore application
tar -xzf app_backup.tar.gz -C /

# Start services
docker-compose up -d
```

---

## 🔍 Troubleshooting

### Common Issues

#### High Memory Usage
```bash
# Monitor memory usage
docker stats

# Check Node.js heap
curl http://localhost:4000/api/health/memory
```

#### Database Performance
```sql
-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC LIMIT 10;

-- Check connection count
SELECT count(*) FROM pg_stat_activity;
```

#### Network Connectivity
```bash
# Test PLC connection
telnet $PLC_HOST 44818

# Test vision system
ping $KEYENCE_IP
```

---

## 📞 Support Contacts

### Production Support
- **Primary:** production-support@company.com
- **Escalation:** engineering-team@company.com  
- **Emergency:** +1-xxx-xxx-xxxx

### Hardware Vendors
- **PLC Support:** Allen-Bradley Technical Support
- **Vision Support:** Keyence Applications Engineering
- **Network:** IT Infrastructure Team

---

## 📋 Production Checklist

### Pre-deployment
- [ ] Hardware installation and testing
- [ ] Network configuration and security
- [ ] SSL certificates installed
- [ ] Database setup and optimization
- [ ] Backup systems configured
- [ ] Monitoring and alerting setup

### Post-deployment
- [ ] Smoke tests completed
- [ ] Performance baseline established
- [ ] Monitoring dashboards configured
- [ ] Staff training completed
- [ ] Documentation updated
- [ ] Incident response procedures tested