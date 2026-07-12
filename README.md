# TransitOps — Smart Transport Operations Platform

End-to-end transport operations platform: vehicle registry, driver management, trip
dispatching, maintenance, fuel & expense tracking, and analytics — with role-based access
control and enforced business rules.

Built as a **single Next.js full-stack app** (frontend + API routes) with a local PostgreSQL
database. **No FastAPI, no Supabase, no Firebase.**

## Tech Stack

| Concern   | Technology |
|-----------|-----------|
| Framework | Next.js 15 (App Router, TypeScript) — UI **and** API (Route Handlers) |
| UI        | shadcn/ui + TailwindCSS, TanStack Query, Recharts, next-themes (dark mode) |
| Database  | PostgreSQL (installed locally) |
| ORM       | Prisma |
| Auth      | Self-hosted JWT in **httpOnly cookies** (`jose`) + bcrypt — no third-party auth |
| Exports   | papaparse (CSV), pdf-lib (PDF) |

## Repository Layout

```
transit_ops_project/
├─ prisma/
│  ├─ schema.prisma       the 8 DB entities + enums (shared contract)
│  └─ seed.ts             demo roles/users/vehicles/drivers
├─ src/
│  ├─ app/
│  │  ├─ (auth)/          login, signup
│  │  ├─ (dashboard)/     dashboard, fleet, drivers, trips, maintenance,
│  │  │                   fuel-expenses, analytics, settings (+ shared layout)
│  │  └─ api/             Route Handlers = the backend
│  │     ├─ auth/         login, signup, logout, me   (✅ implemented)
│  │     ├─ vehicles/     CRUD                          (✅ reference impl)
│  │     ├─ trips/        lifecycle actions             (✅ wired to service)
│  │     ├─ maintenance/  create/close                  (✅ wired to service)
│  │     └─ drivers | fuel-logs | expenses | dashboard | analytics | exports | settings | cron
│  ├─ lib/                prisma, auth (JWT/cookies), rbac, api client, utils
│  ├─ server/services/    business rules — trip, maintenance, cost
│  ├─ components/ui/       shadcn components
│  └─ middleware.ts        redirects unauthenticated users to /login
└─ .env.example           copy to .env (DATABASE_URL, JWT_SECRET, …)
```

`✅` marks working reference implementations; everything else is a stubbed Route Handler /
page with a `TODO(Person X)` pointing to its owner in `build_plan.md`.

## Getting Started

### 1. Set up PostgreSQL (installed locally)
Install PostgreSQL 14+ ([download](https://www.postgresql.org/download/)), then create the
database and user (defaults match `.env.example`):
```sql
-- run in psql as a superuser
CREATE USER transitops WITH PASSWORD 'transitops';
CREATE DATABASE transitops OWNER transitops;
```
Confirm it's reachable at `localhost:5432` (adjust `DATABASE_URL` in `.env` if your
port/credentials differ).

### 2. Install + configure
```bash
cp .env.example .env      # then set JWT_SECRET etc.
npm install
```

### 3. Database
```bash
npm run db:generate       # generate Prisma client
npm run db:migrate        # create tables (first run: name it "init")
npm run db:seed           # demo data
```

### 4. Run
```bash
npm run dev               # http://localhost:3000
```

### 5. shadcn/ui (once)
```bash
npx shadcn@latest init    # then: npx shadcn@latest add button card input table dialog select badge
```

## Demo Logins (after seeding)

Password for all: `password123`

| Role | Email |
|------|-------|
| Fleet Manager | fleet@transitops.in |
| Dispatcher | dispatcher@transitops.in |
| Safety Officer | safety@transitops.in |
| Financial Analyst | finance@transitops.in |

## Team

Work is divided across 4 people in [`build_plan.md`](./build_plan.md). Read it before
starting — it defines ownership, the shared foundation to build first, and the API contract.
