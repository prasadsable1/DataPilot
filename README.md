# DataPilot

DataPilot is a local-first analytics workspace for uploading CSV/XLSX datasets, exploring paginated data, previewing and applying cleaning operations, calculating statistics, creating charts, and reviewing transparent rule-based insights.

> **Security and deployment:** The first version uses a random browser-session identifier for dataset ownership. It is not authentication or production-grade authorization. Anyone with access to the same browser profile can access its datasets. Uploaded files are stored on the backend's local disk; configure durable private storage before deploying to an ephemeral host.

## Features

- CSV and XLSX uploads, size/type checks, upload progress, and dataset metadata.
- Owner-scoped dataset history, metadata in MySQL, and persistent originals plus distinct working copies on disk.
- Server-side search, sorting, and bounded pagination for the data explorer.
- Cleaning previews and apply actions for missing values, duplicates, column removal/rename, and supported type conversions.
- Pandas/NumPy statistics, Recharts charts, IQR-based outlier checks, correlations, and explainable insights.
- CSV export of the actual cleaned working copy and JSON analytics summaries.
- FastAPI validation, Swagger docs, configurable CORS, and API tests.

## Stack and structure

- Frontend: React, Vite, JavaScript, Tailwind CSS v4, React Router, Axios, Recharts, Lucide React.
- Backend: Python, FastAPI, Pandas, NumPy, SQLAlchemy, PyMySQL, Pydantic.
- Database: MySQL. SQLite and PostgreSQL are not supported.

```text
backend/
  app/                 API, MySQL models, analytics and routes
  tests/               API tests (mock metadata session; no SQLite)
  requirements.txt
  .env.example
frontend/
  src/
    components/
    hooks/
    pages/
    services/
  package.json
  vite.config.js
```

## Prerequisites

- Windows 11 / PowerShell
- Python 3.11+ (`py`) and Node.js/npm
- A running MySQL server and a database/user you can configure

## MySQL setup

Create a database and a dedicated local user using an administrator account. For example, in the MySQL client (choose your own password and replace the example values):

```sql
CREATE DATABASE datapilot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'datapilot_user'@'localhost' IDENTIFIED BY 'choose-a-strong-password';
GRANT ALL PRIVILEGES ON datapilot.* TO 'datapilot_user'@'localhost';
FLUSH PRIVILEGES;
```

The application creates its `datasets` table at API startup. It does not create MySQL accounts/databases or embed credentials.

## Configure and run the backend

From PowerShell:

```powershell
cd C:\Users\Prasad\DataPilot\backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
```

Preserve an existing `backend\.env`; do not overwrite its credentials.
Set `MYSQL_PASSWORD` in `backend\.env`, or set `DATABASE_URL` to a `mysql+pymysql://` URL. URL-encode special characters in a URL's username/password. Set `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, and `MYSQL_USER` as needed. `FRONTEND_ORIGINS` is a comma-separated allowlist and `MAX_UPLOAD_MB` limits uploads (default 50 MB).

Start FastAPI:

```powershell
cd C:\Users\Prasad\DataPilot\backend
.\.venv\Scripts\Activate.ps1
py -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Health check: `http://127.0.0.1:8000/api/health`  
Swagger UI: `http://127.0.0.1:8000/docs`

## Configure and run the frontend

In another PowerShell terminal:

```powershell
cd C:\Users\Prasad\DataPilot\frontend
npm install
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). Vite proxies `/api` to `http://127.0.0.1:8000`. If that backend port is already in use, set `DATAPILOT_API_PROXY_TARGET` before starting Vite (for example, `http://127.0.0.1:8001`). For a separately hosted API URL, set `VITE_API_URL` in `frontend\.env.local` (see `frontend\.env.example`).

## One-click local startup (Windows)

After cloning the repository, open PowerShell in its root folder and run:

```powershell
.\start-datapilot.ps1
```

The script creates a backend virtual environment and installs missing dependencies, then opens separate windows for the API and frontend. On first run, it creates `backend\.env` from the example and stops so you can configure MySQL; run the script again after MySQL is ready. Keep both launched windows open while using the app.

## Tests and checks

Backend tests use an in-memory fake metadata session and temporary files so they do not need MySQL credentials. They exercise real FastAPI routes and file/analytics behavior:

```powershell
cd C:\Users\Prasad\DataPilot
py -m pytest backend\tests -q
```

Frontend production build and lint:

```powershell
cd C:\Users\Prasad\DataPilot\frontend
npm run build
npm run lint
```

## Data handling and operational notes

- Original uploads are never overwritten by cleaning actions. A CSV working copy is used for preview, cleaning, analysis, and export.
- MySQL stores dataset records and ownership/session IDs; source and working files live below `DATA_STORAGE_DIR` (default `./storage`, relative to the backend working directory).
- Back up MySQL and the storage directory as a pair. The owner token is a browser-local random UUID and is not a substitute for authentication.
- Do not commit `.env` files or uploaded datasets. The root `.gitignore` excludes local secrets and `backend/storage/`.
- The upload size cap limits source bytes, but datasets still consume memory during Pandas analysis. Tune it for the machine and workload.
- Before deployment, add real authentication/authorization, rate limiting, structured operational logging, private object storage with lifecycle/backup policies, HTTPS, and a tested MySQL/storage backup plan. Render local disks are not durable by default; Vercel is for the frontend, and a hosted MySQL/storage provider must be selected and configured separately. No deployment or paid service is included.

## Possible next steps

- Add authenticated accounts and explicit per-user access controls.
- Add durable object storage and a managed background-analysis queue for large datasets.
- Add broader workbook-sheet selection, saved visualization configurations, and accessibility/browser tests.
