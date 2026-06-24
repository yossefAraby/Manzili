import { migrateLocalStorage } from "@/lib/storage/localStorageEnvelope";

// Nothing about the user is stored in the browser anymore:
//   - the cart is ACCOUNT-LINKED on the .NET backend (loaded via GET /cart on bootstrap),
//   - the auth session is httpOnly-cookie based (rehydrated from GET /auth/me),
//   - addresses, wishlist, notifications, orders, etc. all live in the API.
// This module just runs the one-time migration that purges any legacy localStorage keys.

export function getInitialCartState() {
  // Start empty; StoreProvider hydrates the cart from the account after login.
  return { total: 0, cartItems: {} };
}

export function bootstrapLocalStorage() {
  // Clears out old/legacy localStorage keys (cart, demo catalog, addresses, …) so nothing
  // user-related lingers in the browser.
  migrateLocalStorage();
}

export function persistReduxState() {
  // Intentionally a no-op — kept so the StoreProvider subscriber import stays stable. Nothing is
  // mirrored to localStorage anymore.
}
