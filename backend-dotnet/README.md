# .NET Backend (ASP.NET Core 8)

Same REST API as `backend/` (FastAPI), same Postgres database (`cre_comps`), same React frontend.

## Prerequisites

- .NET 8 SDK (`dotnet --version`; install script path often `$HOME/.dotnet`)
- PostgreSQL with schema + seed already applied via the Python seed script (`backend/scripts/seed_comps.py`) or `backend/sql/001_schema.sql`

## Configuration

`CreComps.Api/appsettings.json`:

- `ConnectionStrings:Default` — Postgres connection (default matches Python credentials)
- `CorsOrigins` — must include the Vite origin(s), e.g. `http://127.0.0.1:5173` and `http://127.0.0.1:5174`

Example file: `CreComps.Api/appsettings.Example.json`

## Run

```bash
export PATH="$HOME/.dotnet:$PATH"
cd backend-dotnet/CreComps.Api
dotnet run --urls http://127.0.0.1:8001
```

- Swagger: http://127.0.0.1:8001/swagger  
- Health: http://127.0.0.1:8001/api/health

One-command (from repo root): `BACKEND=dotnet FE_PORT=5174 ./scripts/dev.sh`

## Point the frontend here

```env
VITE_API_BASE_URL=http://127.0.0.1:8001/api
VITE_BACKEND_LABEL=.NET / ASP.NET Core
```

Or dual UI on port 5174 (see root `README.md`).

## Tests

```bash
cd backend-dotnet
dotnet test
```

## Notes

- Reuses tables: `comps`, `comp_notes`, `comp_tags`, `saved_searches` (does not create a separate database)
- JSON uses snake_case to match the frontend
- Features: list/filter/sort/pagination (incl. tag filter), detail + insights, notes/tags, analytics charts series, CSV export, compare, saved searches
- Postgres can serve Python and .NET at the same time; “Failed to fetch” in the browser is usually CORS, not SQL
