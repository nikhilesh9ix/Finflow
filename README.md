# FinFlow AI

FinFlow AI is a production-quality MVP for a personal AI CFO. It helps users manage spending, budgets, salary allocation, debts, investments, and financial questions using deterministic planning logic first, with an LLM-ready copilot layer.

## Stack

- Frontend: React, Vite, Tailwind CSS, Zustand, React Hook Form, Zod, Recharts
- Backend: FastAPI, PyMongo, Pydantic, JWT auth
- Database: MongoDB (local Community Server, or MongoDB Atlas via `MONGODB_URL`)
- File parsing: CSV upload
- AI layer: deterministic copilot now, OpenAI/Gemini keys supported by environment for future extension

## Quick Start

Prerequisite: MongoDB running on `mongodb://localhost:27017` (MongoDB Community Server, or `docker compose up -d mongo`).

Backend:

```bash
cd finflow-ai/backend
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

Open `http://localhost:5173`, create an account, then import a CSV from
`finflow-ai/data/seed/` on the Transactions page. Monthly income is worked out
from the salary credits in the statement.

## Architecture

```text
finflow-ai/backend/
  app/
    api/routes/        FastAPI route modules
    core/              settings and security
    db/                MongoDB client, Decimal128 codec, indexes
    models/            typed document models
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

The files in `finflow-ai/data/seed/` are ready-made examples — fifteen personas,
three months each. Any of them can be uploaded as is:

```csv
date,description,merchant,amount,type,category
2026-06-21,Coffee meeting,Blue Tokai,450,debit,Food
```

Required columns are `date`, `description`, and `amount`. Category is optional and will be inferred from keywords when blank.

## MongoDB

Set these in `finflow-ai/backend/.env`:

```env
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=finflow
```

For MongoDB Atlas, use its `mongodb+srv://...` connection string as `MONGODB_URL`.
Indexes are created automatically on startup; there are no migrations to run.

To browse the data, open [MongoDB Compass](https://www.mongodb.com/products/tools/compass)
and connect to the same URL.

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
cd finflow-ai/backend
pytest
```

Run frontend build:

```bash
cd frontend
npm run build
```
