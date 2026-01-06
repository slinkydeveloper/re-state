# Re-State: Real Estate Tracker

A real estate tracking application for house hunting in Italy, powered by [Restate](https://restate.dev) for durable execution and Vercel AI SDK for intelligent property analysis.

## Features

- 🏠 **Property Scraping**: Automatically extract property details from idealista.it and immobiliare.it
- 📊 **Property Management**: Track properties with customizable status pipeline (to reach out → visit → offer → bought/rejected)
- 📝 **Notes**: Add manual notes to each property for additional context
- 🤖 **AI Analysis**: Ask questions about your properties and get intelligent comparisons and insights
- 🔍 **Filtering & Sorting**: Easily filter by status and sort by price, size, or status
- 💪 **Durable Execution**: Powered by Restate - scraping and AI operations survive failures

## Tech Stack

- **Backend**: [Restate](https://restate.dev) Virtual Objects for stateful workflow management
- **AI**: Vercel AI SDK with OpenAI GPT-4o for property analysis
- **Frontend**: Next.js 15 (App Router)
- **Scraping**: Cheerio for HTML parsing, AI-powered data extraction
- **Language**: TypeScript

## Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key (get one at [platform.openai.com](https://platform.openai.com))
- Restate Server ([installation guide](https://docs.restate.dev/develop/local_dev))

## Getting Started

### 1. Install Dependencies

```shell
npm install
```

### 2. Set Environment Variables

Create a `.env.local` file or export the OpenAI API key:

```shell
export OPENAI_API_KEY=your_openai_api_key
```

### 3. Start Restate Server

In a separate terminal, start the Restate server (the durable orchestrator):

```shell
npx @restatedev/restate-server@latest
```

The server will start on:
- API endpoint: `http://localhost:8080`
- Admin UI: `http://localhost:9070`

### 4. Start Next.js Development Server

```shell
npm run dev
```

The Next.js app will start on `http://localhost:3000`

### 5. Register Services with Restate

Register your services so Restate can proxy and durably execute them:

```shell
npx @restatedev/restate deployments register -y --use-http1.1 http://localhost:3000/restate
```

You can also register services via the Restate Admin UI at `http://localhost:9070`

### 6. Use the Application

Open `http://localhost:3000` in your browser and:
1. Create a new research project with your search criteria
2. Add property listings from idealista.it or immobiliare.it
3. Track properties through your pipeline
4. Ask AI questions about your properties

## Architecture

The application follows a 3-tier architecture:

```
┌─────────────────────────────────────────┐
│         Next.js Frontend (React)        │
│  - Research creation page               │
│  - Property table with filtering/sorting│
│  - Q&A sidebar                          │
└─────────────────┬───────────────────────┘
                  │
                  │ HTTP
                  │
┌─────────────────▼───────────────────────┐
│       Next.js API Routes (REST)         │
│  - /api/research                        │
│  - /api/ads                             │
│  - /api/questions                       │
└─────────────────┬───────────────────────┘
                  │
                  │ Restate Client
                  │
┌─────────────────▼───────────────────────┐
│           Restate Server                │
│  (Proxies & durably executes services)  │
└─────────────────┬───────────────────────┘
                  │
                  │
┌─────────────────▼───────────────────────┐
│    ResearchTracker Virtual Object       │
│  - Stores research criteria & ads       │
│  - Scrapes property listings (durable)  │
│  - AI-powered Q&A (durable LLM calls)   │
└─────────────────────────────────────────┘
```

### How Scraping Works

1. User submits a property URL (idealista.it or immobiliare.it)
2. API route calls ResearchTracker Virtual Object via Restate
3. Virtual Object determines which scraper to use based on domain
4. Scraper fetches HTML with proper User-Agent headers
5. AI (GPT-4o-mini) extracts structured data from HTML using Italian prompts
6. Property data is stored in Virtual Object state with deterministic ID
7. Result returned to frontend

**Key durability features:**
- `ctx.run()` wraps scraping to journal results (runs only once)
- `ctx.rand.uuidv4()` generates deterministic IDs for properties
- `durableCalls()` middleware journals LLM responses for Q&A

## API Endpoints

### Research

- `POST /api/research` - Create new research project
  - Body: `{ name: string, criteria: string }`
  - Returns: `{ name: string, criteria: string }`

- `GET /api/research/:name` - Get research criteria
  - Returns: `{ name: string, criteria: string }`

### Ads

- `POST /api/ads/:researchName` - Add property listing
  - Body: `{ url: string }`
  - Returns: `PropertyAd` object

- `GET /api/ads/:researchName` - List all ads
  - Returns: `{ ads: PropertyAd[] }`

- `PATCH /api/ads/:researchName/:adId/status` - Update ad status
  - Body: `{ status: "to reach out" | "visit appointment taken" | "sent the offer" | "bought" | "rejected" }`

- `PATCH /api/ads/:researchName/:adId/notes` - Update ad notes
  - Body: `{ notes: string }`

### Questions

- `POST /api/questions/:researchName` - Ask AI question
  - Body: `{ question: string }`
  - Returns: `{ question: string, answer: string }`

- `GET /api/questions/:researchName` - Get Q&A history
  - Returns: `{ questions: QuestionAnswer[] }`

## Development

### Project Structure

```
re-state/
├── app/                           # Next.js app directory
│   ├── page.tsx                   # Home page (research creation)
│   ├── research/[name]/page.tsx   # Research management page
│   └── api/                       # API routes
│       ├── research/              # Research endpoints
│       ├── ads/                   # Property ad endpoints
│       └── questions/             # Q&A endpoints
├── restate/                       # Restate services
│   ├── endpoint.ts                # Service registration
│   └── services/
│       ├── types.ts               # Zod schemas & types
│       ├── research-tracker.ts    # Virtual Object
│       └── utils/
│           ├── idealista-scraper.ts
│           └── immobiliare-scraper.ts
└── package.json
```

### Adding New Scrapers

To support additional property listing sites:

1. Create a new scraper in `restate/services/utils/`
2. Follow the same pattern as existing scrapers (AI extraction)
3. Add domain check in `research-tracker.ts` addAd handler
4. Update API route validation to allow the new domain

### Monitoring

Check the Restate Admin UI at `http://localhost:9070` to:
- View invocation journals
- See service state
- Monitor durability and retries
- Inspect completed operations

## Deployment

This application is designed to be deployed on Vercel with Restate Cloud or self-hosted Restate:

1. Deploy Next.js app to Vercel
2. Set `OPENAI_API_KEY` in Vercel environment variables
3. Set `RESTATE_URL` to your Restate Cloud or self-hosted endpoint
4. Register services with your production Restate instance

For production deployment details, see [Restate deployment docs](https://docs.restate.dev/deploy/overview).