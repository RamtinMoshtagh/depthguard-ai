import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

function mustGetEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function createSupabaseServer() {
  const url = mustGetEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = mustGetEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  // Validate URL format to catch typos/placeholders
  try { new URL(url); } catch { throw new Error(`Invalid NEXT_PUBLIC_SUPABASE_URL: ${url}`); }

  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set() {}, remove() {}
    }
  });
}
