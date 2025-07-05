# Smart Summary App - Deployment Guide

This guide explains how to deploy and update your Smart Summary App on AWS EC2.

## Quick Start

### One-Command Deployment

```bash
# Pull latest code and update application
./deploy.sh
```

### Update Only (after manual git pull)

```bash
# Full rebuild (recommended for major changes)
./update-app.sh

# Quick update (for minor changes)
./quick-update.sh
```

## Available Scripts

### 1. `deploy.sh` - Complete Deployment

**When to use:** When you want to deploy the latest version with a single command.

**What it does:**

- Pulls latest code from git
- Rebuilds and restarts containers
- Runs health checks
- Shows deployment status

```bash
./deploy.sh
```

### 2. `update-app.sh` - Full Update

**When to use:** Major changes, dependency updates, or when you want a clean rebuild.

**What it does:**

- Stops all containers
- Removes old Docker images
- Rebuilds all images from scratch
- Starts containers
- Runs health checks

```bash
./update-app.sh
```

### 3. `quick-update.sh` - Quick Update

**When to use:** Minor code changes, bug fixes, or small frontend updates.

**What it does:**

- Rebuilds only changed containers
- Restarts services
- Runs health checks
- Faster than full update

```bash
./quick-update.sh
```

## Prerequisites

### On EC2 Instance

1. **Docker & Docker Compose** installed
2. **AWS CLI** configured (for Parameter Store access)
3. **Git** repository cloned
4. **OpenAI API Key** in AWS Parameter Store at `/openai/api_key`

### Environment Variables

The scripts automatically handle the OpenAI API key by:

1. Checking if `OPENAI_API_KEY` environment variable is set
2. If not, retrieving it from AWS Parameter Store (`/openai/api_key`)

## Typical Workflow

### For Development Updates

```bash
# Make changes locally
git add .
git commit -m "Update feature X"
git push origin main

# On EC2 instance
./deploy.sh
```

### For Emergency Hotfixes

```bash
# After git pull
./quick-update.sh
```

### For Major Updates

```bash
# After git pull
./update-app.sh
```

## Troubleshooting

### Script Fails with "docker-compose.yml not found"

```bash
cd /path/to/smart-summary-app
./deploy.sh
```

### OpenAI API Key Issues

```bash
# Check Parameter Store
aws ssm get-parameter --name "/openai/api_key" --with-decryption --region sa-east-1

# Set manually if needed
export OPENAI_API_KEY="your-key-here"
./update-app.sh
```

### Services Don't Start

```bash
# Check container logs
docker-compose logs frontend
docker-compose logs backend

# Check running containers
docker-compose ps

# Restart services
docker-compose restart
```

### Port Already in Use

```bash
# Stop all containers
docker-compose down

# Remove all containers
docker-compose down --remove-orphans

# Start fresh
./update-app.sh
```

## Health Checks

All scripts include automatic health checks:

- **Backend:** `http://localhost:8000/health`
- **Frontend:** `http://localhost:3000`

If health checks fail, the script will exit with an error.

## Service URLs

After successful deployment:

- **Frontend:** http://your-domain.com or http://your-ec2-ip:3000
- **Backend API:** http://your-domain.com/api or http://your-ec2-ip:8000
- **Health Check:** http://your-ec2-ip:8000/health

## Best Practices

1. **Always test locally first** before deploying to EC2
2. **Use `quick-update.sh` for small changes** to save time
3. **Use `update-app.sh` for major updates** to ensure clean state
4. **Monitor logs** after deployment: `docker-compose logs -f`
5. **Keep backups** of your `.env` file and important data

## Script Permissions

All scripts are executable. If you get permission errors:

```bash
chmod +x deploy.sh update-app.sh quick-update.sh
```

## Security Notes

- Scripts automatically retrieve OpenAI API key from AWS Parameter Store
- Never commit API keys to git
- Use IAM roles for EC2 instances to access Parameter Store
- Keep your EC2 instance security groups properly configured
