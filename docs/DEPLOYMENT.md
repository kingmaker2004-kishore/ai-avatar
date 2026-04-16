# Deployment Guide

Complete instructions for deploying AI Avatar to production environments.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Frontend Build](#frontend-build)
4. [Backend Deployment](#backend-deployment)
5. [Database Setup](#database-setup)
6. [Secrets Management](#secrets-management)
7. [Reverse Proxy Setup](#reverse-proxy-setup)
8. [Monitoring & Logging](#monitoring--logging)
9. [Security Considerations](#security-considerations)
10. [Scaling](#scaling)

---

## Pre-Deployment Checklist

Before deploying to production:

- [ ] All environment variables configured (no hardcoded secrets)
- [ ] `.env` file NOT committed to git (in .gitignore)
- [ ] Frontend built and tested: `npm run build`
- [ ] Backend starts without errors: `npm start`
- [ ] All API endpoints tested in production mode
- [ ] Database initialized and migrated
- [ ] HTTPS enabled (SSL/TLS certificate)
- [ ] Groq API key is valid and not rate-limited
- [ ] HeyGen API key (if using avatar) is valid
- [ ] Session secret rotated (not development default)
- [ ] CORS origin configured correctly
- [ ] Reverse proxy configured (nginx/Apache)
- [ ] Logging configured
- [ ] Backups automated for database

---

## Environment Setup

### Production Server Requirements

- **OS**: Linux (Ubuntu 20.04+ recommended) or Windows Server
- **Node.js**: v16+ (v18+ recommended)
- **npm**: v8+
- **RAM**: 4GB+ (2GB minimum)
- **Disk**: 20GB+ (varies by usage/database size)
- **Network**: 25+ Mbps (for API latency)
- **SSL/TLS**: Valid HTTPS certificate

### Install Node.js on Production Server

**Ubuntu/Debian**:
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # Verify v18+
```

**CentOS/RHEL**:
```bash
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

---

## Frontend Build

### Build for Production

```bash
# In project root
npm run build
```

This creates optimized, minified files in the `dist/` folder:
- HTML, CSS, JavaScript files
- Optimized bundle size
- Source maps (optional, for debugging)

### Build Output

```
dist/
├── index.html        (Entry point)
├── assets/
│   ├── index-*.js    (Main bundle)
│   ├── vendor-*.js   (Dependencies)
│   └── style-*.css   (Styles)
└── models/           (Static models, if in public/)
```

### Verify Build

```bash
# Check file sizes
du -sh dist/
du -h dist/assets/*

# Quick serve to test (optional)
npx http-server dist -p 8080
# Visit http://localhost:8080
```

### Build Configuration

The build is configured in `vite.config.ts`:

```typescript
export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: false,        // Set to true for production debugging
    minify: 'terser',
    target: 'esnext'
  }
})
```

---

## Backend Deployment

### Deploy Backend Application

#### Option 1: Node.js Direct (Simplest)

```bash
# 1. SSH into production server
ssh user@production-server.com

# 2. Clone repository
git clone https://github.com/kingmaker2004-kishore/ai-avatar.git
cd ai-avatar/backend

# 3. Install dependencies
npm install --production

# 4. Start backend (in screen/tmux session)
screen -S backend
npm start

# Detach from screen: Ctrl+A, then D
# Reattach: screen -r backend
```

#### Option 2: Process Manager (pm2)

Recommended for reliability and auto-restart:

```bash
# Install pm2 globally
npm install -g pm2

# Navigate to backend
cd backend

# Start with pm2
pm2 start npm --name "ai-avatar-backend" -- start

# Configure to start on boot
pm2 startup
pm2 save

# Monitor
pm2 logs ai-avatar-backend  # View logs
pm2 status                  # View status
pm2 restart ai-avatar-backend  # Restart
```

#### Option 3: systemd Service

For managed, logging-enabled deployment:

**Create file**: `/etc/systemd/system/ai-avatar-backend.service`

```ini
[Unit]
Description=AI Avatar Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ai-avatar/backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5s
StandardOutput=journal
StandardError=journal

Environment="NODE_ENV=production"
EnvironmentFile=/var/www/ai-avatar/backend/.env

[Install]
WantedBy=multi-user.target
```

Setup:
```bash
sudo systemctl daemon-reload
sudo systemctl enable ai-avatar-backend
sudo systemctl start ai-avatar-backend
sudo systemctl status ai-avatar-backend
journalctl -u ai-avatar-backend -f  # View logs
```

### Backend Port Configuration

By default, backend runs on port 5000. For production:

**Option A**: Keep port 5000 (behind reverse proxy)
```env
PORT=5000
```

**Option B**: Use custom port
```env
PORT=3000
```

---

## Database Setup

### Initialize Production Database

The SQLite database is initialized automatically on first run. However, you can manually initialize:

```bash
cd backend
node db/index.js
```

This creates `ai.db` in the backend folder and runs schema from `db/schema.sql`.

### Database Location

- **Development**: `backend/ai.db` (local temp folder)
- **Production**: `/var/lib/ai-avatar/ai.db` (persistent volume)

### Production Database Configuration

Create persistent location:

```bash
sudo mkdir -p /var/lib/ai-avatar
sudo chown www-data:www-data /var/lib/ai-avatar
sudo chmod 755 /var/lib/ai-avatar
```

In `backend/.env`:
```env
DATABASE_PATH=/var/lib/ai-avatar/ai.db
```

Update `backend/db/index.js` if using custom path:
```javascript
const db = new Database(process.env.DATABASE_PATH || './ai.db')
```

### Backup Database

Automated daily backup:

```bash
#!/bin/bash
# File: /usr/local/bin/backup-ai-avatar.sh

BACKUP_DIR="/var/backups/ai-avatar"
DB_PATH="/var/lib/ai-avatar/ai.db"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp $DB_PATH $BACKUP_DIR/ai_db_$DATE.db
gzip $BACKUP_DIR/ai_db_$DATE.db

# Keep only last 7 days
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
```

Add to crontab:
```bash
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-ai-avatar.sh
```

---

## Secrets Management

### Environment Variables

Never commit `.env` to git. Environment variables should be set on the server.

**Create `.env` on production server**:

```bash
# Create file
sudo nano /var/www/ai-avatar/backend/.env

# Add content
PORT=5000
NODE_ENV=production
GROQ_API_KEY=gsk_XXXXXXXXXXXX
LIVEAVATAR_API_KEY=XXXXXXXXXXXX
SESSION_SECRET=<random-secret-from-command-below>
LIVEAVATAR_AVATAR_ID=XXXXXXXXXXXX
LIVEAVATAR_VOICE_ID=XXXXXXXXXXXX
DATABASE_PATH=/var/lib/ai-avatar/ai.db
```

Generate secure session secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Secrets Storage Options

#### Option 1: Environment Variables on Server

Set in shell profile or systemd service:
```bash
export GROQ_API_KEY="your_key"
```

#### Option 2: Secret Management Service

Use services like:
- **AWS Secrets Manager** (if on AWS)
- **HashiCorp Vault** (enterprise)
- **Kubernetes Secrets** (if using K8s)

#### Option 3: .env File (Simple but NOT Recommended for Production)

Only if server is fully secured and .env is not in git:
```bash
# Set permissions
chmod 600 /var/www/ai-avatar/backend/.env
sudo chown www-data:www-data /var/www/ai-avatar/backend/.env
```

---

## Reverse Proxy Setup

The frontend and backend should be behind a reverse proxy for:
- SSL/TLS termination
- Load balancing
- URL rewriting
- Security headers

### nginx Configuration

**file**: `/etc/nginx/sites-available/ai-avatar`

```nginx
# Redirect HTTP to HTTPS
server {
  listen 80;
  listen [::]:80;
  server_name ai-avatar.example.com;
  
  return 301 https://ai-avatar.example.com$request_uri;
}

# HTTPS server
server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name ai-avatar.example.com;

  # SSL certificates (e.g., from Let's Encrypt)
  ssl_certificate /etc/letsencrypt/live/ai-avatar.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/ai-avatar.example.com/privkey.pem;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;

  # Serve frontend from dist/
  root /var/www/ai-avatar/dist;
  index index.html;

  # Frontend files
  location / {
    try_files $uri $uri/ /index.html;  # React SPA routing
  }

  # API proxy to backend
  location /api {
    proxy_pass http://localhost:5000;  # Backend
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # Timeouts for slow APIs (Groq)
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }

  # Health check
  location /health {
    proxy_pass http://localhost:5000/health;
  }

  # Static assets caching
  location /assets {
    expires 30d;
    add_header Cache-Control "public, immutable";
  }

  # Deny access to hidden files
  location ~ /\. {
    deny all;
  }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/ai-avatar /etc/nginx/sites-enabled/
sudo nginx -t  # Test config
sudo systemctl restart nginx
```

### SSL Certificate (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d ai-avatar.example.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Monitoring & Logging

### Application Logging

#### Backend Logs (if using systemd)

```bash
journalctl -u ai-avatar-backend -f  # Follow logs
journalctl -u ai-avatar-backend --since "2 hours ago"  # Last 2 hours
```

#### Backend Logs (if using pm2)

```bash
pm2 logs ai-avatar-backend
pm2 logs ai-avatar-backend --lines 100
```

### System Monitoring

**Install and configure monitoring tools**:

```bash
# Memory/CPU monitoring
htop
free -h
df -h

# Network monitoring
netstat -tuln | grep 5000  # Check if backend port is open
```

Create monitoring script:

```bash
#!/bin/bash
# File: /usr/local/bin/monitor-ai-avatar.sh

echo "=== AI Avatar Status ==="
echo "Backend service:"
systemctl status ai-avatar-backend --no-pager
echo ""
echo "Port 5000 listening:"
netstat -tuln | grep 5000
echo ""
echo "API health check:"
curl -s http://localhost:5000/health | jq .
echo ""
echo "Database:"
ls -lh /var/lib/ai-avatar/ai.db
```

Run periodically:
```bash
*/5 * * * * /usr/local/bin/monitor-ai-avatar.sh >> /var/log/ai-avatar-monitor.log 2>&1
```

---

## Security Considerations

### HTTPS/SSL

- [ ] Use valid SSL certificate (Let's Encrypt recommended)
- [ ] Force HTTPS redirect (HTTP → HTTPS)
- [ ] Set HSTS header

### API Security

- [ ] Validate all user inputs
- [ ] Rate limit API endpoints
- [ ] Add authentication if needed (tokens, sessions)
- [ ] Sanitize responses

### Secrets

- [ ] Never commit `.env` to git
- [ ] Rotate API keys regularly
- [ ] Use strong, random session secrets
- [ ] Restrict file permissions on `.env`

### CORS Configuration

In `backend/server.js`, configure CORS for production:

```javascript
const cors = require('cors')

app.use(cors({
  origin: ['https://ai-avatar.example.com'],  // Only your domain
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}))
```

### Firewall

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 5000/tcp  # Backend (if not proxied)
sudo ufw enable
```

---

## Scaling

### Multiple Backend Instances

For high traffic, run multiple backend processes behind a load balancer:

```bash
# Using pm2 cluster mode
pm2 start npm --name "ai-avatar-backend" -i max -- start
```

Update nginx to load balance:

```nginx
upstream backend {
  server localhost:5000;
  server localhost:5001;
  server localhost:5002;
}

location /api {
  proxy_pass http://backend;
}
```

### Database Scaling

SQLite is single-process. For production scaling:

- **SQLite**: Good for < 100 concurrent users
- **PostgreSQL**: For larger deployments
- **Redis**: For session caching

---

## Troubleshooting Deployment

### Backend won't start

```bash
# Check error
pm2 logs ai-avatar-backend

# Verify environment variables
echo $GROQ_API_KEY
echo $PORT

# Check port available
netstat -tuln | grep 5000
```

### API not responding

```bash
# Test backend directly
curl http://localhost:5000/health

# Check reverse proxy config
sudo nginx -t
```

### Database locked

```bash
# Stop application
systemctl stop ai-avatar-backend

# Check connections
lsof /var/lib/ai-avatar/ai.db

# Delete lock file if needed
rm /var/lib/ai-avatar/ai.db-wal
rm /var/lib/ai-avatar/ai.db-shm

# Restart
systemctl start ai-avatar-backend
```

---

## Next Steps

After successful deployment:

1. Monitor application health regularly
2. Set up automated backups
3. Update security patches
4. Scale as needed
5. Gather user feedback

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more issues.
