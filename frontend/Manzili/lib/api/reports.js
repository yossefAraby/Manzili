// Report submission for the .NET backend (the buyer "flag" button).
// POST /reports creates a PENDING report that admins review under /admin/reports.

import { apiPost } from './client';

/**
 * Create a report. Requires a signed-in user (the backend records the reporter).
 * Throws ApiError on failure so the caller can prompt sign-in / show the error.
 */
export async function createReport({
  type,
  reason,
  description,
  productId,
  storeId,
  storeOrderId,
  customRequestId,
} = {}) {
  const res = await apiPost('/reports', {
    type: type || 'GENERAL',
    reason,
    description: description || null,
    productId: productId != null ? String(productId) : null,
    storeId: storeId != null ? String(storeId) : null,
    storeOrderId: storeOrderId != null ? String(storeOrderId) : null,
    customRequestId: customRequestId != null ? String(customRequestId) : null,
  });
  return res?.data ?? null;
}
