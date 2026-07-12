# TransitOps — Smart Transport Operations Platform

A modern, comprehensive end-to-end transport operations platform designed to streamline fleet management. TransitOps handles everything from vehicle registries and driver management to trip dispatching, maintenance scheduling, and fuel expense tracking. 

Built with enterprise-grade role-based access control (RBAC), robust business rules, and real-time analytics to ensure your operations run smoothly and securely.

---

## ✨ Features

- **Role-Based Access Control (RBAC):** Tailored dashboards and permissions for Fleet Managers, Dispatchers, Safety Officers, and Financial Analysts.
- **Secure Authentication:** Self-hosted JWT authentication via `httpOnly` cookies, plus **Google OAuth** integration for quick access.
- **Vehicle Registry:** Complete lifecycle management for your fleet including status tracking, odometer readings, and regional assignments.
- **Driver Management:** Track driver licenses, safety scores, statuses, and automated daily email reminders for license renewals.
- **Trip Dispatching:** Plan routes, assign vehicles/drivers, track distances, fuel consumption, and total revenue.
- **Maintenance & Fuel Logs:** Log service repairs, track active/closed maintenance tickets, and monitor fuel expenses.
- **Data Exporting:** Generate CSV exports (via `papaparse`) and PDF reports (via `pdf-lib`).
- **Dark Mode Support:** Beautiful, fully responsive UI built with `shadcn/ui` and `next-themes`.

---

## 🛠 Tech Stack

TransitOps is built as a **single Next.js full-stack application** (frontend + API routes).

| Category | Technology |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router, TypeScript) for both UI and API (Route Handlers) |
| **Styling & UI** | [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), [Recharts](https://recharts.org/) |
| **State & Data** | [TanStack Query](https://tanstack.com/query/latest) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) (Containerized via Docker) |
| **ORM** | [Prisma](https://www.prisma.io/) |
| **Auth** | Custom JWT (`jose`), `bcrypt`, & Google OAuth |
| **Email Services** | `nodemailer` (SMTP) |

---

## 🚀 Getting Started

Follow these steps to build and run the application locally. 

### Prerequisites
- **Node.js** (v18 or higher)
- **Docker** and **Docker Compose** (for running the database)

### 1. Environment Variables
Clone the repository and configure your environment:
```bash
cp .env.example .env
```
Open the `.env` file and fill in your secrets (especially `JWT_SECRET`, `CRON_SECRET`, and your `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`).

### 2. Start the Database (Docker)
TransitOps comes with a `docker-compose.yml` file to instantly spin up a local PostgreSQL instance.
```bash
# Start the database in the background
docker compose up -d
```
*(The database will run on `localhost:5433` by default to avoid conflicts).*

### 3. Install Dependencies & Setup DB
Install the Node modules, push the schema to your new database, and seed the demo data.
```bash
npm install
npm run db:push
npm run db:seed
```

### 4. Run the Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` in your browser.

---

## 🔑 Demo Logins

If you successfully ran `npm run db:seed`, your database is populated with sample vehicles, drivers, trips, and users.

**Default Password for all demo accounts:** `password123`

| Role | Email |
|---|---|
| **Fleet Manager** | `fleet@transitops.in` |
| **Dispatcher** | `dispatcher@transitops.in` |
| **Safety Officer** | `safety@transitops.in` |
| **Financial Analyst** | `finance@transitops.in` |
| **Admin Setup** | `admin@transitops.in` |
| **John Dispatch** | `john@transitops.in` |

*(You can also use the **"Continue with Google"** button if you configured your OAuth credentials!)*
