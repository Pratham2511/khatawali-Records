import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const normalizeSupabaseUrl = (value) => {
  if (!value) return '';

  const cleaned = String(value).replace(/^project\s*url\s*-\s*/i, '').trim();
  const dashboardMatch = cleaned.match(/^https:\/\/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);

  if (dashboardMatch?.[1]) {
    return `https://${dashboardMatch[1]}.supabase.co`;
  }

  return cleaned.replace(/\/+$/, '');
};

const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);
const looksLikeSupabaseApiUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
  // Warn at runtime so developers remember to configure environment
  // eslint-disable-next-line no-console
  console.warn('Supabase credentials are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
} else if (!looksLikeSupabaseApiUrl) {
  // eslint-disable-next-line no-console
  console.warn('VITE_SUPABASE_URL must look like https://<project-ref>.supabase.co.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
