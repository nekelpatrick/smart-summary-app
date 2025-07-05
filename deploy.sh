#!/bin/bash

# Smart Summary App - One-Command Deploy Script
# Pulls latest code and updates the application

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

# Check if this is a git repository
if [ ! -d ".git" ]; then
    error "This is not a git repository. Please run this script from the project root directory."
    exit 1
fi

log "Starting deployment..."

# Pull latest code
log "Pulling latest code from git..."
git pull origin main

# Check if there are any changes
if [ -n "$(git status --porcelain)" ]; then
    warn "There are uncommitted changes in the repository"
fi

# Run the update script
log "Running application update..."
./update-app.sh

log "Deployment completed successfully!"
log "Your application is now running the latest version." 