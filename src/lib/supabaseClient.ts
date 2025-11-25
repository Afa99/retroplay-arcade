import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// DEBUG: подивимось, що бачить Vite у проді
console.log("Supabase URL from env:", SUPABASE_URL);
console.log("Supabase key present:", !!SUPABASE_ANON_KEY);

if (!SUPABASE_URL) {
  throw new Error("VITE_SUPABASE_URL is missing. Check Vercel env variables.");
}
if (!SUPABASE_ANON_KEY) {
  throw new Error(
    "VITE_SUPABASE_ANON_KEY is missing. Check Vercel env variables."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
