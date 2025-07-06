# Frontend - Smart Summary App

Next.js application for AI-powered text summarization with real-time streaming.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Key Components

- `page.tsx`: Main application interface
- `useTextSummary`: Core summarization logic with caching
- `ResultDisplay`: Shows summaries with copy and try again functionality
- `MobileTextInput`: Mobile-optimized text input component
- `streamingService`: Handles server-sent events for real-time updates

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Testing

Test suite covers paste functionality, streaming responses, error handling, try again feature, and mobile interactions.

Built with Next.js 15, TypeScript, and Tailwind CSS.
