# MailBase Workspace

## Overview

MailBase is a full-stack email marketing platform with domain management, contact lists, campaign sending with tracking, analytics, and transactional email templates. Built on a pnpm monorepo with TypeScript throughout.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + TailwindCSS + shadcn/ui
- **Charts**: Recharts
- **Email**: Resend API
- **Routing**: Wouter

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (all backend routes)
│   └── mailbase/           # React + Vite frontend
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema (Drizzle)

- **domains** — Sender domains registered with Resend
- **contacts** — Email recipients with tags, unsubscribe tokens
- **lists** — Contact groups
- **list_contacts** — Join table (list ↔ contact)
- **templates** — Reusable HTML email templates
- **campaigns** — Email campaigns (draft → sending → sent)
- **email_events** — Open/click/bounce tracking events
- **transactional_logs** — Transactional email send log

## API Routes (all under /api)

- `GET/POST /domains` — Domain CRUD
- `POST /domains/:id/verify` — Verify DNS with Resend
- `GET/POST /contacts` — Contact CRUD
- `POST /contacts/bulk` — Bulk import
- `GET/POST /lists` — List CRUD
- `GET/POST /lists/:id/contacts` — List membership
- `GET/POST /templates` — Template CRUD
- `GET/POST /campaigns` — Campaign CRUD
- `POST /campaigns/:id/send` — Send campaign (non-blocking)
- `GET /analytics/overview` — Aggregate stats
- `GET /analytics/campaign/:id` — Per-campaign stats
- `POST /transactional/send` — Send transactional email
- `GET /transactional/log` — Transactional send history

## Tracking Routes (outside /api)

- `GET /track/open/:campaignId/:contactId` — 1x1 tracking pixel
- `GET /track/click/:campaignId/:contactId?url=` — Click redirect tracker
- `GET /unsubscribe/:token` — One-click unsubscribe

## Frontend Pages

1. `/` — Overview (stat cards + area chart, 14-day window)
2. `/domains` — Domain list with DNS records, add/verify domain
3. `/campaigns` — Campaign list, new campaign form, send button
4. `/contacts` — Searchable contacts, add contact, CSV bulk import
5. `/analytics` — 7/14/30 day toggle, line + bounce bar charts
6. `/transactional` — Send transactional email, recent log table

## Businesses

Two businesses are supported: `equifind` (green accent #3effa0) and `inspection` (orange accent #ff6a3d). The sidebar has a business selector that scopes all API calls.

## Transactional Email Templates (hardcoded)

- `equifind/case_update` — Case status update
- `equifind/welcome` — Welcome email
- `inspection/report_ready` — Inspection report ready
- `inspection/appointment_confirm` — Appointment confirmation

## Environment Variables Required

- `RESEND_API_KEY` — Resend API key for email sending
- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned)
- `SESSION_SECRET` — Session secret (available)

## Development Commands

- `pnpm --filter @workspace/api-server run dev` — Start API server
- `pnpm --filter @workspace/mailbase run dev` — Start frontend
- `pnpm --filter @workspace/db run push` — Push DB schema
- `pnpm --filter @workspace/api-spec run codegen` — Regenerate API hooks
