# Job Search Automation

Automate job evaluation against your resume using AI. This application scrapes job postings, parses your resume, and uses AI to analyze job fit — helping you focus on the right opportunities.

## Features

- **Job Scraping** — Automatically fetch job listings from configurable sources
- **LinkedIn Feed Import** — Upload LinkedIn post HTML files to analyze job opportunities
- **Resume Parsing** — Extract text from PDF resumes for AI analysis
- **AI-Powered Evaluation** — Analyze job fit using OpenRouter AI models
- **AI Contact Extraction** — Auto-detect apply URLs and recruiter emails from LinkedIn posts
- **AI Email Generation** — One-click generate professional outreach emails with subject & body
- **Job Management** — Track jobs with statuses: `not_applied`, `applied`, `not_interested`
- **Screening Questions** — AI-generated screening questions per job with answer management
- **Queue System** — Background processing for scraping and analysis tasks
- **Stats Dashboard** — Overview of your job search pipeline
- **Secure** — Password-protected access with SSRF guard on outbound requests

## Tech Stack

| Layer      | Technology                                              |
| ---------- | ------------------------------------------------------- |
| Runtime    | [Bun](https://bun.sh)                                   |
| Backend    | [Elysia](https://elysiajs.com)                          |
| Frontend   | React 19 + Vite + Tailwind CSS v4                       |
| Database   | PostgreSQL 16 + [Drizzle ORM](https://orm.drizzle.team) |
| AI         | OpenRouter API                                          |
| Scheduler  | node-cron                                               |
| Deployment | Docker + Docker Compose + Nginx                         |

## Prerequisites

- [Bun](https://bun.sh) 1.2+
- PostgreSQL 16+ (or use Docker)
- OpenRouter API key

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/FrhCode/ai-jobs-automation.git
cd ai-jobs-automation
bun install
cd ui && bun install && cd ..
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Run Database Migrations

```bash
bun run db:migrate
```

### 4. Start Development

```bash
# Run both server and client
bun run dev
```

Server runs on `http://localhost:3001`, client on `http://localhost:3000`.

## Docker Deployment

```bash
# Copy and configure environment
cp .env.example .env

# Build and run all services
docker-compose up --build -d
```

Access the app at `http://localhost:8020`.

Services:

- **Nginx** (port `8020`) — reverse proxy
- **App** (port `3001`) — Elysia server
- **PostgreSQL** (port `8020`) — database

## Environment Variables

| Variable             | Description                                       | Required |
| -------------------- | ------------------------------------------------- | -------- |
| `DATABASE_URL`       | PostgreSQL connection string                      | Yes      |
| `PORT`               | Server port (default: `3001`)                     | No       |
| `APP_PASSWORD`       | Login password for the app                        | Yes      |
| `OPENROUTER_API_KEY` | API key from [OpenRouter](https://openrouter.ai)  | Yes      |
| `OPENROUTER_MODEL`   | Model ID (default: `anthropic/claude-sonnet-4-6`) | No       |
| `CORS_ORIGIN`        | Comma-separated allowed origins                   | No       |
| `DEBUG`              | Enable debug logging (`true`/`false`)             | No       |
| `UPLOADS_DIR`        | Resume upload directory                           | No       |

## Scripts

```bash
# Development
bun run dev           # Start server + client concurrently
bun run dev:server    # Start server only
bun run dev:client    # Start client only

# Build & Production
bun run build         # Build frontend for production
bun run start         # Start production server

# Database
bun run db:generate   # Generate Drizzle migrations
bun run db:migrate    # Run pending migrations
bun run db:studio     # Open Drizzle Studio
```

## Project Structure

```
├── src/
│   ├── server/           # Elysia backend
│   │   ├── db/           # Drizzle schema & connection
│   │   ├── lib/          # Business logic (AI, scraper, queue, parser)
│   │   ├── plugins/      # Elysia plugins (auth)
│   │   └── routes/       # API routes
│   ├── shared/           # Shared utilities
│   └── types/            # TypeScript types
├── ui/                   # React frontend
│   └── src/              # Components, pages, hooks
├── drizzle/              # Database migrations
├── nginx/                # Nginx Docker config
├── uploads/              # Resume PDF storage
├── docker-compose.yml    # Production orchestration
└── Dockerfile            # App container image
```

## Changelog

**1.1.9** (Current)

- **Remove Animation On Linkedin Feed**

**1.1.8**

- **Email Warning Wording Fix** — "0 hours ago" now correctly shows "just now" when opening mail client immediately after generating an email

**1.1.7**

- **Parallel Chunk Upload** — LinkedIn HTML uploads now send 5 chunks concurrently; progress shown as percentage

**1.1.6**

- **Email 24h Warning** — warns when you open "Mail Client" within 24h of the last send
- **Reminder Presets** — set 12h / 1 day / after-1-day reminders on LinkedIn posts; view and dismiss via /reminders
- **Chunked LinkedIn HTML Upload** — upload up to 100 MB in 512 KB chunks with progress bar and per-chunk retry
- **Application Tracking Moved to Top** — status + notes now appear near the top on both Job Detail and LinkedIn Post Detail pages
- **View Original Link Moved to Top** — job page external link now sits next to Application Tracking

**1.1.5**

- **Update AI Promt For Cover Letter**

**1.1.4**

- **Add Retry For Failed Batch Linkedin Post**

**1.1.3**

- **Handle Linkedin Post Duplicate**

**1.1.2**

- **Enhanced Email Workflow** — Open generated emails in new tab for easier composition and review
- **Improved Filter Experience** — Fixed filter persistence and UI behavior for better job navigation
- **Optimized AI Prompts** — Refined AI analysis prompts for more accurate job evaluation

**1.1.1**

- **Persist Generated Emails** — AI-generated application emails are now saved to the database (`email_subject`, `email_body` columns on `linkedin_posts`). Emails survive page refreshes.
- **URL-Synced Filter State** — Jobs and LinkedIn feed filters, pagination, and active batch IDs are now stored in URL search params. Filter selections survive refreshes and are shareable via URL.
- **React 19 Cleanup** — Removed unnecessary `useCallback` usage across components.

**1.1.0**

- **LinkedIn Feed Import** — Upload LinkedIn post HTML files to analyze job opportunities
- **AI Contact Extraction** — Automatically extracts `applyUrl` and `contactEmail` from LinkedIn post content using AI
- **AI Email Generation** — Generate professional application emails (subject + body) tailored to the job and your resume
- **Apply Method Indicators** — Visual badges on feed cards showing which posts have apply links or contact emails
- **Quick Apply Actions** — Copy links, open URLs in new tab, generate & copy emails, or open your mail client directly

**1.0.6**

- Remove Animation On StatsCards

**1.0.5**

- Implement Seeing Open Router Creadit
- Enhange Toogle Theme Button

**1.0.4**

- Implement Dark Mode
- Enhange QNA in Job Detail

**1.0.3**

- Add job questions feature: AI-generated screening questions per job with answer management in job detail panel

**1.0.2**

- Expose PostgreSQL port `8020` in Docker Compose for external access

**1.0.1**

- Default `/jobs` filter to `not_applied` status
- Add inline "Not Interested" action in jobs list

**1.0.0**

- Go live

## License

MIT
