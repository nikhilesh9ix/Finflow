# FinFlow AI

A personal financial copilot for Indian salaried professionals. Import a bank
statement and FinFlow categorises every transaction, derives your monthly income,
tracks budgets, plans debt payoff and salary allocation, and answers questions
about your money through an AI copilot grounded in your own data.

**Live:** https://finflow-one-kappa.vercel.app

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4, TanStack Query, Zustand, Recharts |
| Backend | FastAPI, Pydantic v2, PyMongo |
| Database | MongoDB 8.0 (local, or MongoDB Atlas) — money stored as Decimal128 |
| Auth | Argon2id password hashing, JWT with server-side revocation |
| AI copilot | Groq (`openai/gpt-oss-120b`) or Anthropic Claude, with a rule-based fallback |
| Deployment | Docker, Render (backend), Vercel (frontend), GitHub Actions CI |

## Project structure

```text
.
├── backend/                FastAPI service
│   ├── app/
│   │   ├── ai/             copilot loops and tool definitions
│   │   ├── api/routes/     HTTP routes
│   │   ├── core/           settings, security, rate limiting
│   │   ├── db/             MongoDB client, Decimal128 codec, indexes
│   │   ├── models/         document models
│   │   ├── schemas/        request and response contracts
│   │   ├── services/       analytics, CSV import, categorisation
│   │   └── seed.py         optional demo-user seeder
│   ├── tests/              pytest suite (runs against a real MongoDB)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/               React single-page app
│   └── src/
│       ├── components/     layout, copilot widget, shared UI states
│       ├── lib/            API client, queries, formatters
│       ├── pages/          one module per screen
│       └── store/          auth and theme state
├── data/
│   ├── seed/               15 sample bank statements (personas)
│   └── demo-upload/        5 statements for a live upload demo
├── docs/
│   └── DEPLOYMENT.md       Atlas + Render + Vercel walkthrough
├── .github/workflows/      CI: lint, tests, build, Docker
├── docker-compose.yml      local stack: MongoDB + backend + frontend
├── docker-compose.prod.yml production overrides
└── render.yaml             Render blueprint for the backend
```

## Running locally

**Prerequisites:** Python 3.12, Node 20, and MongoDB on `mongodb://localhost:27017`
(MongoDB Community Server, or `docker compose up -d mongo`).

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env            # macOS/Linux: cp .env.example .env
python -m uvicorn app.main:app --reload
```

Frontend, in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173, create an account, and upload any file from
`data/seed/` on the Transactions page. Monthly income is worked out from the
salary credits in the statement — it is never typed in.

Interactive API docs: http://127.0.0.1:8000/api/docs (disabled in production).

Or run the whole stack in Docker: `docker compose up --build`, then open http://localhost.

## Configuration

`backend/.env`:

| Variable | Purpose |
|---|---|
| `MONGODB_URL` | `mongodb://localhost:27017`, or an Atlas `mongodb+srv://…` string |
| `MONGODB_DB` | database name, default `finflow` |
| `SECRET_KEY` | JWT signing key — required when `APP_ENV=production` |
| `GROQ_API_KEY` | optional; enables the LLM copilot |
| `ANTHROPIC_API_KEY` | optional; used when no Groq key is set |
| `BACKEND_CORS_ORIGINS` | comma-separated allowed frontend origins |

With no AI key the copilot still answers, using deterministic rules over your data.

`frontend/.env`: `VITE_API_BASE_URL`, default `http://127.0.0.1:8000/api/v1`.

## Sample data

`data/seed/` holds fifteen personas, three months each — from a gig worker on
₹26k/month to a startup engineer investing ₹1 lakh/month, including two who spend
more than they earn. The files deliberately vary in format (ISO and day-first
dates, `₹` and Indian comma amounts, missing optional columns) so the importer is
exercised, not just the happy path.

CSV columns — only the first three are required:

```csv
date,description,amount,merchant,type,category
2026-06-21,Coffee meeting,450,Blue Tokai,debit,Food
```

Without a `type` column, a negative amount is read as an expense. A blank
`category` is inferred from the description.

## API

All routes are under `/api/v1`. The main groups:

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/logout` · `GET /auth/me` |
| Transactions | `GET/POST /transactions` · `POST /transactions/upload` · `GET /transactions/recurring` |
| Dashboard & analytics | `GET /dashboard/summary` · `GET /analytics/{summary, category-breakdown, monthly-spend, income-vs-expense, top-merchants, recurring-transactions}` |
| Budgets | `GET/POST /budgets` · `PUT/DELETE /budgets/{id}` · `GET /budgets/alerts` |
| Debts | `GET/POST /debt-accounts` · `DELETE /debt-accounts/{id}` · `GET /debt-accounts/strategy` |
| Planning | `GET /salary-plan` · `GET/PUT /investment-profile` · `GET/POST /savings-goals` |
| Copilot | `POST /copilot/ask` · `GET /copilot/history` |

## Tests

```bash
cd backend
pytest                 # 143 tests against a throwaway MongoDB database
python -m ruff check .

cd frontend
npx tsc --noEmit
npm run build
```

The test suite creates a database named `finflow_test_<random>` and drops it
afterwards; it refuses to run against any database without that prefix.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — MongoDB Atlas for the database,
Render for the backend (`render.yaml`), Vercel for the frontend.
