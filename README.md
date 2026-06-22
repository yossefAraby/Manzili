# Manzili

A multi-vendor marketplace for **handmade Egyptian products** — *where real craft finds its home*.

This is a full-stack monorepo:

```
manzili/
├─ backend-dotnet/      .NET 10 Web API (ASP.NET Core + EF Core + PostgreSQL)
├─ frontend/Manzili/    Next.js 16 storefront (React 19 + Redux Toolkit + Tailwind)
└─ docs/                Interactive HTML documentation (backend + frontend migration)
```

The frontend talks to the backend over HTTP (`/api/v1/*`); the backend persists to a
**PostgreSQL database hosted on Supabase**. There is no mock/dummy data — the app runs
entirely on the real API.

## Tech stack
| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Redux Toolkit, Tailwind CSS |
| Backend | .NET 10 (ASP.NET Core controllers), EF Core 10 + Npgsql |
| Database | PostgreSQL (Supabase), schema `manzili` |
| Auth | JWT (HS256) + BCrypt |
| Integrations | Stripe (checkout), Cloudinary (images), Bosta (shipping) |

## Run it locally
You need the **.NET 10 SDK** and **Node 20+**.

**1 — Backend** (`http://localhost:5080`):
```bash
cd backend-dotnet
dotnet run --project src/Manzili.Api --urls http://localhost:5080
# Swagger: http://localhost:5080/swagger   ·   Health: /api/v1/health
```
Dev config (DB connection, JWT, Stripe/Cloudinary/Bosta keys) is read from
`backend-dotnet/src/Manzili.Api/appsettings.Development.json` (git-ignored).

**2 — Frontend** (`http://localhost:3000`):
```bash
cd frontend/Manzili
npm install
npm run dev
```
The API base URL is set in `frontend/Manzili/.env.local`
(`NEXT_PUBLIC_API_BASE_URL=http://localhost:5080/api/v1`).

## Documentation
Open these single-file docs in any browser:
- [`docs/backend-documentation.html`](docs/backend-documentation.html) — architecture, endpoints, concepts, deep dives.
- [`docs/frontend-migration-documentation.html`](docs/frontend-migration-documentation.html) — how the frontend was wired to the API.
- [`docs/manzili-openapi.json`](docs/manzili-openapi.json) — the API contract.

## Deploying (planned)
- **Frontend** → Vercel (root directory `frontend/Manzili`).
- **Backend** → Docker container (`backend-dotnet/Dockerfile`) on AWS; configure via env vars
  (`ConnectionStrings__Default`, `Manzili__*`).
- **Database** → already on Supabase.

> ⚠️ Before deploying: rotate the Supabase / Stripe / Bosta credentials and provide them as
> environment variables (not committed files), and set `Manzili__CorsOrigin` to the deployed
> frontend origin.
