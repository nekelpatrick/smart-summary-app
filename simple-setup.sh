#!/bin/bash
set -e

# Log everything
exec > >(tee /var/log/user-data.log) 2>&1

echo "=== Starting user-data script at $(date) ==="

# Ensure SSH is working first
echo "=== Setting up SSH ==="
systemctl enable sshd
systemctl start sshd
systemctl status sshd

# Basic system updates
echo "=== Updating system ==="
yum update -y

# Install Docker
echo "=== Installing Docker ==="
yum install -y docker
systemctl enable docker
systemctl start docker
usermod -a -G docker ec2-user

# Install Docker Compose
echo "=== Installing Docker Compose ==="
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git
echo "=== Installing Git ==="
yum install -y git

# Clone repository
echo "=== Cloning repository ==="
cd /home/ec2-user
if [ -d "smart-summary-app" ]; then
    rm -rf smart-summary-app
fi
git clone https://github.com/nekelpatrick/smart-summary-app.git
chown -R ec2-user:ec2-user smart-summary-app

# Get OpenAI API key from Parameter Store
echo "=== Getting OpenAI API key ==="
yum install -y aws-cli
OPENAI_API_KEY=$(aws ssm get-parameter --name "/openai/api_key" --with-decryption --query "Parameter.Value" --output text --region sa-east-1)

# Create environment file
echo "=== Creating environment file ==="
cd smart-summary-app
echo "OPENAI_API_KEY=$OPENAI_API_KEY" > .env
chown ec2-user:ec2-user .env

# Build and start backend
echo "=== Building and starting backend ==="
cd apps/backend
docker build -t smart-summary-backend:latest .
docker run -d --name smart-summary-backend -p 8000:8000 --env-file ../../.env smart-summary-backend:latest

echo "=== User-data script completed successfully at $(date) ==="
echo "=== Backend should be running on port 8000 ==="

# Test the backend
echo "=== Testing backend ==="
sleep 10
curl -f http://localhost:8000/health && echo "Backend health check passed" || echo "Backend health check failed" 