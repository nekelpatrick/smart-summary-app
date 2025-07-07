# Smart Summary App

Ever find yourself staring at a wall of text thinking "I just need the TL;DR version"? Yeah, me too. That's exactly why I built this.

**Live at: https://pastetosummary.com/**

<img src="public/lp.png" alt="landing page screenshot" style="width:70vw;"/>

## What's This All About?

This is a text summarization app that takes your long-winded articles, emails, meeting notes, or whatever text you throw at it, and gives you back a clean, concise summary. Simple as that.

The whole thing started as a coding challenge, but honestly, I've been using it myself more than I expected. There's something satisfying about pasting a 2000-word article and getting back the key points in under 200 words.

## How It Actually Works

The setup is pretty straightforward:

- **Frontend**: Next.js 15 with React, TypeScript, and Tailwind CSS
- **Backend**: FastAPI with Python
- **AI**: Currently using OpenAI's GPT-3.5 API for the actual summarization
- **Infrastructure**: Deployed on AWS ECS with a custom domain and nginx

The frontend talks to the FastAPI backend, which then handles all the AI magic. I implemented server-side streaming so you can watch the summary appear in real-time instead of staring at a loading spinner.

## Current State & Deployment

The app is currently deployed with a hybrid approach:

- **Frontend**: Deployed on Vercel at https://pastetosummary.com
- **Backend**: Running on AWS EC2 with nginx SSL proxy at https://api.pastetosummary.com

**Why the split deployment?**

Originally planned to deploy everything on AWS (ECS or EC2), but ran into time constraints dealing with DNS configuration, SSL certificates, and domain routing complexities. Vercel made the frontend deployment incredibly fast and handled all the HTTPS/domain stuff automatically.

The backend runs on a single EC2 instance with:

- Docker container for the FastAPI application
- nginx as reverse proxy for SSL termination
- Let's Encrypt certificates for HTTPS
- Route 53 DNS pointing `api.pastetosummary.com` to the EC2 instance

**Trade-offs of this approach:**

- ✅ Fast deployment and iteration
- ✅ Vercel handles CDN, HTTPS, and scaling for frontend
- ✅ Simple backend deployment on familiar EC2
- ❌ Split between two platforms (more complexity)
- ❌ Manual SSL certificate management on EC2
- ❌ Single point of failure for backend

**Future improvements**: Planning to consolidate everything into AWS with proper Infrastructure as Code (CloudFormation/CDK) and implement CI/CD pipelines. But for now, this hybrid approach gets the job done and allows for rapid iteration.

## Features & What I Added Along the Way

### Core Functionality

- **Real-time streaming**: Watch your summary appear word by word
- **Smart paste detection**: Paste anywhere on the page, and it just works
- **Mobile-friendly**: Responsive design that actually works on phones
- **API key support**: Bring your own OpenAI key if you want

### Testing & Quality Assurance

I went a bit overboard on the testing front (probably because I've been burned by untested code too many times):

- **Playwright E2E testing**: Full browser automation testing across Chrome, Firefox, and Safari
- **Unit tests**: Component testing with Jest and React Testing Library
- **Accessibility testing**: WCAG compliance checks with jest-axe
- **Performance monitoring**: Core Web Vitals tracking
- **Visual regression tests**: Catches UI changes I didn't intend

The test suite covers everything from basic functionality to edge cases like network failures and malformed responses.

### Development Experience

- **TypeScript everywhere**: Caught so many bugs before they hit production
- **ESLint & Prettier**: Consistent code formatting
- **Hot reloading**: Both frontend and backend restart automatically on changes
- **Error boundaries**: Graceful handling when things go wrong

## Tools & Tech Stack

Started with the constraint that users should only need Docker and Git to run this locally. I'm... probably not quite there yet. Getting everything containerized properly took longer than expected, and I didn't have as much time to focus on the infrastructure side as I would have liked.

**Backend Tools:**

- FastAPI for the REST API
- Pydantic for data validation
- OpenAI's Python client
- Uvicorn for the ASGI server

**Frontend Stack:**

- Next.js 15 with Turbopack (the new bundler is noticeably faster)
- React 18 with modern hooks
- Tailwind CSS for styling
- TypeScript for type safety

**Testing & Development:**

- Playwright for end-to-end testing
- Jest for unit tests
- ESLint and Prettier for code quality

I also experimented with LangGraph for more complex AI workflows, though the current implementation uses a simpler approach. LangGraph's graph-based execution model is fascinating for multi-step AI tasks, but felt like overkill for straightforward summarization.

## The Streaming Implementation Journey

Getting the streaming response working was... interesting. The concept seemed simple enough: stream the AI response back to the frontend as it's generated. Reality was a bit more complicated.

First attempt was naive - just tried to pipe the OpenAI stream directly to the frontend. Turns out there are all sorts of encoding issues, connection drops, and race conditions you don't think about until your stream randomly cuts off mid-sentence.

The breakthrough came when I realized I needed to properly handle the Server-Sent Events (SSE) format and implement proper error recovery. The OpenAI client sometimes sends malformed chunks, especially when the API is under load. Had to add chunk validation and graceful fallbacks.

The frontend side was tricky too. Managing the streaming state while keeping the UI responsive meant carefully orchestrating React's state updates. Too many updates and the UI becomes janky; too few and the streaming feels sluggish.

Eventually settled on a solution that buffers chunks intelligently and updates the UI at consistent intervals. Much smoother experience now.

## Future Plans (The Realistic Ones)

### Local LLM Support

The OpenAI dependency bothers me a bit. Planning to add support for local models via Ollama. Would be nice to run everything locally without sending data to external APIs. Especially useful for sensitive documents or when you're working offline.

### Model Selection

Right now it's hardcoded to GPT-3.5, but there's no reason users shouldn't be able to choose their model. Thinking Claude, Mistral, maybe some of the newer open-source models. Each has different strengths for different types of content.

### Better Summarization Options

- Bullet point summaries for meeting notes
- Executive summary format for business documents
- Key quotes extraction for articles
- Custom summary lengths based on content type

### Quality of Life Improvements

- Save/favorite summaries
- Export to different formats (PDF, markdown, etc.)
- Batch processing for multiple documents
- Browser extension for one-click summarization

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.12+
- OpenAI API key (optional - there's a shared one for testing)

### Quick Start

1. **Clone and install:**

```bash
git clone https://github.com/your-username/smart-summary-app.git
cd smart-summary-app
npm install
```

2. **Set up environment:**

```bash
# Copy the example env file
cp .env.example .env

# Add your OpenAI API key (optional)
echo "OPENAI_API_KEY=your-key-here" >> .env
```

3. **Run everything:**

```bash
npm run dev
```

This starts both the frontend (http://localhost:3000) and backend (http://localhost:8000) in development mode.

### Docker Setup (Work in Progress)

```bash
# Should work, but haven't tested extensively
docker-compose up
```

The Docker setup needs some love. Works locally but the networking gets funky in different environments.

## Architecture

<img src="public/diagram.png" alt="landing page screenshot" style="width:65vw;"/>

### Production Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │   AWS EC2       │    │   OpenAI API    │
│   Next.js       │    │   nginx + SSL   │    │                 │
│   Frontend      │◄──►│   FastAPI       │◄──►│   GPT-3.5       │
│pastetosummary.com│    │api.pastetosummary│    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Local Development

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js       │    │   FastAPI       │    │   OpenAI API    │
│   Frontend      │◄──►│   Backend       │◄──►│                 │
│   (Port 3000)   │    │   (Port 8000)   │    │   GPT-3.5       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Frontend → Backend:**

- REST API calls for standard operations
- Server-Sent Events for streaming responses
- Error handling and retry logic
- CORS properly configured for cross-origin requests

**Backend → OpenAI:**

- Async HTTP client for API calls
- Stream processing for real-time responses
- API key validation and rate limiting

## Project Structure

```
smart-summary-app/
├── apps/
│   ├── frontend/          # Next.js application
│   │   ├── src/app/        # App router pages
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client code
│   │   └── __tests__/      # Test files
│   └── backend/           # FastAPI application
│       ├── app/           # Application code
│       ├── services/      # Business logic
│       ├── models.py      # Pydantic models
│       └── main.py        # FastAPI app
├── docker-compose.yml     # Local development
├── build-images.sh        # Docker build script
└── update-app.sh          # Zero-downtime deployment
```

## API Reference

### Core Endpoints

**GET /health**
Health check endpoint

**GET /example**  
Returns sample text for testing

**POST /summarize**

```json
{
  "text": "Your long text here...",
  "max_length": 200,
  "api_key": "optional-key",
  "provider": "openai"
}
```

**POST /summarize/stream**
Same as above, but streams the response in real-time

**GET /providers**
Lists available AI providers and their status

## Testing

Run the full test suite:

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# All tests with coverage
npm run test:coverage
```

The test coverage is pretty comprehensive:

- Component unit tests
- API integration tests
- End-to-end user workflows
- Accessibility compliance
- Performance benchmarks

## Security & Scaling Considerations

**Security:**

- API keys are validated but not stored
- CORS properly configured
- Input sanitization on all endpoints
- Rate limiting (basic implementation)

**Scaling:**
The current setup handles moderate traffic fine, but would need work for serious scale:

- Database for user sessions and history
- Redis for caching frequent summaries
- Load balancing for multiple backend instances
- CDN for static assets

**Cost Management:**
OpenAI API calls are the main cost driver. Added request deduplication and smart caching to avoid redundant calls. Still, heavy usage could get expensive fast.

## Known Issues

- Docker networking needs refinement
- Some edge cases in stream handling
- Mobile paste detection could be more reliable
- Error messages could be more user-friendly

## Contributing

Found a bug or have an idea? Open an issue or submit a PR. The codebase is pretty straightforward to navigate.

## License

MIT License - do whatever you want with it.

---

Built because I got tired of reading TL;DR summaries that were somehow longer than the original text.
