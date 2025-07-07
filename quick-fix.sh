#!/bin/bash
# Quick fix script for EC2 backend

echo "🚀 Quick fixing the backend..."

# Kill any existing backend processes
sudo pkill -f python
sudo docker stop backend 2>/dev/null || true
sudo docker rm backend 2>/dev/null || true

# Get OpenAI API key from Parameter Store
export OPENAI_API_KEY=$(aws ssm get-parameter --name "/openai/api_key" --with-decryption --region sa-east-1 --query 'Parameter.Value' --output text)

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    sudo yum update -y
    sudo yum install -y docker
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -a -G docker ec2-user
fi

# Clone/update repo
cd /home/ec2-user
if [ ! -d "smart-summary-app" ]; then
    git clone https://github.com/nekelpatrick/smart-summary-app.git
else
    cd smart-summary-app && git pull && cd ..
fi

cd smart-summary-app

# Create .env file
cat > .env << EOF
OPENAI_API_KEY=$OPENAI_API_KEY
EOF

# Build and run backend
sudo docker build -t smart-summary-backend -f apps/backend/Dockerfile apps/backend/
sudo docker run -d -p 8000:8000 --env-file .env --name backend --restart unless-stopped smart-summary-backend

# Test backend
sleep 5
curl -s http://localhost:8000/health || echo "Backend not responding yet"

echo "✅ Backend should be running on port 8000"
echo "🌐 Test with: curl http://177.71.137.52:8000/health" 