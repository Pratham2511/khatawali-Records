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
