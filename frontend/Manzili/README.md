# Manzili — Frontend

The Next.js 16 storefront for Manzili, a marketplace for handmade Egyptian products. It is a
pure API client: every screen reads/writes through the **.NET backend** (`/api/v1/*`) — there
is no mock or dummy data.

## Run
```bash
npm install
npm run dev          # http://localhost:3000
```
Requires the backend running (default `http://localhost:5080`). Configure the API URL in
`.env.local`:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5080/api/v1
```

## How it's wired
- **`lib/api/`** — the HTTP layer. `client.js` does base-URL + `Authorization: Bearer` injection,
  unwraps the `{ success, data }` envelope, and transparently refreshes the JWT on 401. One module
  per domain (`auth`, `products`, `orders`, `wishlist`, `addresses`, `seller`, `custom`, `admin`,
  `notifications`, `ratings`, `upload`, `shipping`, `store`, `checkout`), each adapting the API DTO
  to the shape the UI expects.
- **`lib/features/`** — Redux Toolkit slices. Async data is loaded via `createAsyncThunk` calling
  `lib/api/*`. Only the **cart** and the **auth session/token** live in `localStorage`.
- **`app/`** — App Router pages: public storefront under `(public)/`, seller dashboard under
  `store/`, admin under `admin/`.

## Structure
```
app/            routes (public storefront, store dashboard, admin, api/ai)
components/     UI components
lib/
  api/          HTTP client + per-domain API modules  ← the data layer
  features/     Redux slices
  storage/      localStorage envelope (cart + session only)
  services/     localStateBootstrap (cart + auth session persistence)
  i18n/ ai/ …   locale, AI helpers, utilities
assets/         brand images, icons
```

## Build
```bash
npm run build    # production build (also the CI/type check)
```

See the repo root [`README.md`](../../README.md) and
[`docs/frontend-migration-documentation.html`](../../docs/frontend-migration-documentation.html)
for the full picture.
