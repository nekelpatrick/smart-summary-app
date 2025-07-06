# Smart Summary App

A full-stack application that allows users to paste text and receive AI-powered summaries in real-time.

## Features

- **Real-time Streaming**: See summaries generate word-by-word as they're created
- **Try Again**: Regenerate summaries to get different results
- **Smart Caching**: Instant results for previously summarized text (up to 50 entries)
- **Paste Detection**: Automatically detects text pasted anywhere on the page
- **Copy to Clipboard**: One-click copying of generated summaries
- **Mobile Optimized**: Touch-friendly interface with proper accessibility

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python 3.12, OpenAI API
- **Deployment**: Docker, Docker Compose

## Quick Start

### Prerequisites

- Node.js 22+
- Python 3.12+
- OpenAI API key
- Docker (for production deployment)

### Development Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd smart-summary-app

# Install dependencies
npm install

# Set up environment
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env

# Start development servers
npm run dev
```

**Access the application:**

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

### Production Deployment

```bash
# Create environment file
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env

# Deploy with Docker Compose
docker-compose up --build -d
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## Project Structure

```
smart-summary-app/
├── apps/
│   ├── backend/          # FastAPI backend
│   │   ├── app/
│   │   │   ├── main.py           # API endpoints
│   │   │   ├── models.py         # Data models
│   │   │   └── services/
│   │   │       └── llm_service.py # OpenAI integration
│   │   └── requirements.txt
│   └── frontend/         # Next.js frontend
│       └── src/app/
│           └── page.tsx      # Main application
├── docker-compose.yml
└── package.json
```

## API Endpoints

- `GET /health` - Health check
- `GET /example` - Get example text for testing
- `POST /summarize/stream` - Stream summarization results in real-time

## Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:8000)

## Ideas for Future Improvements

- **User Authentication**: Allow users to save and manage their summaries
- **Multiple LLM Providers**: Support for Anthropic Claude, Mistral, and other LLM APIs
- **Customization Options**: Adjustable summary length, tone, and style preferences
- **Export Features**: Download summaries as PDF, Word, or Markdown files
- **Multi-language Support**: Summarization in different languages

## License

MIT License
