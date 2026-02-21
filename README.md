# EpiTrace Frontend

A production-style monitoring dashboard built with Next.js App Router and TypeScript.

It integrates with the EpiTrace backend to provide:
- authentication (register/login)
- monitor lifecycle management
- webhook management and monitor associations
- GitHub token management and monitor associations
- live code-worker log streaming

## Tech Stack

- Next.js 15 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- `clsx` + `tailwind-merge`
- `framer-motion` + `gsap` (landing page motion effects)

## Prerequisites

- Node.js 20+ (recommended)
- npm 10+
- Running EpiTrace backend API

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create local environment file:

```bash
cp .env.example .env.local
```

3. Start development server:

```bash
npm run dev
```

4. Open:

```text
http://localhost:3000
```

## Environment Variables

Copy from `.env.example`:

```env
EPITRACE_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_API_PROXY_BASE=/api/backend
```

### Variables

- `EPITRACE_BACKEND_URL`
  - Backend base URL used by Next.js rewrite rules.
  - Default: `http://localhost:8080`

- `NEXT_PUBLIC_API_PROXY_BASE`
  - Client-side API base path used by the shared API client.
  - Must match rewrite source prefix in `next.config.ts`.
  - Default: `/api/backend`

## Available Scripts

- `npm run dev` — start local dev server
- `npm run build` — create production build
- `npm run start` — serve production build
- `npm run lint` — run Next.js ESLint checks

## Route Map

- `/` — marketing/landing page
- `/register` — user registration
- `/login` — user login
- `/dashboard` — monitor list, create monitor, quick monitor actions
- `/monitors/[id]` — monitor details, history, webhook/token associations
- `/monitors/[id]/live-logs` — live code-worker stream viewer (SSE)
- `/settings/github-tokens` — create/update/delete/activate GitHub tokens
- `/settings/webhooks` — create/update/delete/activate webhooks

## Authentication Behavior

- Session is stored in browser storage.
- Protected pages require a valid token and redirect unauthenticated users to `/register`.
- Auth pages (`/login`, `/register`) redirect authenticated users to `/dashboard`.
- API `401` responses trigger logout and redirect to login/register flow.

## Backend API Coverage

The UI is wired to these backend endpoints via `/api/backend/*` rewrite proxy:

### Health

- `GET /health`

### Auth

- `POST /auth/register`
- `POST /auth/login`

### Monitors

- `POST /monitor/create`
- `GET /monitor`
- `GET /monitor/:id`
- `PATCH /monitor/:id`
- `DELETE /monitor/:id`
- `POST /monitor/start/:id`
- `POST /monitor/pause/:id`
- `POST /monitor/resume/:id`
- `GET /monitor/:id/history`

### Webhooks

- `POST /webhook`
- `GET /webhook`
- `PATCH /webhook/:webhookId`
- `DELETE /webhook/:webhookId`
- `GET /webhook/monitor/:monitorId`
- `POST /webhook/monitor/:monitorId/add/:webhookId`
- `DELETE /webhook/monitor/:monitorId/remove/:webhookId`

### GitHub Tokens

- `POST /github-token`
- `GET /github-token`
- `GET /github-token/:tokenId`
- `PATCH /github-token/:tokenId`
- `DELETE /github-token/:tokenId`
- `GET /github-token/monitor/:monitorId`
- `POST /github-token/monitor/:monitorId/add/:tokenId`
- `DELETE /github-token/monitor/:monitorId/remove/:tokenId`

### Live Logs (SSE)

- `GET /logs/code-worker/stream`
- Optional query: `jobId`

## Project Structure

```text
src/
  app/                    # Next.js routes
  components/             # Reusable UI and feature components
  features/               # Feature-level hooks/state logic
  lib/
    api/                  # Backend API wrappers
    auth/                 # Session storage utilities
    config/               # Environment config helpers
    utils/                # Shared helpers
  types/                  # API and domain types
```

## Architecture Notes

- API calls are centralized in `src/lib/api/*` using a shared `apiRequest` client.
- Route pages in `src/app/*` orchestrate UI state and call feature/API modules.
- Presentational and form primitives are isolated in `src/components/*`.
- Errors are normalized and surfaced through consistent feedback components.

## Troubleshooting

- **Backend unreachable**
  - Verify `EPITRACE_BACKEND_URL` in `.env.local`.
  - Confirm backend is running and accessible from your machine.

- **API calls fail from browser**
  - Ensure `NEXT_PUBLIC_API_PROXY_BASE` matches rewrite source (`/api/backend`).
  - Restart dev server after changing environment variables.

- **Frequent auth redirects**
  - Token may be expired/invalid; log in again.
  - Confirm backend auth endpoints return expected token payload.

- **Live logs not connecting**
  - Confirm backend exposes `/logs/code-worker/stream` with SSE enabled.
  - Check URL and optional `jobId` in the live logs page controls.

## License

See [LICENSE](LICENSE).
