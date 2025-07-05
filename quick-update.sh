#!/bin/bash

# Smart Summary App - Quick Update Script
# Run this for minor updates (doesn't rebuild everything from scratch)

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
    
    # Try to get from AWS Parameter Store (for EC2 instances)
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

log "Starting quick application update..."

# Build and restart containers (only rebuilds if Dockerfile or code changed)
log "Building and restarting containers..."
docker-compose up -d --build

# Wait for services to be ready
log "Waiting for services to start..."
sleep 5

# Check if services are healthy
log "Checking service health..."

# Check backend
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    log "Backend is healthy ✓"
else
    error "Backend health check failed"
    exit 1
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    log "Frontend is healthy ✓"
else
    error "Frontend health check failed"
    exit 1
fi

log "Quick update completed successfully!"
log "Frontend: http://localhost:3000"
log "Backend: http://localhost:8000"

# Show running containers
log "Running containers:"
docker-compose ps 