# Paste to Summary

A web app that turns long text into quick summaries. Paste your content and get the main points back in seconds.

## **🌐 Live at: [https://pastetosummary.com](https://pastetosummary.com)**

<img src="public/lp.png" alt="landing page screenshot" style="width:70vw;"/>

## What it does

Got tired of reading through endless emails, articles, or documents? This app takes that wall of text and gives you just the important stuff. Copy any text, paste it in, and watch it get summarized in real-time.

The "paste to" interaction pattern was inspired by [Paste to Markdown](https://euangoddard.github.io/clipboard2markdown/) - a brilliant little tool that converts copied content to markdown format.

## How it works

<img src="public/diagram.png" alt="landing page screenshot" style="width:65vw;"/>

Pretty simple - the frontend sends text to the FastAPI backend, which talks to OpenAI and streams the response back. No direct LLM calls from the browser.

## Tech Stack

**Frontend:** Next.js 15, TypeScript, Tailwind CSS, Playwright for testing

**Backend:** FastAPI (Python), OpenAI API, async streaming

**Deployment:** AWS ECS, Docker, Nginx, custom domain

## Getting Started

### What you need

- Node.js 18+
- Python 3.12+
- OpenAI API key

### Quick setup

1. **Clone and install**

   ```bash
   git clone https://github.com/yourusername/smart-summary-app.git
   cd smart-summary-app
   npm install
   ```

2. **Add your OpenAI key**

   ```bash
   echo "OPENAI_API_KEY=your_key_here" > .env
   ```

3. **Run it**
   ```bash
   npm run dev
   ```

Frontend: `http://localhost:3000`, Backend: `http://localhost:8000`

### Or use Docker

```bash
docker-compose up --build
```

## Current Deployment

The app runs on AWS ECS. I deployed it manually using the AWS CLI because I wanted control over the setup:

- AWS ECS cluster with the containerized app
- Custom domain at `pastetosummary.com`
- Nginx reverse proxy for SSL and load balancing
- Manual deployment (yeah, I know...)

Works great, but every update needs manual intervention. Getting old.

## What's next

Planning to fix the deployment situation:

1. **Infrastructure as Code** - CloudFormation templates
2. **GitHub Actions** - Automated CI/CD pipeline
3. **Proper environments** - Staging and production

Should let me push code and have it automatically deploy without the manual AWS CLI dance.

## API

**POST `/summarize/stream`** - Streams the summary back in real-time

```bash
curl -X POST "http://localhost:8000/summarize/stream" \
     -H "Content-Type: application/json" \
     -d '{"text": "Your long text here...", "max_length": 200}'
```

**GET `/providers`** - Available LLM providers

**GET `/health`** - Health check

## Project Structure

```
smart-summary-app/
├── apps/
│   ├── frontend/           # Next.js app
│   │   ├── src/app/
│   │   │   ├── components/ # React components
│   │   │   ├── hooks/      # Custom hooks
│   │   │   └── services/   # API calls
│   │   └── e2e/           # Playwright tests
│   └── backend/           # FastAPI app
│       ├── app/
│       │   ├── services/  # Business logic
│       │   └── models.py  # Data models
│       └── requirements.txt
└── docker-compose.yml
```

## Why these choices?

**FastAPI** - Fast, great async support, automatic API docs

**Server-side streaming** - Users see results immediately instead of waiting

**Next.js** - React with good defaults, App Router is nice

**Separate frontend/backend** - Keeps things clean

## Testing

```bash
npm run test              # Unit tests
npm run test:e2e         # End-to-end tests (Playwright)
npm run test:integration # Integration tests
```

Playwright tests run across Chrome, Firefox, Safari, and mobile browsers.

## Some ideas for later

- Support for more LLM providers (Anthropic, Mistral, etc.)
- Custom summary lengths and styles
- Browser extension for one-click summarization
- Export summaries as PDF or markdown

## Contributing

Found a bug? Have an idea?

1. Fork the repo
2. Create a feature branch: `git checkout -b my-feature`
3. Make your changes and add tests
4. Push and create a pull request

Make sure tests pass: `npm run test:ci`

## License

MIT License - use it however you want.

---

Built by [nekeldev](https://patrick-nekel.vercel.app) | [LinkedIn](https://www.linkedin.com/in/nekelpatrick/) | [Buy me a coffee](https://www.buymeacoffee.com/nekeldev)
