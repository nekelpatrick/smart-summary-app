#!/bin/bash

# DISABLE ECS AGENT (this was causing the conflicts)
systemctl stop ecs || true
systemctl disable ecs || true

# Update system
yum update -y

# Install Docker
yum install -y docker
systemctl start docker
systemctl enable docker

# Add ec2-user to docker group
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git and AWS CLI
yum install -y git awscli

# Install Node.js (for potential local development)
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
yum install -y nodejs

# Install Python 3 and pip
yum install -y python3 python3-pip

# Create application directory
mkdir -p /home/ec2-user/smart-summary-app
cd /home/ec2-user/smart-summary-app

# Clone the repository
git clone https://github.com/nekelpatrick/smart-summary-app.git .

# Set proper ownership
chown -R ec2-user:ec2-user /home/ec2-user/smart-summary-app

# Create .env file with OpenAI API key from Parameter Store
OPENAI_API_KEY=$(aws ssm get-parameter --name "/openai/api_key" --with-decryption --region sa-east-1 --query "Parameter.Value" --output text)
echo "OPENAI_API_KEY=$OPENAI_API_KEY" > .env

# Build and start the application
docker-compose up -d --build

# Create a systemd service for automatic startup
cat > /etc/systemd/system/smart-summary-app.service << 'EOF'
[Unit]
Description=Smart Summary App
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ec2-user/smart-summary-app
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0
User=ec2-user

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
systemctl enable smart-summary-app.service

# Create update script for easy deployments
cat > /home/ec2-user/smart-summary-app/update-app.sh << 'EOF'
#!/bin/bash
cd /home/ec2-user/smart-summary-app
git pull
docker-compose down
docker-compose up -d --build
EOF

chmod +x /home/ec2-user/smart-summary-app/update-app.sh
chown ec2-user:ec2-user /home/ec2-user/smart-summary-app/update-app.sh

# Log completion
echo "Smart Summary App setup completed at $(date)" >> /var/log/user-data.log 