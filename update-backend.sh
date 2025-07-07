#!/bin/bash

# Simple Backend Update Script
# Updates the backend container on EC2 with latest code changes

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Configuration
REPO_DIR="/opt/smart-summary-app"
CONTAINER_NAME="smart-summary-backend"
IMAGE_NAME="smart-summary-backend:latest"

log "Starting backend update..."

# Step 1: Pull latest code
log "Pulling latest code from repository..."
cd $REPO_DIR
git fetch origin
git reset --hard origin/main
log "Code updated to latest version"

# Step 2: Get OpenAI API key
log "Retrieving OpenAI API key..."
export OPENAI_API_KEY=$(aws ssm get-parameter --name "/openai/api_key" --with-decryption --query 'Parameter.Value' --output text --region sa-east-1)
if [ -z "$OPENAI_API_KEY" ]; then
    error "Failed to retrieve OpenAI API key"
    exit 1
fi
log "API key retrieved successfully"

# Step 3: Build new image
log "Building new backend image..."
if ! docker build -t $IMAGE_NAME -f apps/backend/Dockerfile apps/backend/; then
    error "Failed to build backend image"
    exit 1
fi
log "New image built successfully"

# Step 4: Stop and remove old container
log "Stopping current backend container..."
docker stop $CONTAINER_NAME || true
docker rm $CONTAINER_NAME || true
log "Old container removed"

# Step 5: Start new container
log "Starting new backend container..."
docker run -d \
    --name $CONTAINER_NAME \
    -p 8000:8000 \
    -e OPENAI_API_KEY="$OPENAI_API_KEY" \
    --restart unless-stopped \
    $IMAGE_NAME

# Step 6: Wait and health check
log "Waiting for backend to start..."
sleep 10

# Health check
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    log "✅ Backend update completed successfully!"
    log "Backend is healthy and running on port 8000"
else
    error "❌ Backend health check failed"
    exit 1
fi

# Step 7: Cleanup old images
log "Cleaning up old images..."
docker image prune -f

log "🎉 Update complete! Backend is running with latest code." 