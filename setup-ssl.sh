#!/bin/bash

set -e

echo "🔒 Setting up SSL certificates for the backend..."

EC2_HOST="ec2-user@ec2-177-71-137-52.sa-east-1.compute.amazonaws.com"
DOMAIN="pastetosummary.com"
API_DOMAIN="api.pastetosummary.com"

echo "📡 Connecting to EC2 instance..."

ssh -o StrictHostKeyChecking=no $EC2_HOST << 'EOF'
# Update system
sudo yum update -y

# Install certbot and nginx
sudo yum install -y certbot python3-certbot-nginx nginx

# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Create basic nginx configuration for domain verification
sudo tee /etc/nginx/conf.d/ssl-setup.conf > /dev/null << 'NGINX_CONF'
server {
    listen 80;
    server_name pastetosummary.com api.pastetosummary.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}
NGINX_CONF

# Create web root directory
sudo mkdir -p /var/www/html

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Get SSL certificates
sudo certbot certonly --webroot -w /var/www/html -d pastetosummary.com -d api.pastetosummary.com --non-interactive --agree-tos --email nekelpatrick@gmail.com

# Create SSL-enabled nginx configuration
sudo tee /etc/nginx/conf.d/backend-ssl.conf > /dev/null << 'NGINX_SSL_CONF'
server {
    listen 443 ssl http2;
    server_name api.pastetosummary.com;
    
    ssl_certificate /etc/letsencrypt/live/pastetosummary.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pastetosummary.com/privkey.pem;
    
    # SSL Security Headers
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    
    # CORS headers for frontend
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
    
    # Proxy to FastAPI backend
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support for streaming
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Increase timeouts for streaming
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.pastetosummary.com;
    return 301 https://$server_name$request_uri;
}
NGINX_SSL_CONF

# Remove the temporary setup configuration
sudo rm -f /etc/nginx/conf.d/ssl-setup.conf

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Set up automatic certificate renewal
sudo crontab -l | { cat; echo "0 12 * * * /usr/bin/certbot renew --quiet"; } | sudo crontab -

echo "✅ SSL certificates set up successfully!"
echo "🔒 Backend is now available at: https://api.pastetosummary.com"

EOF

echo "🎉 SSL setup completed!"
echo ""
echo "Next steps:"
echo "1. Update your DNS to point api.pastetosummary.com to 177.71.137.52"
echo "2. Restart the backend containers to ensure they're running"
echo "3. Test the HTTPS endpoint: https://api.pastetosummary.com/health" 