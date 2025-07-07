#!/bin/bash
set -e

# Update system
yum update -y

# Install required packages
yum install -y docker git awscli certbot python3-certbot-nginx nginx

# Start Docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Start nginx
systemctl start nginx
systemctl enable nginx

# Get OpenAI API key from Parameter Store
OPENAI_API_KEY=$(aws ssm get-parameter --name "/openai/api_key" --with-decryption --region sa-east-1 --query 'Parameter.Value' --output text)

# Clone your repo (you'll need to replace this with the correct repo URL)
cd /home/ec2-user
git clone https://github.com/nekelpatrick/smart-summary-app.git || echo "Repo already exists"
cd smart-summary-app

# Create environment file
cat > .env << EOF
OPENAI_API_KEY=$OPENAI_API_KEY
EOF

# Build and start backend
docker build -t smart-summary-backend -f apps/backend/Dockerfile apps/backend/
docker run -d -p 8000:8000 --env-file .env --name backend --restart unless-stopped smart-summary-backend

# Configure nginx for SSL
cat > /etc/nginx/conf.d/backend.conf << 'NGINX_CONF'
server {
    listen 80;
    server_name api.pastetosummary.com 177.71.137.52;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin "https://smart-summary-app-frontend.vercel.app" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
        add_header Access-Control-Allow-Credentials true always;
        
        # Handle preflight requests
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin "https://smart-summary-app-frontend.vercel.app";
            add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
            add_header Access-Control-Allow-Headers "Content-Type, Authorization";
            add_header Access-Control-Allow-Credentials true;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }
}
NGINX_CONF

# Create web root
mkdir -p /var/www/html

# Test and reload nginx
nginx -t && systemctl reload nginx

# Get SSL certificate
certbot certonly --webroot -w /var/www/html -d api.pastetosummary.com --non-interactive --agree-tos --email nekelpatrick@gmail.com

# Update nginx with SSL
cat > /etc/nginx/conf.d/backend-ssl.conf << 'NGINX_SSL_CONF'
server {
    listen 443 ssl http2;
    server_name api.pastetosummary.com;
    
    ssl_certificate /etc/letsencrypt/live/api.pastetosummary.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.pastetosummary.com/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    
    # CORS headers
    add_header Access-Control-Allow-Origin "https://smart-summary-app-frontend.vercel.app" always;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
    add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
    add_header Access-Control-Allow-Credentials true always;
    
    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin "https://smart-summary-app-frontend.vercel.app";
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Content-Type, Authorization";
        add_header Access-Control-Allow-Credentials true;
        add_header Content-Length 0;
        add_header Content-Type text/plain;
        return 204;
    }
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.pastetosummary.com;
    return 301 https://$server_name$request_uri;
}
NGINX_SSL_CONF

# Remove old config and test
rm -f /etc/nginx/conf.d/backend.conf
nginx -t && systemctl reload nginx

# Set up auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -

# Fix ownership
chown -R ec2-user:ec2-user /home/ec2-user/smart-summary-app

echo "Setup complete! Backend should be available at https://api.pastetosummary.com" 