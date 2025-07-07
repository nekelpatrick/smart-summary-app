#!/bin/bash

# Local script to deploy backend changes to EC2
# Run this from your local machine after making changes

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }
debug() { echo -e "${BLUE}[DEBUG]${NC} $1"; }

# Configuration
EC2_HOST="177.71.137.52"
EC2_USER="ec2-user"
SSH_KEY="~/Downloads/mac-key.pem"

log "🚀 Starting backend deployment to EC2..."

# Step 1: Push local changes to GitHub
if [[ -n $(git status --porcelain) ]]; then
    warn "You have uncommitted changes. Committing them now..."
    git add .
    read -p "Enter commit message: " commit_msg
    git commit -m "$commit_msg"
fi

log "Pushing changes to GitHub..."
git push origin main
log "✅ Changes pushed to GitHub"

# Step 2: Connect to EC2 and run update script
log "Connecting to EC2 instance to update backend..."
ssh -i $SSH_KEY -o StrictHostKeyChecking=no $EC2_USER@$EC2_HOST "cd /opt/smart-summary-app && ./update-backend.sh"

# Step 3: Verify deployment
log "Verifying deployment..."
sleep 5
if curl -f https://api.pastetosummary.com/health > /dev/null 2>&1; then
    log "✅ Deployment successful! Backend is healthy."
    log "🌐 API is live at: https://api.pastetosummary.com"
else
    error "❌ Deployment verification failed. Check backend logs."
    debug "To check logs: ssh -i $SSH_KEY $EC2_USER@$EC2_HOST 'docker logs smart-summary-backend'"
    exit 1
fi

log "🎉 Backend deployment completed successfully!" 