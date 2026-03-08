import { supabase } from './supabaseClient';

export const signUp = async ({ name, email, password }) => {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${window.location.origin}/`
    }
  });
};

export const signIn = async ({ email, password }) => {
  return supabase.auth.signInWithPassword({ email, password });
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
    .select('id, name, email, created_at')
    .eq('id', user.id)
    .single();

  return { data, error: profileError };
};

export const updateProfile = async ({ name }) => {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();
  if (error) return { data: null, error };

  const { data, error: profileError } = await supabase
    .from('user_profiles')
    .upsert({ id: user.id, name })
    .select()
    .single();

  return { data, error: profileError };
};

export const requestEmailChange = async (email) => {
  return supabase.auth.updateUser({ email });
};

export const requestPasswordChange = async (password) => {
  return supabase.auth.updateUser({ password });
};
