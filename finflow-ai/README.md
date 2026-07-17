# FinFlow AI

FinFlow AI is a personal financial operating system MVP. It is designed to help users manage budgets, salary allocation, savings, investments, loans, EMIs, debt payoff, transaction categorization, and AI-assisted financial guidance.

## Monorepo Layout

```text
finflow-ai/
  frontend/   React + Vite + Tailwind CSS
  backend/    FastAPI + SQLAlchemy + Pydantic
  data/       Seed and demo datasets
  docs/       Product and engineering docs
  scripts/    Local automation scripts
```

## Quickstart

Install frontend dependencies:

```bash
cd finflow-ai/frontend
npm install
npm run dev
```

Install backend dependencies:

```bash
cd finflow-ai/backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
python -m app.seed
python -m uvicorn app.main:app --reload
```

Start Postgres:

```bash
cd finflow-ai
docker compose up -d postgres
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://127.0.0.1:8000`
- API docs: `http://127.0.0.1:8000/docs`

## Environment

Copy the example env files before local development:

```bash
copy frontend\.env.example frontend\.env
copy backend\.env.example backend\.env
```

The backend can use SQLite for quick local bootstrapping or Postgres via Docker Compose.

Frontend environment variables:

- `VITE_API_BASE_URL` - Base URL for the FastAPI backend, defaulting to `http://127.0.0.1:8000/api/v1`.

Seeded demo credentials for first run:

- Email: `demo@finflow.ai`
- Password: `demo12345`
