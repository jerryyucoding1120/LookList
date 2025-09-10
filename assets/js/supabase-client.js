// Shared Supabase client (ES module)
// Usage: import { sb } from '/assets/js/supabase-client.js'
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Read optional page-level config
function getMeta(name) {
  const el = typeof document !== 'undefined' ? document.querySelector(`meta[name="${name}"]`) : null;
  return el?.content || null;
}

// DEFAULTS: set to your real project so all pages work even without meta tags
const DEFAULT_URL = 'https://rgzdgeczrncuxufkyuxf.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnemRnZWN6cm5jdXh1Zmt5dXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxOTI3MTAsImV4cCI6MjA3MTc2ODcxMH0.dYt-MxnGZZqQ-pUilyMzcqSJjvlCNSvUCYpVJ6TT7dU';

// Resolve final config (ENV/meta can override defaults)
const SUPABASE_URL =
  (typeof window !== 'undefined' && window.ENV?.SUPABASE_URL) ||
  getMeta('supabase-url') ||
  DEFAULT_URL;

const SUPABASE_ANON_KEY =
  (typeof window !== 'undefined' && window.ENV?.SUPABASE_ANON_KEY) ||
  getMeta('supabase-anon-key') ||
  DEFAULT_ANON_KEY;

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: { 'x-client-info': 'looklist-merchant' },
  },
});