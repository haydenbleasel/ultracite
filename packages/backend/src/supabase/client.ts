import { createBrowserClient } from '@supabase/ssr';

export const createSupabaseClient = (url: string, anonKey: string) => {
  return createBrowserClient(url, anonKey);
};
