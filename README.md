# Smart Summary App

A full-stack application that allows users to paste text and receive AI-powered summaries in real-time.

## Features

- **Multiple LLM Providers**: Support for OpenAI, Anthropic, Google, and other providers (OpenAI currently available)
- **Custom API Keys**: Bring your own API key for unlimited usage and personalized rate limits
- **Provider Selection**: Choose from multiple AI providers with clear status indicators
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

## Provider Selection & API Key Management

### Available Providers

The application supports multiple AI providers with different availability status:

- **OpenAI** ✅ Available - GPT models (GPT-3.5, GPT-4, etc.)
- **Anthropic** ⏸️ Disabled - Claude models (coming soon)
- **Google** 🔄 Coming Soon - Gemini models
- **Mistral AI** 🔄 Coming Soon - Mistral models
- **Cohere** 🔄 Coming Soon - Command models

### User-Provided API Keys

Users can provide their own API keys for supported providers:

- **Unlimited Usage**: No shared rate limits
- **Cost Control**: Direct billing to their provider account
- **Enhanced Privacy**: API requests use their own key
- **Provider-Specific Validation**: Keys are validated according to each provider's format

**How to use:**

1. Select your preferred provider from the dropdown
2. Get your API key from the provider's platform:
   - [OpenAI Platform](https://platform.openai.com/api-keys) for OpenAI keys
   - Other provider links shown when applicable
3. Enter it in the "API Key (Optional)" field
4. Click "Validate" to verify the key
5. Start summarizing with your personal quota

**Key Format Validation:**

- **OpenAI**: `sk-` followed by 48+ characters
- **Anthropic**: `sk-ant-` followed by 95+ characters
- **Google**: 39-character alphanumeric string
- **Mistral**: 32-character alphanumeric string
- **Cohere**: 40-character alphanumeric string with hyphens

**Security:**

- API keys are stored locally in browser storage only
- Selected provider preference is saved locally
- Keys are never saved on our servers
- Each request includes the user's key when provided

### Fallback API Key

A default OpenAI API key (configured via environment variables) is used when:

- Users don't provide their own key
- User-provided key validation fails
- Selected provider is not currently available
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
│   │   │   ├── models.py         # Provider models & validation
│   │   │   └── services/
│   │   │       └── llm_service.py # OpenAI integration
│   │   └── requirements.txt
│   └── frontend/         # Next.js frontend
│       └── src/app/
│           ├── components/
│           │   └── ApiKeyInput.tsx  # Provider selection & API key management
│           ├── hooks/
│           │   └── useTextSummary.ts # Provider & API key integration
│           ├── types/
│           │   └── index.ts         # Provider types & interfaces
│           └── page.tsx             # Main application
├── docker-compose.yml
└── package.json
```

## API Endpoints

- `GET /health` - Health check
- `GET /providers` - Get available providers and their status
- `GET /example` - Get example text for testing
- `POST /validate-api-key` - Validate user-provided API keys for specific providers
- `POST /summarize/stream` - Stream summarization results in real-time (supports custom API keys and provider selection)

## Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key (required for fallback/default usage)
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:8000)

## Ideas for Future Improvements

- **User Authentication**: Allow users to save and manage their summaries
- **Additional LLM Providers**: Enable Anthropic Claude, Google Gemini, Mistral, and Cohere support
- **Customization Options**: Adjustable summary length, tone, and style preferences
- **Export Features**: Download summaries as PDF, Word, or Markdown files
- **Multi-language Support**: Summarization in different languages

## License

MIT License
