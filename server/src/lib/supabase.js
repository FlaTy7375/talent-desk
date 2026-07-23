import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const secretKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  console.warn(
    "[supabase] SUPABASE_URL или SUPABASE_ANON_KEY не заданы в server/.env — auth не заработает"
  );
}

if (!secretKey) {
  console.warn(
    "[supabase] SUPABASE_SECRET_KEY не задан — Storage и административные операции недоступны"
  );
}

export const supabase = url && anonKey ? createClient(url, anonKey) : null;

export const supabaseAdmin =
  url && secretKey
    ? createClient(url, secretKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;
