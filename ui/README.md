# JobSearch AI — UI (Mocked)

React SPA with mocked data for UI testing. No backend required.

## Run

```bash
cd ui
npm install
npm run dev
```

Open http://localhost:5173

## Login

Use the password configured in your `.env` file (`APP_PASSWORD`).

## Pages

- `/jobs` — Browse, sort, filter, and delete jobs
- `/jobs/:id` — Job detail slide-over with AI summary, skills, status tracking
- `/add` — Paste URLs to enqueue
- `/queue` — Watch queue status with live polling
- `/resume` — Upload PDF and preview extracted text
- `/settings` — Configure AI model, cron schedule, search URLs
- `/stats` — Dashboard with score distribution and top companies

## Mock Data

All data is served from `src/mocks/data.ts`. Edit that file to customize jobs, queue items, resume, settings, and stats for your UI tests.
