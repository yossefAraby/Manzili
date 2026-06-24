# Manzili — Frontend

The Next.js 16 storefront for Manzili, a marketplace for handmade Egyptian products. It is a
pure API client: every screen reads/writes through the **.NET backend** (`/api/v1/*`) — there
is no mock or dummy data.

## Run
```bash
npm install
npm run dev          # http://localhost:3000
```
Requires the backend running (default `http://localhost:5080`). Copy `.env.example` → `.env.local`
and fill it in. The essentials:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:5080/api/v1   # the .NET backend (base path included)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...          # card checkout
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...apps.googleusercontent.com  # shows the "Continue with Google" button
NEXT_PUBLIC_KASHIER_ENABLED=true                        # shows the Mobile Wallet payment radio
```
`NEXT_PUBLIC_GOOGLE_CLIENT_ID` is required for the Google button to render at all (it returns `null`
when unset), and `NEXT_PUBLIC_KASHIER_ENABLED` gates the Mobile Wallet option. On Vercel, set these
same vars in the project's Environment Variables.

## How it's wired
- **`lib/api/`** — the HTTP layer. `client.js` prepends the base URL, fetches with
  `credentials: 'include'` so the browser carries the **httpOnly auth cookies** (no `Authorization`
  header, no token in JS), unwraps the `{ success, data }` envelope, and on a 401 transparently calls
  `/auth/refresh` once then retries. One module per domain (`auth`, `products`, `orders`, `wishlist`,
  `addresses`, `seller`, `custom`, `admin`, `notifications`, `ratings`, `upload`, `shipping`, `store`,
  `checkout`), each adapting the API DTO to the shape the UI expects.
- **`lib/features/`** — Redux Toolkit slices. Async data is loaded via `createAsyncThunk` calling
  `lib/api/*`. **Auth is never stored on the client** — the session lives in httpOnly cookies and is
  rehydrated from `GET /auth/me` on load. Only the **cart** (and the locale preference) is persisted
  in `localStorage`.
- **`app/`** — App Router pages: public storefront under `(public)/`, seller dashboard under
  `store/`, admin under `admin/`.

## Structure
```
app/            routes (public storefront, store dashboard, admin, api/ai)
components/     UI components
lib/
  api/          HTTP client + per-domain API modules  ← the data layer
  features/     Redux slices
  storage/      localStorage envelope (cart only)
  services/     localStateBootstrap (cart persistence; auth is cookie-backed, not stored here)
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
