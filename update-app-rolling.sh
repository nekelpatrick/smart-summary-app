#!/bin/bash

# Smart Summary App - Rolling Update Script
# Uses docker-compose rolling updates to minimize downtime

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    error "docker-compose.yml not found. Please run this script from the project root directory."
    exit 1
fi

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
    warn "OPENAI_API_KEY environment variable not set."
    warn "Trying to get from AWS Parameter Store..."
    
    if command -v aws &> /dev/null; then
        OPENAI_API_KEY=$(aws ssm get-parameter --name "/openai/api_key" --with-decryption --query 'Parameter.Value' --output text --region sa-east-1 2>/dev/null || echo "")
        
        if [ -n "$OPENAI_API_KEY" ]; then
            export OPENAI_API_KEY
            log "OpenAI API key retrieved from Parameter Store"
        else
            error "Could not retrieve OpenAI API key from Parameter Store"
            exit 1
        fi
    else
        error "AWS CLI not found and OPENAI_API_KEY not set"
        exit 1
    fi
fi

log "Starting rolling update deployment..."

# Step 1: Build new images first
log "Building new images..."
docker-compose build --no-cache

# Step 2: Update backend first (since frontend depends on it)
log "Updating backend service..."
docker-compose up -d --no-deps backend

# Wait for backend to be healthy
log "Waiting for backend to be healthy..."
for i in {1..30}; do
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log "Backend is healthy ✓"
        break
    else
        log "Backend health check attempt $i/30..."
        sleep 2
    fi
    if [ $i -eq 30 ]; then
        error "Backend failed to become healthy"
        exit 1
    fi
done

# Step 3: Update frontend
log "Updating frontend service..."
docker-compose up -d --no-deps frontend

# Wait for frontend to be healthy
log "Waiting for frontend to be healthy..."
for i in {1..30}; do
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        log "Frontend is healthy ✓"
        break
    else
        log "Frontend health check attempt $i/30..."
        sleep 2
    fi
    if [ $i -eq 30 ]; then
        error "Frontend failed to become healthy"
        exit 1
    fi
done

# Step 4: Clean up unused images
log "Cleaning up unused images..."
docker image prune -f 2>/dev/null || true

log "Rolling update completed successfully! ✓"
log "Frontend: http://localhost:3000"
log "Backend: http://localhost:8000"

# Show final running containers
log "Running containers:"
docker-compose ps 