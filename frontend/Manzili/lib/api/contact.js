// Contact-us + newsletter for the .NET backend. Both endpoints are anonymous; the backend emails
// when SMTP is configured and otherwise accepts + logs (so the forms work in the demo).

import { apiPost } from './client';

export async function sendContact({ name, email, subject, message } = {}) {
  const res = await apiPost('/contact', { name, email, subject, message }, { auth: false });
  return res?.data ?? { received: true };
}

export async function subscribeNewsletter(email) {
  const res = await apiPost('/newsletter', { email }, { auth: false });
  return res?.data ?? { received: true };
}
