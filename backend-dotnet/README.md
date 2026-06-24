# Manzili API (.NET 10)

The backend for Manzili — an ASP.NET Core Web API over a PostgreSQL database, built to be
**easy to read for a beginner .NET developer** while following solid layering conventions.

> 📖 For a deep, interactive tour (architecture diagram, every endpoint, concepts, deep dives)
> open [`../docs/backend-documentation.html`](../docs/backend-documentation.html) in a browser.

## Run it
```bash
dotnet run --project src/Manzili.Api --urls http://localhost:5080
```
- Swagger UI (Development): `http://localhost:5080/swagger`
- Health check: `GET /api/v1/health` → `{ "success": true, "data": { "database": "connected" } }`
- Tests: `dotnet test`

Config (connection string, JWT secrets, Stripe / Kashier / Google / Cloudinary / Bosta keys) loads from
`src/Manzili.Api/appsettings.Development.json` in dev, or environment variables in production
(`ConnectionStrings__Default`, `Manzili__Jwt__Secret`, `Manzili__Stripe__SecretKey`,
`Manzili__Kashier__MerchantId/ApiKey/SecretKey`, `Manzili__GoogleAuth__ClientId`, …). A copy-me
template lives at `src/Manzili.Api/appsettings.example.json`.

## Project layout (4 layers, one-way dependencies)
```
src/
├─ Manzili.Api/            HTTP edge — controllers, Program.cs, middleware, JWT/CORS
│  ├─ Program.cs           composition root: DI, auth, pipeline
│  ├─ Common/ApiController  base controller: the { success, data } envelope + claim accessors
│  ├─ Middleware/          global exception → error envelope
│  └─ Controllers/         one controller per feature area
├─ Manzili.Application/    DTOs, FluentValidation validators, options, status maps  (no DB knowledge)
├─ Manzili.Infrastructure/ EF Core DbContext + 45 entities, feature services, integrations
│  ├─ Persistence/         ManziliDbContext + Entities/ (scaffolded from the DB)
│  ├─ Security/            PasswordHasher (BCrypt), TokenService (JWT)
│  └─ Services/            the business logic, one service per area
└─ Manzili.Domain/         enums / pure types
tests/Manzili.Tests/       xUnit integration tests (WebApplicationFactory)
```
**Dependency rule:** `Api → Application, Infrastructure`; `Infrastructure → Application, Domain`;
`Application → Domain`. Outer layers know inner ones, never the reverse.

## How a request flows
1. `ExceptionHandlingMiddleware` wraps everything (errors → `{ success:false, error }`).
2. CORS → Authentication (validate the JWT, read from the **httpOnly cookie** `manzili_at`, falling back to a bearer header) → Authorization (`[Authorize(Roles=…)]`).
3. The controller (inherits `ApiController`) reads claims, calls a service.
4. The service queries `ManziliDbContext` (EF Core → SQL → PostgreSQL).
5. The controller returns `ApiOk(data)` → `{ success: true, data: … }`.

## Conventions worth knowing
- **Response envelope:** success → `{ success, data, …meta }`; failure → `{ success:false, error:{ message, code, details? } }`. Services *throw* typed exceptions (`NotFoundException`, `ConflictException`, …); the middleware turns them into the envelope.
- **Database-first:** entities + `ManziliDbContext` were scaffolded from the existing PostgreSQL `manzili` schema (no migrations — the schema is owned upstream).
- **Feature modules:** each area self-registers via an `Add{Feature}()` extension called from `AddInfrastructure()`, so `Program.cs` stays small.
- **Status maps:** DB stores statuses as integers; `Manzili.Application.Common.StatusMaps` translates to/from strings.

## Containerize
A multi-stage `Dockerfile` is included (SDK build → slim ASP.NET runtime). Supply config via
environment variables at run time.
