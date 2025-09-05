import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const SUPABASE_URL = "https://rgzdgeczrncuxufkyuxf.supabase.co";
// Using the same anon key as your auth.js for consistency
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnemRnZWN6cm5jdXh1Zmt5dXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxOTI3MTAsImV4cCI6MjA3MTc2ODcxMH0.dYt-MxnGZZqQ-pUilyMzcqSJjvlCNSvUCYpVJ6TT7dU";

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);