# Smart Summary App

A full-stack application that allows users to paste text and receive AI-powered summaries in real-time.

## Features

- **Custom API Keys**: Bring your own OpenAI API key for unlimited usage and personalized rate limits
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
- OpenAI API key (optional - users can provide their own)
- Docker (for production deployment)

### Development Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd smart-summary-app

# Install dependencies
npm install

# Set up environment (default/fallback API key)
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env

# Start development servers
npm run dev
```

**Access the application:**

- Frontend: http://localhost:3000
- Backend: http://localhost:8000

### Production Deployment

```bash
# Create environment file (default/fallback API key)
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env

# Deploy with Docker Compose
docker-compose up --build -d
```

## API Key Management

### User-Provided API Keys

Users can provide their own OpenAI API keys for:

- **Unlimited Usage**: No shared rate limits
- **Cost Control**: Direct billing to their OpenAI account
- **Enhanced Privacy**: API requests use their own key

**How to use:**

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Enter it in the "OpenAI API Key (Optional)" field
3. Click "Validate" to verify the key
4. Start summarizing with your personal quota

**Security:**

- API keys are stored locally in browser storage only
- Keys are never saved on our servers
- Each request includes the user's key when provided

### Fallback API Key

A default API key (configured via environment variables) is used when:

- Users don't provide their own key
- User-provided key validation fails
- Rate limiting or other issues occur

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
│   │   │   ├── models.py         # Data models & validation
│   │   │   └── services/
│   │   │       └── llm_service.py # OpenAI integration
│   │   └── requirements.txt
│   └── frontend/         # Next.js frontend
│       └── src/app/
│           ├── components/
│           │   └── ApiKeyInput.tsx  # API key management
│           ├── hooks/
│           │   └── useTextSummary.ts # API key integration
│           └── page.tsx             # Main application
├── docker-compose.yml
└── package.json
```

## API Endpoints

- `GET /health` - Health check
- `GET /example` - Get example text for testing
- `POST /validate-api-key` - Validate user-provided OpenAI API keys
- `POST /summarize/stream` - Stream summarization results in real-time (supports custom API keys)

## Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key (required for fallback/default usage)
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:8000)

## Ideas for Future Improvements

- **User Authentication**: Allow users to save and manage their summaries
- **Multiple LLM Providers**: Support for Anthropic Claude, Mistral, and other LLM APIs
- **Customization Options**: Adjustable summary length, tone, and style preferences
- **Export Features**: Download summaries as PDF, Word, or Markdown files
- **Multi-language Support**: Summarization in different languages

## License

MIT License
