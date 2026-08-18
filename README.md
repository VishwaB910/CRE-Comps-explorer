# CRE Comps Explorer

Internal web app for searching, filtering, annotating CRE sale comps, and viewing market analytics.

## Stack


| Layer     | Tech                                   | Location / port             |
| --------- | -------------------------------------- | --------------------------- |
| Frontend  | React + Vite + React Router + Recharts | `frontend/`                 |
| Backend A | FastAPI + SQLAlchemy (Python)          | `backend/` → `:8000`        |
| Backend B | ASP.NET Core 8 (C# / .NET)             | `backend-dotnet/` → `:8001` |
| Database  | PostgreSQL                             | `cre_comps` (shared)        |


Both backends expose the **same REST API** (snake_case JSON). One React UI can talk to either backend via `VITE_API_BASE_URL`.

## Prerequisites

- Python 3.10+ (conda `base` is fine)
- Node.js 18+
- .NET 8 SDK (only if using the .NET backend; often at `$HOME/.dotnet`)
- PostgreSQL 14+ running locally
- DB user that can create tables in `cre_comps`

## How to run

Do **first-time setup** once, then use **Option A** (one stack), **Option B** (both stacks), or **Option C** (manual).

### First-time setup

1. Start PostgreSQL and create the database (as superuser if your app user lacks `CREATEDB`):

```bash
sudo -u postgres psql -c "CREATE DATABASE cre_comps OWNER statbrio;"
sudo -u postgres psql -d cre_comps -c "GRANT ALL ON SCHEMA public TO statbrio;"
```

1. Copy env files and install dependencies:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

conda activate base
cd backend && pip install -r requirements.txt && cd ..
cd frontend && npm install && cd ..
```

Default DB settings in `backend/.env`:

```env
SQL_USER=statbrio
SQL_PASS=2001
SQL_HOST=localhost
SQL_PORT=5432
SQL_DB=cre_comps
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174
```

Schema source of truth: `backend/sql/001_schema.sql`  
Tables: `comps`, `comp_notes`, `comp_tags`, `saved_searches`  
Seed loads `sample_comps.csv` (40 rows) plus demo notes/tags on comps `1`, `4`, `14`, `21`, and `29`.

---

### Option A — one stack (`./scripts/dev.sh`)

`scripts/dev.sh` checks Postgres, **seeds** the DB, starts **one API + one frontend**, frees its ports if leftovers are stuck, and stops both on `Ctrl+C`.

```bash
chmod +x scripts/dev.sh   # once, if needed
```

#### Python only (default)

```bash
./scripts/dev.sh
```


| Piece    | URL                                                      |
| -------- | -------------------------------------------------------- |
| App      | [http://127.0.0.1:5173](http://127.0.0.1:5173)           |
| API      | [http://127.0.0.1:8000](http://127.0.0.1:8000)           |
| API docs | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) |


#### .NET only

```bash
BACKEND=dotnet FE_PORT=5174 ./scripts/dev.sh
```


| Piece   | URL                                                            |
| ------- | -------------------------------------------------------------- |
| App     | [http://127.0.0.1:5174](http://127.0.0.1:5174)                 |
| API     | [http://127.0.0.1:8001](http://127.0.0.1:8001)                 |
| Swagger | [http://127.0.0.1:8001/swagger](http://127.0.0.1:8001/swagger) |


#### Script env vars


| Variable  | Default  | Meaning                                                            |
| --------- | -------- | ------------------------------------------------------------------ |
| `BACKEND` | `python` | `python` → FastAPI `:8000`, or `dotnet` → ASP.NET `:8001`          |
| `FE_PORT` | `5173`   | Vite UI port (use `5174` for .NET so both stacks can run together) |


```bash
./scripts/dev.sh                              # Python
BACKEND=dotnet FE_PORT=5174 ./scripts/dev.sh  # .NET
FE_PORT=5180 ./scripts/dev.sh                 # Python UI on a custom port
```

---

### Option B — both stacks at once (Python + .NET)

Use **two terminals**. Each run owns one API + one UI. They share Postgres.

**Terminal 1 — Python**

```bash
./scripts/dev.sh
```

**Terminal 2 — .NET**

```bash
BACKEND=dotnet FE_PORT=5174 ./scripts/dev.sh
```


| UI            | URL                                            | Backend         |
| ------------- | ---------------------------------------------- | --------------- |
| Python-backed | [http://127.0.0.1:5173](http://127.0.0.1:5173) | FastAPI `:8000` |
| .NET-backed   | [http://127.0.0.1:5174](http://127.0.0.1:5174) | ASP.NET `:8001` |


Each UI shows a badge with which backend it uses.  
`Ctrl+C` in a terminal stops **that** stack only.

> Both terminals re-run the seed script on start (idempotent upsert). That is expected.

---

### Option C — manual (no `dev.sh`)

**1. Seed** (once, or when schema/data changes)

```bash
conda activate base
python backend/scripts/seed_comps.py
```

**2. Python API** (`:8000`)

```bash
conda activate base
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)  
- Health: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

**3. .NET API** (`:8001`) — optional

```bash
export PATH="$HOME/.dotnet:$PATH"
cd backend-dotnet/CreComps.Api
dotnet run --urls http://127.0.0.1:8001
```

- Swagger: [http://127.0.0.1:8001/swagger](http://127.0.0.1:8001/swagger)  
- Health: [http://127.0.0.1:8001/api/health](http://127.0.0.1:8001/api/health)  
- Config / CORS: `backend-dotnet/CreComps.Api/appsettings.json`  
- More detail: `backend-dotnet/README.md`

**4. Frontend(s)**

Python-backed UI:

```bash
cd frontend
VITE_API_BASE_URL=http://127.0.0.1:8000/api \
VITE_BACKEND_LABEL="Python / FastAPI" \
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

.NET-backed UI (second terminal):

```bash
cd frontend
VITE_API_BASE_URL=http://127.0.0.1:8001/api \
VITE_BACKEND_LABEL=".NET / ASP.NET Core" \
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Helper env files: `frontend/.env.python`, `frontend/.env.dotnet`  
Default `frontend/.env` / `.env.example` points at Python `:8000`. Restart Vite after changing env vars.

---

### Troubleshooting


| Problem                                   | Fix                                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `dev.sh` exits right after the first line | Usually conda + `set -u`; current `scripts/dev.sh` already works around this. Re-pull/save the latest script. |
| `Port 5173 is already in use`             | Latest `dev.sh` frees its ports automatically. Or: `fuser -k 5173/tcp` (same for `8000` / `5174` / `8001`).   |
| PostgreSQL not accepting connections      | `sudo service postgresql start` then re-run.                                                                  |
| Browser **Failed to fetch**               | CORS: ensure `CORS_ORIGINS` / .NET `CorsOrigins` include the UI origin (`:5173` and/or `:5174`).              |
| Wrong backend badge / empty data          | Confirm `VITE_API_BASE_URL` matches the API you started; restart Vite after env changes.                      |


## UI routes


| Route              | Page                                                                            |
| ------------------ | ------------------------------------------------------------------------------- |
| `/`                | Comps list (search, filters, tag, saved searches, compare select, keyboard nav) |
| `/comps/:compId`   | Comp detail (insights, notes, tags)                                             |
| `/compare?ids=1,2` | Side-by-side compare (2–4 comps)                                                |
| `/analytics`       | Market analytics tables + charts                                                |


## Features

**Required (take-home)**

- Comps list: search (address/city), filters, sortable columns, pagination
- Comp detail route
- Persistent notes & tags
- Market analytics (by market / by property type)
- Schema + CSV seed script
- Validation & sensible API errors
- Automated backend tests
- `README.md` + `AI_LOG.md`

**Stretch / extras (included)**

- CSV export of filtered comps
- Analytics charts (Recharts)
- Saved searches (auto-named; dropdown in filter bar)
- Comp comparison (2–4 comps)
- Detail insight strip (vs market $/SF, vs type cap)
- Loading skeletons + empty states
- Keyboard-friendly table (`/` focus search, ↑/↓, Enter)
- Filter by tag + active filter chips
- Toast confirmations (save / note / tag / export)
- Demo notes/tags on seed
- One-command local run (`scripts/dev.sh`)
- Dual backend (.NET twin) with the same API

**Out of scope (per assignment — not built)**

- Auth, multi-user permissions, production deploy / CI

## Tests

```bash
# Python
cd backend && pytest -q

# .NET
cd backend-dotnet && dotnet test
```

Latest local verification: **12** Python tests + **9** .NET tests passing.

## API overview (both backends)

List query params (shared): `q`, `property_type`, `market`, `tag`, `min_price`, `max_price`, `min_cap_rate`, `max_cap_rate`, `sale_date_from`, `sale_date_to`, `sort_by`, `sort_order`, `page`, `page_size`.


| Method          | Path                       | Purpose                                      |
| --------------- | -------------------------- | -------------------------------------------- |
| GET             | `/api/health`              | Health check                                 |
| GET             | `/api/comps`               | List/search/filter/sort/paginate (incl. tag) |
| GET             | `/api/comps/meta/filters`  | Distinct markets / property types / tags     |
| GET             | `/api/comps/export`        | CSV export (same filters as list)            |
| GET             | `/api/comps/compare`       | Compare comps (`ids=1,2,3`)                  |
| GET             | `/api/comps/{id}`          | Detail + notes/tags + insights               |
| GET/POST/DELETE | `/api/comps/{id}/notes`    | Notes                                        |
| GET/POST/DELETE | `/api/comps/{id}/tags`     | Tags                                         |
| GET/POST        | `/api/saved-searches`      | List / create saved filter sets              |
| DELETE          | `/api/saved-searches/{id}` | Delete a saved search                        |
| GET             | `/api/analytics`           | Aggregates + trend series                    |


## Assumptions

- Single-analyst local tool (no auth).
- Seed comps come from `sample_comps.csv` (40 rows); demo notes/tags are additive only.
- Tags are stored normalized to lowercase.
- Notes/tags can be deleted from the detail page.
- Postgres is shared; both backends can run at once.
- If the browser shows **Failed to fetch**, check CORS for the frontend port.

## Project layout

```text
.
├── sample_comps.csv
├── CRE_Comps_Explorer_Take_Home.md
├── README.md
├── requirements.txt             # root hint list (install from backend/)
├── scripts/
│   └── dev.sh                   # one-command local run (python or dotnet)
├── backend/                     # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── comp_filters.py
│   │   └── routers/             # comps, notes, tags, analytics, extras
│   ├── sql/001_schema.sql
│   ├── scripts/seed_comps.py
│   ├── tests/test_api.py
│   ├── requirements.txt
│   └── .env.example
├── backend-dotnet/              # ASP.NET Core 8
│   ├── CreComps.sln
│   ├── CreComps.Api/
│   ├── CreComps.Api.Tests/
│   └── README.md
└── frontend/                    # React (Vite)
    ├── src/
    │   ├── App.jsx
    │   ├── api.js
    │   ├── pages/               # list, detail, compare, analytics
    │   ├── components/          # Layout, EmptyState, Skeleton, Toast
    │   └── utils/format.js
    ├── .env.example
    ├── .env.python
    └── .env.dotnet
```

