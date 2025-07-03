#!/bin/bash

# Smart Summary App Setup Script

echo "🚀 Setting up Smart Summary App..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# OpenAI API Key (required for summarization)
OPENAI_API_KEY=your_openai_api_key_here

# Backend Configuration
HOST=0.0.0.0
PORT=8000

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
EOF
    echo "✅ .env file created. Please edit it with your OpenAI API key."
else
    echo "⚠️  .env file already exists. Skipping creation."
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker and Docker Compose first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "🐳 Docker and Docker Compose are installed."

# Install npm dependencies
echo "📦 Installing dependencies..."
npm install

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your OpenAI API key"
echo "2. Run: npm run docker:up:build"
echo "3. Open: http://localhost:3000"
echo ""
echo "Available commands:"
echo "  npm run docker:up:build  - Build and start containers"
echo "  npm run docker:up        - Start containers"
echo "  npm run docker:down      - Stop containers"
echo "  npm run docker:logs      - View logs"
echo "  npm run dev              - Start development mode" 