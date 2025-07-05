#!/bin/bash

# Smart Summary App - Status Check Script
# Check the health and status of the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[STATUS]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    error "docker-compose.yml not found. Please run this script from the project root directory."
    exit 1
fi

log "Smart Summary App - Status Check"
echo "=================================="

# Check Docker containers
log "Checking Docker containers..."
CONTAINERS=$(docker-compose ps -q)
if [ -n "$CONTAINERS" ]; then
    success "Docker containers are running"
    docker-compose ps
else
    error "No Docker containers found"
fi

echo ""

# Check service health
log "Checking service health..."

# Check backend
if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    success "Backend is healthy (http://localhost:8000/health)"
else
    error "Backend health check failed"
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    success "Frontend is accessible (http://localhost:3000)"
else
    error "Frontend is not accessible"
fi

echo ""

# Check system resources
log "Checking system resources..."

# Memory usage
MEMORY_USAGE=$(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2 }')
success "Memory usage: $MEMORY_USAGE"

# Disk usage
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}')
success "Disk usage: $DISK_USAGE"

# Load average
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}')
success "Load average:$LOAD_AVG"

echo ""

# Check logs for errors
log "Checking recent logs for errors..."
BACKEND_ERRORS=$(docker-compose logs backend --tail 50 2>/dev/null | grep -i error | wc -l)
FRONTEND_ERRORS=$(docker-compose logs frontend --tail 50 2>/dev/null | grep -i error | wc -l)

if [ "$BACKEND_ERRORS" -eq 0 ]; then
    success "No recent backend errors"
else
    warning "Found $BACKEND_ERRORS backend error(s) in recent logs"
fi

if [ "$FRONTEND_ERRORS" -eq 0 ]; then
    success "No recent frontend errors"
else
    warning "Found $FRONTEND_ERRORS frontend error(s) in recent logs"
fi

echo ""

# Check git status
log "Checking git status..."
if [ -d ".git" ]; then
    GIT_STATUS=$(git status --porcelain)
    if [ -z "$GIT_STATUS" ]; then
        success "Git repository is clean"
    else
        warning "Git repository has uncommitted changes"
    fi
    
    CURRENT_BRANCH=$(git branch --show-current)
    success "Current branch: $CURRENT_BRANCH"
    
    LAST_COMMIT=$(git log -1 --pretty=format:'%h - %s (%cr)' --abbrev-commit)
    success "Last commit: $LAST_COMMIT"
else
    warning "Not in a git repository"
fi

echo ""

# Summary
log "Status check completed"
echo "=================================="
echo ""
echo "Service URLs:"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:8000"
echo "- Health Check: http://localhost:8000/health"
echo ""
echo "Useful commands:"
echo "- View logs: docker-compose logs -f"
echo "- Restart services: docker-compose restart"
echo "- Update app: ./update-app.sh"
echo "- Quick update: ./quick-update.sh"
echo "- Full deploy: ./deploy.sh" 