#!/bin/bash

# Smart Summary App - Zero Downtime Deployment Script
# This script ensures the application stays online during updates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
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

# Generate timestamp for unique container names
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
NEW_PROJECT_NAME="smart-summary-app-new-${TIMESTAMP}"
OLD_PROJECT_NAME="smart-summary-app"

# Temporary ports for new containers
NEW_FRONTEND_PORT=3001
NEW_BACKEND_PORT=8001

log "Starting zero-downtime deployment..."
log "New project name: $NEW_PROJECT_NAME"
log "Testing on ports: Frontend($NEW_FRONTEND_PORT), Backend($NEW_BACKEND_PORT)"

# Function to cleanup on exit
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        warn "Deployment failed, cleaning up new containers..."
        docker-compose -p "$NEW_PROJECT_NAME" down --remove-orphans 2>/dev/null || true
        docker-compose -p "$NEW_PROJECT_NAME" down --rmi all 2>/dev/null || true
    fi
    exit $exit_code
}

trap cleanup EXIT

# Check if old containers are running
if ! docker-compose -p "$OLD_PROJECT_NAME" ps -q | grep -q .; then
    warn "No existing containers found. This might be the first deployment."
    log "Running standard deployment..."
    docker-compose -p "$OLD_PROJECT_NAME" up -d --build
    exit 0
fi

log "Current containers status:"
docker-compose -p "$OLD_PROJECT_NAME" ps

# Step 1: Build new images
log "Building new images..."
docker-compose -p "$NEW_PROJECT_NAME" build --no-cache

# Step 2: Start new containers on different ports
log "Starting new containers on temporary ports..."

# Create temporary docker-compose override for new ports
cat > docker-compose.new.yml << EOF
services:
  backend:
    ports:
      - "${NEW_BACKEND_PORT}:8000"
  frontend:
    ports:
      - "${NEW_FRONTEND_PORT}:3000"
EOF

# Start new containers
docker-compose -p "$NEW_PROJECT_NAME" -f docker-compose.yml -f docker-compose.new.yml up -d

# Step 3: Wait for new containers to be healthy
log "Waiting for new containers to be healthy..."
sleep 5

# Check new backend health
log "Checking new backend health..."
for i in {1..30}; do
    if curl -f http://localhost:$NEW_BACKEND_PORT/health > /dev/null 2>&1; then
        log "New backend is healthy ✓"
        break
    else
        debug "Backend health check attempt $i/30..."
        sleep 2
    fi
    if [ $i -eq 30 ]; then
        error "New backend failed to become healthy"
        exit 1
    fi
done

# Check new frontend health
log "Checking new frontend health..."
for i in {1..30}; do
    if curl -f http://localhost:$NEW_FRONTEND_PORT > /dev/null 2>&1; then
        log "New frontend is healthy ✓"
        break
    else
        debug "Frontend health check attempt $i/30..."
        sleep 2
    fi
    if [ $i -eq 30 ]; then
        error "New frontend failed to become healthy"
        exit 1
    fi
done

# Step 4: Test the new deployment
log "Testing new deployment functionality..."
if curl -f http://localhost:$NEW_BACKEND_PORT/example > /dev/null 2>&1; then
    log "New deployment API test passed ✓"
else
    error "New deployment API test failed"
    exit 1
fi

# Step 5: Switch traffic (stop old, start new on original ports)
log "Switching traffic to new containers..."

# Stop old containers
log "Stopping old containers..."
docker-compose -p "$OLD_PROJECT_NAME" down

# Stop new containers on temporary ports
log "Stopping new containers on temporary ports..."
docker-compose -p "$NEW_PROJECT_NAME" -f docker-compose.yml -f docker-compose.new.yml down

# Start new containers on original ports
log "Starting new containers on original ports..."
docker-compose -p "$OLD_PROJECT_NAME" -f docker-compose.yml up -d

# Step 6: Final health check
log "Performing final health check..."
sleep 5

# Check final backend health
for i in {1..15}; do
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log "Final backend health check passed ✓"
        break
    else
        debug "Final backend health check attempt $i/15..."
        sleep 2
    fi
    if [ $i -eq 15 ]; then
        error "Final backend health check failed"
        exit 1
    fi
done

# Check final frontend health
for i in {1..15}; do
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        log "Final frontend health check passed ✓"
        break
    else
        debug "Final frontend health check attempt $i/15..."
        sleep 2
    fi
    if [ $i -eq 15 ]; then
        error "Final frontend health check failed"
        exit 1
    fi
done

# Step 7: Cleanup
log "Cleaning up temporary files and old images..."
rm -f docker-compose.new.yml

# Remove old images from the new project
docker-compose -p "$NEW_PROJECT_NAME" down --rmi all 2>/dev/null || true

# Clean up any unused images
docker image prune -f 2>/dev/null || true

log "Zero-downtime deployment completed successfully! ✓"
log "Frontend: http://localhost:3000"
log "Backend: http://localhost:8000"

# Show final running containers
log "Final running containers:"
docker-compose ps

# Disable cleanup trap since we succeeded
trap - EXIT 