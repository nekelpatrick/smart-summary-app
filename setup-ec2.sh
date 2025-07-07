#!/bin/bash

# EC2 Setup Script for Smart Summary App Backend
set -e

echo "Starting EC2 setup..."

# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user

# Install Git
sudo yum install -y git

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Create app directory
sudo mkdir -p /opt/smart-summary-app
sudo chown ec2-user:ec2-user /opt/smart-summary-app

# Clone repository
cd /opt/smart-summary-app
git clone https://github.com/nekelpatrick/smart-summary-app.git .

# Get OpenAI API key from Parameter Store
export OPENAI_API_KEY=$(aws ssm get-parameter --name "/openai/api_key" --with-decryption --query 'Parameter.Value' --output text --region sa-east-1)

# Build and run backend
cd /opt/smart-summary-app
docker build -t smart-summary-backend:latest -f apps/backend/Dockerfile apps/backend/

# Run backend container
docker run -d \
  --name smart-summary-backend \
  -p 8000:8000 \
  -e OPENAI_API_KEY="$OPENAI_API_KEY" \
  --restart unless-stopped \
  smart-summary-backend:latest

echo "Backend setup completed!"
echo "Backend should be available on port 8000" 