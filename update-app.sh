#!/bin/bash

# Smart Summary App - Zero-Downtime Update Script
# Builds new images and switches over without bringing down the current service

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

# Generate timestamp for this deployment
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
NEW_FRONTEND_TAG="smart-summary-frontend:${TIMESTAMP}"
NEW_BACKEND_TAG="smart-summary-backend:${TIMESTAMP}"

log "Starting zero-downtime deployment with timestamp: ${TIMESTAMP}"

# Clear build cache to ensure fresh build
log "Clearing build cache..."
docker system prune -f --filter="label=stage=builder" || true

# Build new images with timestamp tags
log "Building new frontend image..."
if ! docker build -t $NEW_FRONTEND_TAG ./apps/frontend/; then
    error "Frontend build failed"
    exit 1
fi

log "Building new backend image..."
if ! docker build -t $NEW_BACKEND_TAG ./apps/backend/; then
    error "Backend build failed"
    exit 1
fi

# Create temporary docker-compose file for new deployment
log "Creating temporary deployment configuration..."
cat > docker-compose.new.yml << EOF
version: '3.8'

services:
  backend-new:
    image: $NEW_BACKEND_TAG
    container_name: smart-summary-backend-new
    ports:
      - "8001:8000"
    environment:
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  frontend-new:
    image: $NEW_FRONTEND_TAG
    container_name: smart-summary-frontend-new
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8001
    depends_on:
      - backend-new
    networks:
      - app-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 10s
      timeout: 5s
      retries: 3

networks:
  app-network:
    driver: bridge
EOF

# Start new containers
log "Starting new containers..."
docker-compose -f docker-compose.new.yml up -d

# Wait for new services to be ready
log "Waiting for new services to start..."
MAX_WAIT=120
WAIT_TIME=0

while [ $WAIT_TIME -lt $MAX_WAIT ]; do
    if docker-compose -f docker-compose.new.yml ps | grep -q "Up (healthy)"; then
        log "New services are starting..."
        break
    fi
    sleep 5
    WAIT_TIME=$((WAIT_TIME + 5))
    debug "Waiting... ${WAIT_TIME}s"
done

# Additional wait for full startup
sleep 15

# Health check new services
log "Performing health checks on new services..."

# Check new backend
if curl -f http://localhost:8001/health > /dev/null 2>&1; then
    log "New backend is healthy ✓"
else
    error "New backend health check failed"
    log "Cleaning up failed deployment..."
    docker-compose -f docker-compose.new.yml down
    docker rmi $NEW_FRONTEND_TAG $NEW_BACKEND_TAG || true
    rm -f docker-compose.new.yml
    exit 1
fi

# Check new frontend
if curl -f http://localhost:3001 > /dev/null 2>&1; then
    log "New frontend is healthy ✓"
else
    error "New frontend health check failed"
    log "Cleaning up failed deployment..."
    docker-compose -f docker-compose.new.yml down
    docker rmi $NEW_FRONTEND_TAG $NEW_BACKEND_TAG || true
    rm -f docker-compose.new.yml
    exit 1
fi

# Update main docker-compose.yml to use new images
log "Updating main configuration to use new images..."
sed -i.bak "s|image: smart-summary-frontend:.*|image: $NEW_FRONTEND_TAG|g" docker-compose.yml
sed -i.bak "s|image: smart-summary-backend:.*|image: $NEW_BACKEND_TAG|g" docker-compose.yml

# If nginx is configured, update it to point to new services temporarily
if command -v nginx &> /dev/null && [ -f /etc/nginx/sites-available/smart-summary ]; then
    log "Updating nginx to point to new services..."
    # Create backup
    sudo cp /etc/nginx/sites-available/smart-summary /etc/nginx/sites-available/smart-summary.bak
    
    # Update upstream to point to new services
    sudo sed -i 's/localhost:8000/localhost:8001/g' /etc/nginx/sites-available/smart-summary
    sudo sed -i 's/localhost:3000/localhost:3001/g' /etc/nginx/sites-available/smart-summary
    
    # Test nginx config
    if sudo nginx -t; then
        sudo systemctl reload nginx
        log "Nginx updated and reloaded ✓"
    else
        error "Nginx configuration test failed"
        sudo cp /etc/nginx/sites-available/smart-summary.bak /etc/nginx/sites-available/smart-summary
        exit 1
    fi
fi

# Wait a moment for traffic to switch
sleep 5

# Stop old containers
log "Stopping old containers..."
docker-compose down

# Start new containers on main ports
log "Updating new containers to main ports..."
docker-compose -f docker-compose.new.yml down

# Update the new compose file to use main ports
sed -i 's/8001:8000/8000:8000/g' docker-compose.new.yml
sed -i 's/3001:3000/3000:3000/g' docker-compose.new.yml
sed -i 's/localhost:8001/localhost:8000/g' docker-compose.new.yml

# Start on main ports
docker-compose -f docker-compose.new.yml up -d

# If nginx was updated, revert it to main ports
if command -v nginx &> /dev/null && [ -f /etc/nginx/sites-available/smart-summary.bak ]; then
    log "Reverting nginx to main ports..."
    sudo cp /etc/nginx/sites-available/smart-summary.bak /etc/nginx/sites-available/smart-summary
    sudo systemctl reload nginx
fi

# Wait for services to be ready on main ports
sleep 10

# Final health check
log "Performing final health checks..."

if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    log "Backend is healthy on main port ✓"
else
    error "Backend health check failed on main port"
    exit 1
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    log "Frontend is healthy on main port ✓"
else
    error "Frontend health check failed on main port"
    exit 1
fi

# Clean up
log "Cleaning up..."
rm -f docker-compose.new.yml
rm -f docker-compose.yml.bak
rm -f /etc/nginx/sites-available/smart-summary.bak 2>/dev/null || true

# Remove old images (keep last 3 versions)
log "Cleaning up old images..."
docker images smart-summary-frontend --format "table {{.Tag}}" | tail -n +2 | head -n -3 | xargs -r -I {} docker rmi smart-summary-frontend:{} || true
docker images smart-summary-backend --format "table {{.Tag}}" | tail -n +2 | head -n -3 | xargs -r -I {} docker rmi smart-summary-backend:{} || true

log "Zero-downtime deployment completed successfully!"
log "Frontend: http://localhost:3000"
log "Backend: http://localhost:8000"
log "New image tags: $NEW_FRONTEND_TAG, $NEW_BACKEND_TAG"

# Show running containers
log "Running containers:"
docker-compose ps 