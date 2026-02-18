# EpiTrace Frontend

Modern Next.js + Tailwind frontend for the EpiTrace backend APIs.

## What I implemented

- Created a standalone frontend app in `EpiTrace-Frontend/` with App Router and TypeScript.
- Added Tailwind CSS setup using the current PostCSS plugin flow.
- Built complete auth flow:
  - Register page (default entry)
  - Login page with link switching
  - Local session storage + protected routes
- Built monitor management flow:
  - Create monitor
  - List all monitors
  - Start, pause, resume, delete monitor
  - View monitor details
  - Update monitor
  - View monitor history report
  - Manage user webhooks and link/unlink them per monitor
- Added backend health indicator using `/health`.
- Implemented reusable, modular architecture:
  - Shared API client with centralized error handling
  - Feature hooks for auth guards/forms
  - Reusable UI components (button, inputs, alerts, badges)
  - Reusable monitor components (form, actions, card, history table)

## Endpoint coverage

All endpoints from `EPITRACE.postman_collection.json` are wired in UI:

- `GET /health` -> health indicator (`BackendHealth`)
- `POST /auth/register` -> register page
- `POST /auth/login` -> login page
- `POST /monitor/create` -> create monitor form
- `GET /monitor` -> dashboard monitor list
- `GET /monitor/:id` -> monitor detail page
- `PATCH /monitor/:id` -> update monitor form
- `DELETE /monitor/:id` -> delete actions (dashboard/detail)
- `POST /monitor/start/:id` -> start action
- `POST /monitor/pause/:id` -> pause action
- `POST /monitor/resume/:id` -> resume action
- `GET /monitor/:id/history` -> monitor history report
- `POST /webhook` -> create webhook
- `GET /webhook` -> list user webhooks
- `GET /webhook/monitor/:monitorId` -> list monitor webhooks
- `POST /webhook/monitor/:monitorId/add/:webhookId` -> attach webhook to monitor
- `DELETE /webhook/monitor/:monitorId/remove/:webhookId` -> remove webhook from monitor

## Tech stack

- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- `clsx` + `tailwind-merge` for class composition

## Setup

1. Go to the frontend folder:

```bash
cd EpiTrace-Frontend
```

2. Create environment file:

```bash
cp .env.example .env.local
```

3. Update API URL if needed:

```env
EPITRACE_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_API_PROXY_BASE=/api/backend
```

4. Install and run:

```bash
npm install
npm run dev
```

5. Open:

- `http://localhost:3000/register`

## Architecture notes

- `src/lib/api/*`: transport and endpoint functions only.
- `src/lib/auth/*`: storage/session utilities only.
- `src/features/*`: behavior/state hooks.
- `src/components/*`: presentational and reusable UI blocks.
- `src/app/*`: route pages that compose features + components.
- `next.config.ts`: backend rewrite proxy configuration.

This separation keeps API changes, UI tweaks, and behavior logic isolated for easier maintenance.

## Notes

- Backend (`server/`) was treated as read-only.
- Frontend uses a same-origin Next.js rewrite proxy (`/api/backend/*`) to avoid browser CORS issues.
- Frontend expects backend JWT auth (`Authorization: Bearer <token>`) for monitor routes.

## Docs used

- Next.js App Router docs: https://nextjs.org/docs/app
- Next.js Tailwind guide: https://nextjs.org/docs/app/guides/tailwind-css
- Tailwind Next.js guide: https://tailwindcss.com/docs/installation/framework-guides/nextjs
