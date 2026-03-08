import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import Loader from '../components/loader/Loader';

const AuthContext = createContext({ user: null, session: null, loading: true });

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!error) {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }
      setLoading(false);
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({ session, user, loading }), [session, user, loading]);

  if (loading) {
    return (
      <div className="loader-shell">
        <Loader />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => useContext(AuthContext);
