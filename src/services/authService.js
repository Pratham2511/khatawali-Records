import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { supabase } from './supabaseClient';

export const NATIVE_AUTH_CALLBACK_URL = 'khatawali://login-callback';

const KNOWN_NATIVE_CALLBACK_PREFIXES = [
  'khatawali://login-callback',
  'com.khatawali.app://auth/callback',
  'com.khatawali.app://login-callback'
];

const isNativePlatform = () => Capacitor.isNativePlatform();

const getOAuthRedirectUrl = () => {
  if (isNativePlatform()) return NATIVE_AUTH_CALLBACK_URL;
  if (typeof window !== 'undefined') return `${window.location.origin}/dashboard`;
  return NATIVE_AUTH_CALLBACK_URL;
};

export const isNativeOAuthCallbackUrl = (url) => {
  if (!url) return false;
  return KNOWN_NATIVE_CALLBACK_PREFIXES.some((prefix) => url.startsWith(prefix));
};

const parseHashParams = (url) => {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) return new URLSearchParams();
  return new URLSearchParams(url.slice(hashIndex + 1));
};

const closeBrowserIfNeeded = async () => {
  if (!isNativePlatform()) return;
  try {
    await Browser.close();
  } catch {
    // Browser may already be closed.
  }
};

export const signInWithGoogle = async () => {
  const options = {
    redirectTo: getOAuthRedirectUrl(),
    queryParams: {
      prompt: 'select_account'
    },
    ...(isNativePlatform() ? { skipBrowserRedirect: true } : {})
  };

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options
  });

  if (error) {
    return { data, error };
  }

  if (isNativePlatform() && data?.url) {
    await Browser.open({ url: data.url });
  }

  return { data, error: null };
};

export const completeOAuthFromCallbackUrl = async (callbackUrl) => {
  if (!callbackUrl) {
    return { data: null, error: new Error('Missing OAuth callback URL.') };
  }

  try {
    const parsedUrl = new URL(callbackUrl);
    const oauthError = parsedUrl.searchParams.get('error_description') || parsedUrl.searchParams.get('error');

    if (oauthError) {
      return { data: null, error: new Error(oauthError) };
    }

    const code = parsedUrl.searchParams.get('code');
    if (code) {
      return supabase.auth.exchangeCodeForSession(code);
    }

    const hashParams = parseHashParams(callbackUrl);
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (accessToken && refreshToken) {
      return supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
    }

    return {
      data: null,
      error: new Error('OAuth callback did not include a valid session payload.')
    };
  } catch (error) {
    return { data: null, error };
  } finally {
    await closeBrowserIfNeeded();
  }
};

export const signOut = async () => supabase.auth.signOut();

export const fetchProfile = async () => {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error) return { data: null, error };

  const { data, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, user_id, name, email, created_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError) {
    return { data: null, error: profileError };
  }

  if (!data) {
    // Seed a row if missing to avoid 406 single() errors
    const { data: inserted, error: insertError } = await supabase
      .from('user_profiles')
      .upsert(
        { user_id: user.id, name: user.user_metadata?.name || '', email: user.email },
        { onConflict: 'user_id' }
      )
      .select('id, user_id, name, email, created_at')
      .single();

    return { data: inserted, error: insertError };
  }

  return { data, error: null };
};

export const updateProfile = async ({ name }) => {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error) return { data: null, error };

  const { data, error: profileError } = await supabase
    .from('user_profiles')
    .upsert({ user_id: user.id, name, email: user.email }, { onConflict: 'user_id' })
    .select('id, user_id, name, email, created_at')
    .single();

  return { data, error: profileError };
};

export const requestEmailChange = async (email) => {
  return supabase.auth.updateUser({ email });
};

export const requestPasswordChange = async (password) => {
  return supabase.auth.updateUser({ password });
};
