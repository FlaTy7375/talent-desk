import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.warn(
    "[supabase] Задай VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в client/.env"
  );
}

export const supabase = createClient(url || "", anonKey || "");
