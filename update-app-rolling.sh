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

cleanup() {
    log "Cleaning up..."
    docker system prune -f > /dev/null 2>&1 || true
}

stop_port_processes() {
    local port=$1
    local processes=$(lsof -ti:$port 2>/dev/null || true)
    
    if [ -n "$processes" ]; then
        warn "Found processes using port $port: $processes"
        log "Stopping processes on port $port..."
        echo "$processes" | xargs kill -9 2>/dev/null || true
        sleep 2
        
        # Verify port is free
        local remaining=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$remaining" ]; then
            error "Failed to free port $port. Remaining processes: $remaining"
            return 1
        else
            log "Port $port is now free ✓"
        fi
    fi
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
    
    # Try to get from AWS Parameter Store
    if command -v aws &> /dev/null; then
        OPENAI_API_KEY=$(aws ssm get-parameter --name "/app/openai-api-key" --with-decryption --query 'Parameter.Value' --output text 2>/dev/null) || true
    fi
    
    if [ -z "$OPENAI_API_KEY" ]; then
        error "OPENAI_API_KEY not found in environment or AWS Parameter Store."
        error "Please set the OPENAI_API_KEY environment variable or store it in AWS Parameter Store."
        exit 1
    fi
fi

log "Starting rolling update..."

# Stop any development servers that might be using our ports
log "Checking for port conflicts..."
stop_port_processes 3000
stop_port_processes 8000

# Clean up any orphaned containers and stop existing ones
log "Cleaning up existing containers..."
docker-compose down --remove-orphans > /dev/null 2>&1 || true

# Build new images
log "Building new images..."
docker-compose build --no-cache

# Start backend first
log "Starting backend service..."
docker-compose up -d backend

# Wait for backend to be healthy
log "Waiting for backend to be healthy..."
BACKEND_HEALTHY=false
for i in {1..60}; do
    log "Backend health check attempt $i/60..."
    if docker-compose exec -T backend curl -f http://localhost:8000/health > /dev/null 2>&1; then
        BACKEND_HEALTHY=true
        break
    fi
    sleep 2
done

if [ "$BACKEND_HEALTHY" = false ]; then
    error "Backend failed to become healthy within 2 minutes"
    error "Rolling back..."
    docker-compose down
    exit 1
fi

log "Backend is healthy ✓"

# Start frontend
log "Starting frontend service..."
docker-compose up -d frontend

# Wait for frontend to be healthy
log "Waiting for frontend to be healthy..."
FRONTEND_HEALTHY=false
for i in {1..30}; do
    log "Frontend health check attempt $i/30..."
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        FRONTEND_HEALTHY=true
        break
    fi
    sleep 2
done

if [ "$FRONTEND_HEALTHY" = false ]; then
    error "Frontend failed to become healthy within 1 minute"
    error "Rolling back..."
    docker-compose down
    exit 1
fi

log "Frontend is healthy ✓"

# Clean up old images
cleanup

log "Rolling update completed successfully! ✓"
log "Application is now running with the latest changes."
log "Frontend: http://localhost:3000"
log "Backend: http://localhost:8000"
log ""
log "To stop the application, run: docker-compose down"
log "To view logs, run: docker-compose logs -f" 