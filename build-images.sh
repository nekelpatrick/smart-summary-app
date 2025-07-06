#!/bin/bash

# Smart Summary App - Build Images Script
# Builds the latest images for initial deployment

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

log "Building initial images..."

# Clear build cache to ensure fresh build
log "Clearing build cache..."
docker system prune -f --filter="label=stage=builder" || true

# Build backend image
log "Building backend image..."
if ! docker build -t smart-summary-backend:latest ./apps/backend/; then
    error "Backend build failed"
    exit 1
fi

# Build frontend image
log "Building frontend image..."
if ! docker build -t smart-summary-frontend:latest ./apps/frontend/; then
    error "Frontend build failed"
    exit 1
fi

log "Images built successfully!"
log "Backend image: smart-summary-backend:latest"
log "Frontend image: smart-summary-frontend:latest"

# Show images
log "Built images:"
docker images | grep smart-summary 