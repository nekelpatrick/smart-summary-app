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

# Install nginx and certbot for SSL
yum install -y nginx certbot python3-certbot-nginx

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

# Configure nginx
cat > /etc/nginx/conf.d/smart-summary-app.conf << 'EOF'
server {
    listen 80;
    server_name pastetosummary.com www.pastetosummary.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /health {
        proxy_pass http://localhost:8000/health;
    }
}
EOF

# Start and enable nginx
systemctl start nginx
systemctl enable nginx

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

# Create SSL setup script
cat > /home/ec2-user/smart-summary-app/setup-ssl.sh << 'EOF'
#!/bin/bash
# Run this script after DNS propagation (usually 24-48 hours after domain setup)
# sudo certbot --nginx -d pastetosummary.com -d www.pastetosummary.com --non-interactive --agree-tos --email YOUR_EMAIL@example.com
# sudo systemctl restart nginx
echo "SSL setup script created. Edit with your email and run after DNS propagation."
EOF

# Create update script for easy deployments
cat > /home/ec2-user/smart-summary-app/update-app.sh << 'EOF'
#!/bin/bash
cd /home/ec2-user/smart-summary-app
git pull
docker-compose down
docker-compose up -d --build
sudo systemctl restart nginx
EOF

chmod +x /home/ec2-user/smart-summary-app/update-app.sh
chmod +x /home/ec2-user/smart-summary-app/setup-ssl.sh
chown ec2-user:ec2-user /home/ec2-user/smart-summary-app/update-app.sh
chown ec2-user:ec2-user /home/ec2-user/smart-summary-app/setup-ssl.sh

# Log completion
echo "Smart Summary App setup completed at $(date)" >> /var/log/user-data.log 