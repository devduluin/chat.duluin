# CI/CD Deployment Guide - Duluin Chat Frontend

## Overview

Proyek ini menggunakan GitHub Actions untuk automated deployment ke server development dan production dengan Docker.

## Architecture

```
GitHub Repository (main branch)
        ↓ (push trigger)
GitHub Actions Workflow
        ↓ (SSH + rsync)
Server (76.13.17.180)
        ↓ (docker compose)
Docker Container (Port 8085)
```

## File Structure

```
duluin_chat_fe/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions workflow
├── Dockerfile                  # Multi-stage Docker build
├── docker-compose.dev.yml      # Development environment config
├── docker-compose.yml          # Production environment config (future)
└── src/                        # Source code
```

## Setup Components

### 1. Dockerfile

Multi-stage build dengan 3 stages:

- **deps**: Install dependencies
- **builder**: Build Next.js application dengan environment variables
- **runner**: Production runtime dengan non-root user

**Key Features:**

- Menerima build arguments untuk environment variables
- Standalone output mode untuk optimized deployment
- Alpine Linux untuk ukuran image minimal
- Non-root user untuk security

### 2. Docker Compose (Development)

File: `docker-compose.dev.yml`

**Environment Variables yang di-inject saat build:**

```yaml
- NEXT_PUBLIC_NODE_ENV=development
- NEXT_PUBLIC_AUTH_API_URL=https://ssodev.duluin.com/api
- NEXT_PUBLIC_GATEWAY_API_URL=https://ssodev.duluin.com/api
- NEXT_PUBLIC_GATEWAY_API_URL_PROD=https://apidev-hrms.duluin.com/api
- NEXT_PUBLIC_WORKSPACE_URL=/
- NEXT_PUBLIC_NLP_SERVICE_URL=http://localhost:5000
```

**Port Mapping:**

- Host: 8085
- Container: 8085

### 3. GitHub Actions Workflow

File: `.github/workflows/deploy.yml`

**Trigger:**

- Push ke branch `main`
- Manual trigger via `workflow_dispatch`

**Steps:**

1. Checkout code
2. Setup SSH dengan private key
3. Copy Dockerfile dan docker-compose.dev.yml ke server
4. Rsync source code ke server (exclude node_modules, .git, dll)
5. Build dan deploy dengan docker compose
6. Verify deployment

**Required GitHub Secrets:**

- `SSH_PRIVATE_KEY`: Private key untuk SSH ke server
- `SERVER_USER`: Username server (default: root)

## Deployment Flow

### Development Server Deployment

**Automatic (Recommended):**

1. Make changes di local
2. Commit dan push ke branch `main`:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```
3. GitHub Actions akan otomatis:
   - Build Docker image dengan env dev
   - Deploy ke server 76.13.17.180:8085
   - Restart container

**Manual (Alternative):**

```bash
# Di server
cd /home/apps/workspaceChatFrontend
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d --build
```

### Environment Variables Management

**PENTING:** Environment variables dengan prefix `NEXT_PUBLIC_*` di-embed saat **BUILD TIME**, bukan runtime.

**Untuk mengubah environment variables:**

1. Edit `docker-compose.dev.yml`:

   ```yaml
   args:
     - NEXT_PUBLIC_AUTH_API_URL=https://new-url.com/api
   ```

2. Commit dan push:

   ```bash
   git add docker-compose.dev.yml
   git commit -m "Update API URL"
   git push origin main
   ```

3. GitHub Actions akan rebuild dengan env baru

**Tidak cukup hanya restart container!** Harus rebuild karena env di-embed saat build.

## Server Setup

### Prerequisites

- Ubuntu 24.04 LTS atau compatible
- Docker Engine installed
- Docker Compose V2 installed (V5.0.1+)
- SSH access dengan key-based authentication
- Port 8085 open untuk external access

### Directory Structure di Server

```
/home/apps/workspaceChatFrontend/
├── Dockerfile
├── docker-compose.dev.yml
└── src/                    # Source code dari repo
```

### First Time Setup

1. **Generate SSH key untuk GitHub Actions:**

   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/github_actions -N ""
   ```

2. **Copy public key ke server:**

   ```bash
   ssh-copy-id -i ~/.ssh/github_actions.pub user@76.13.17.180
   ```

3. **Add private key ke GitHub Secrets:**
   - Go to: Repository → Settings → Secrets and variables → Actions
   - Add secret `SSH_PRIVATE_KEY`: paste content of `~/.ssh/github_actions`
   - Add secret `SERVER_USER`: username server (e.g., `root`)

4. **Test connection:**
   ```bash
   ssh -i ~/.ssh/github_actions user@76.13.17.180
   ```

## Verification

### Check Deployment Status

**1. GitHub Actions:**

- Go to: https://github.com/YOUR_ORG/YOUR_REPO/actions
- Check latest workflow run
- Green checkmark = success

**2. Server Container Status:**

```bash
ssh user@76.13.17.180
docker ps | grep duluin-chat-frontend-dev
```

**Expected output:**

```
CONTAINER ID   IMAGE                    STATUS        PORTS
xxxxx         ...frontend-dev          Up 2 minutes   0.0.0.0:8085->8085/tcp
```

**3. Check Container Logs:**

```bash
docker compose -f docker-compose.dev.yml logs -f
```

**4. Access Application:**

- URL: http://76.13.17.180:8085
- Should redirect to login page
- API calls should go to `https://ssodev.duluin.com/api`

### Verify Environment Variables

```bash
# Di server
cd /home/apps/workspaceChatFrontend
docker compose -f docker-compose.dev.yml exec duluin-chat-frontend-dev printenv | grep NEXT_PUBLIC
```

## Troubleshooting

### Issue: Login masih ke localhost/api

**Cause:** Container menggunakan image lama tanpa env variables baru

**Solution:**

1. Pastikan docker-compose.dev.yml sudah ada di server
2. Rebuild container:
   ```bash
   docker compose -f docker-compose.dev.yml down
   docker compose -f docker-compose.dev.yml up -d --build
   ```
3. Atau push dummy commit untuk trigger GitHub Actions

### Issue: GitHub Actions failed - SSH connection

**Cause:** SSH key tidak valid atau belum ditambahkan ke server

**Solution:**

1. Verify SSH_PRIVATE_KEY secret di GitHub
2. Pastikan public key ada di server `~/.ssh/authorized_keys`
3. Test manual SSH connection

### Issue: Docker build failed - TypeScript errors

**Cause:** Ada error TypeScript yang menghalangi build

**Solution:**

1. Test build locally:
   ```bash
   npm run build
   ```
2. Fix semua TypeScript errors
3. Commit dan push fix

### Issue: Port 8085 sudah digunakan

**Cause:** Container lain atau old container masih running

**Solution:**

```bash
# Stop semua container
docker compose down
docker compose -f docker-compose.dev.yml down

# Check port usage
sudo lsof -i :8085

# Restart dengan compose file yang benar
docker compose -f docker-compose.dev.yml up -d --build
```

### Issue: Container restart terus-menerus

**Cause:** Application crash atau config error

**Solution:**

```bash
# Check logs
docker compose -f docker-compose.dev.yml logs --tail=100

# Check container status
docker compose -f docker-compose.dev.yml ps
```

## Production Deployment

### Setup Files

Sudah tersedia:

- ✅ `docker-compose.prod.yml` - production environment config
- ✅ `.github/workflows/deploy-prod.yml` - production deployment workflow

### Configuration Steps

**1. Update Environment Variables**

Edit `docker-compose.prod.yml` dan sesuaikan semua env variables:

```yaml
args:
  - NEXT_PUBLIC_NODE_ENV=production
  - NEXT_PUBLIC_API_BASE_URL=https://your-production-domain.com
  - NEXT_PUBLIC_APP_NAME=Duluin Chat
  - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
  - NEXT_PUBLIC_AUTH_API_URL=https://sso.duluin.com/api
  - NEXT_PUBLIC_GATEWAY_API_URL=https://api-hrms.duluin.com/api
  - NEXT_PUBLIC_WORKSPACE_URL=/
  - NEXT_PUBLIC_NLP_SERVICE_URL=https://nlp.duluin.com
```

**2. Setup GitHub Secrets untuk Production**

Tambahkan secrets berikut di GitHub Repository → Settings → Secrets:

| Secret Name            | Description                             | Example                          |
| ---------------------- | --------------------------------------- | -------------------------------- |
| `SSH_PRIVATE_KEY_PROD` | SSH private key untuk server production | (content of private key)         |
| `PROD_SERVER_IP`       | IP address server production            | 1.2.3.4                          |
| `PROD_SERVER_USER`     | Username SSH untuk production           | root                             |
| `PROD_DEPLOY_PATH`     | Path deployment di production server    | /home/apps/workspaceChatFrontend |

**3. Setup Production Server**

Di server production, pastikan:

- Docker dan Docker Compose V2 installed
- Port sudah dibuka (default: 8085)
- SSH key sudah ditambahkan ke `~/.ssh/authorized_keys`
- Directory deployment sudah dibuat

```bash
# Di production server
mkdir -p /home/apps/workspaceChatFrontend/src
```

**4. Create Production Branch**

```bash
# Local
git checkout -b production
git push origin production
```

### Deployment Strategy - Branch Based

**Branch Strategy:**

- `main` branch → auto-deploy ke **Development** (76.13.17.180:8085)
- `production` branch → auto-deploy ke **Production** (server production)

**Workflow:**

1. **Development Changes:**

   ```bash
   # Work on main branch
   git checkout main
   git add .
   git commit -m "New feature"
   git push origin main
   # → Auto-deploy ke dev server
   ```

2. **Production Release:**
   ```bash
   # Merge tested changes to production
   git checkout production
   git merge main
   git push origin production
   # → Auto-deploy ke production server
   ```

### Alternative: Tag-Based Deployment

Jika prefer tag-based deployment, update `.github/workflows/deploy-prod.yml`:

```yaml
on:
  push:
    tags:
      - "v*.*.*" # Trigger on version tags: v1.0.0, v2.1.3, etc
```

**Usage:**

```bash
# Create release tag
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
# → Auto-deploy ke production
```

### Production Environment Variables

**Checklist sebelum production deployment:**

- [ ] `NEXT_PUBLIC_AUTH_API_URL` → production SSO URL
- [ ] `NEXT_PUBLIC_GATEWAY_API_URL` → production API Gateway URL
- [ ] `NEXT_PUBLIC_NLP_SERVICE_URL` → production NLP service URL
- [ ] `NEXT_PUBLIC_APP_NAME` → production app name
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` → valid API key
- [ ] Port mapping sesuai production (ubah jika tidak 8085)
- [ ] Domain/IP sudah pointing ke production server

### Testing Production Deployment

**Pre-deployment Checklist:**

1. ✅ Test di dev server dulu
2. ✅ All tests passing
3. ✅ Environment variables production sudah benar
4. ✅ Database migration (jika ada)
5. ✅ Backup data production

**Post-deployment Verification:**

```bash
# 1. Check GitHub Actions
# Go to: https://github.com/YOUR_REPO/actions
# Verify workflow "Deploy to Production Server" succeeded

# 2. Check container di production server
ssh user@prod-server
docker ps | grep duluin-chat-frontend-prod

# 3. Check logs
docker compose -f docker-compose.prod.yml logs -f

# 4. Verify environment variables
docker compose -f docker-compose.prod.yml exec duluin-chat-frontend-prod printenv | grep NEXT_PUBLIC

# 5. Access application
curl https://your-production-domain.com
# atau buka di browser
```

### Production Monitoring

**Health Check:**

```bash
# Setup cron job untuk health check
*/5 * * * * curl -f https://your-domain.com/api/health || echo "Production down!"
```

**Alerts:**

- Setup monitoring (Uptime Robot, Pingdom, atau custom)
- Configure Slack/Discord notifications untuk downtime
- Setup log aggregation (optional: ELK stack, Grafana Loki)

### Production Rollback

**Fast Rollback - Previous Image:**

```bash
# Di production server
cd /home/apps/workspaceChatFrontend
docker compose -f docker-compose.prod.yml down
docker images | grep duluin-chat-frontend-prod
docker run -d -p 8085:8085 <previous-working-image-id>
```

**Rollback via Branch:**

```bash
# Local
git checkout production
git reset --hard <previous-working-commit>
git push origin production --force
# → Auto-deploy versi sebelumnya
```

### Production Best Practices

**Security:**

- ✅ Gunakan HTTPS (setup SSL/TLS certificate)
- ✅ Regular security updates
- ✅ Firewall rules configured
- ✅ SSH key-based auth only (disable password login)
- ✅ Regular backup

**Performance:**

- ✅ CDN untuk static assets (optional)
- ✅ Database connection pooling
- ✅ Caching strategy (Redis, CDN)
- ✅ Load balancing (jika traffic tinggi)

**Maintenance:**

- ✅ Scheduled downtime notification
- ✅ Blue-green deployment (advanced)
- ✅ Canary releases (advanced)
- ✅ Database backup before major updates

## Best Practices

### 1. Environment Variables

- ✅ Gunakan `NEXT_PUBLIC_*` prefix untuk client-side variables
- ✅ Define di docker-compose sebagai build args
- ❌ Jangan hardcode URL di code
- ❌ Jangan commit `.env.local` atau `.env.production`

### 2. Deployment

- ✅ Test build locally sebelum push: `npm run build`
- ✅ Review GitHub Actions logs setelah push
- ✅ Verify application berfungsi setelah deployment
- ❌ Jangan manual edit file di server (gunakan git workflow)

### 3. Security

- ✅ Gunakan SSH key-based authentication
- ✅ Store sensitive data di GitHub Secrets
- ✅ Container run sebagai non-root user
- ❌ Jangan expose private keys di code atau logs

### 4. Docker

- ✅ Gunakan multi-stage build untuk optimized image size
- ✅ Cleanup old images: `docker image prune -f`
- ✅ Monitor container logs untuk errors
- ❌ Jangan run container as root (sudah handled di Dockerfile)

## Monitoring

### Regular Checks

**Daily:**

- Check application accessibility: http://76.13.17.180:8085
- Monitor GitHub Actions untuk failed deployments

**Weekly:**

- Review container logs untuk errors
- Check disk space: `df -h`
- Cleanup old images: `docker image prune -a -f`

**Monthly:**

- Update base images (node:20-alpine)
- Security updates
- Performance review

## Rollback Procedure

Jika deployment bermasalah:

**Option 1: Rollback via Git**

```bash
# Local
git revert HEAD
git push origin main
# GitHub Actions akan deploy versi sebelumnya
```

**Option 2: Manual Rollback di Server**

```bash
# List available images
docker images | grep duluin-chat-frontend

# Run previous image
docker compose -f docker-compose.dev.yml down
docker run -d -p 8085:8085 <previous-image-id>
```

**Option 3: Redeploy from specific commit**

```bash
# Checkout previous working commit
git checkout <commit-hash>

# Force push (hati-hati!)
git push origin main --force

# Atau create new commit
git revert <bad-commit>
git push origin main
```

## Support

**Documentation:**

- Next.js: https://nextjs.org/docs
- Docker: https://docs.docker.com
- GitHub Actions: https://docs.github.com/actions

**Team Contacts:**

- DevOps: [TBD]
- Backend Team: [TBD]
- Frontend Team: [TBD]

## Changelog

### 2026-01-23

- ✅ Initial CI/CD setup untuk development server
- ✅ Docker multi-stage build implemented
- ✅ Environment variables via docker-compose build args
- ✅ GitHub Actions workflow untuk auto-deployment
- ✅ Documentation created

### Future Updates

- [ ] Production deployment setup
- [ ] Branch/tag based deployment strategy
- [ ] Health check monitoring
- [ ] Automated testing in CI pipeline
- [ ] Slack/Discord notifications for deployments
