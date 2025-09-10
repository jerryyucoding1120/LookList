import { sb } from '/assets/js/supabase-client.js';

/** Redirect unauthenticated users to /merchant/index.html (with ?signin=1&next=...) */
export async function requireUser() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search + location.hash);
    location.href = `/merchant/index.html?signin=1&next=${next}`;
    return null;
  }
  return user;
}

/** Start email magic link sign-in. Optionally pass a next URL to return to after auth. */
export async function signInWithEmail(email, next = '/merchant/listings.html') {
  const emailRedirectTo = `${location.origin}/merchant/index.html?post_auth=1&next=${encodeURIComponent(next)}`;
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo }
  });
  return { error };
}

export async function signOut() {
  await sb.auth.signOut();
  location.href = '/merchant/index.html';
}