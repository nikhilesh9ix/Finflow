# FinFlow AI

FinFlow AI is a production-quality MVP for a personal AI CFO. It helps users manage spending, budgets, salary allocation, debts, investments, and financial questions using deterministic planning logic first, with an LLM-ready copilot layer.

## Stack

- Frontend: React, Vite, Tailwind CSS, Zustand, React Hook Form, Zod, Recharts
- Backend: FastAPI, SQLAlchemy, Pydantic, JWT auth
- Database: SQLite by default for instant local demo, PostgreSQL via `DATABASE_URL`
- File parsing: CSV upload
- AI layer: deterministic copilot now, OpenAI/Gemini keys supported by environment for future extension

## Quick Start

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

Demo login:

- Email: `demo@finflow.ai`
- Password: `demo12345`

## Architecture

```text
backend/
  app/
    api/routes/        FastAPI route modules
    core/              settings and security
    db/                SQLAlchemy engine/session
    models/            database models
    schemas/           Pydantic request/response schemas
    seed/              demo data
    services/          finance, categorization, copilot logic
frontend/
  src/
    components/        reusable UI states and layout
    lib/               API client and formatters
    pages/             product modules
    store/             auth and theme state
```

## API Routes

- `GET /health`
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `GET /api/dashboard/summary`
- `GET /api/transactions`
- `POST /api/transactions`
- `POST /api/transactions/upload-csv`
- `GET /api/budgets`
- `POST /api/budgets`
- `GET /api/salary-orchestrator`
- `GET /api/debts`
- `POST /api/debts`
- `GET /api/debts/strategy`
- `GET /api/investments/suggestions`
- `POST /api/copilot/ask`
- `PATCH /api/profile`

## CSV Format

Use `sample_transactions.csv` as a template:

```csv
date,description,merchant,amount,category
2026-06-21,Coffee meeting,Blue Tokai,-450,Dining
```

Required columns are `date`, `description`, and `amount`. Category is optional and will be inferred from keywords when blank.

## PostgreSQL

Set this in `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/finflow
```

The app creates tables and seeds demo data on startup for the MVP.

## Screenshots

Add screenshots here after running locally:

- Dashboard
- Transactions upload
- Budget planner
- Salary orchestrator
- Debt manager
- AI copilot

## Verification

Run backend smoke checks:

```bash
cd backend
pytest
```

Run frontend build:

```bash
cd frontend
npm run build
```
