// Lightweight, non-React mirror of "is a user currently signed in".
//
// Auth itself is httpOnly-cookie based, so JavaScript cannot read the token to
// answer this. Plain API modules (notifications, wishlist, addresses, user) use
// this flag as a fail-safe guard to avoid firing authenticated requests while
// logged out. It is kept in sync with the Redux auth session by StoreProvider's
// store subscriber — no token, no storage.

let authed = false;

export function setAuthed(value) {
  authed = Boolean(value);
}

export function isAuthed() {
  return authed;
}
