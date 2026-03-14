import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import Loader from '../components/loader/Loader';
import {
  ensureBiometricUnlock,
  getBiometricEnabled,
  setBiometricEnabled as persistBiometricEnabled
} from '../services/biometricService';

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  biometricLocked: false,
  biometricMessage: '',
  biometricAvailable: false,
  biometricEnabled: false,
  biometricChecking: false,
  unlockWithBiometric: async () => false,
  setBiometricEnabled: async () => {}
});

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [biometricLocked, setBiometricLocked] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricChecking, setBiometricChecking] = useState(false);

  const applyBiometricCheck = async (nextUser) => {
    if (!nextUser) {
      setBiometricLocked(false);
      setBiometricMessage('');
      setBiometricAvailable(false);
      setBiometricEnabled(false);
      return;
    }

    setBiometricChecking(true);

    const enabled = await getBiometricEnabled(nextUser.id);
    setBiometricEnabled(enabled);

    const result = await ensureBiometricUnlock(nextUser.id);
    setBiometricAvailable(Boolean(result.available));

    if (result.unlocked) {
      setBiometricLocked(false);
      setBiometricMessage('');
    } else {
      setBiometricLocked(true);
      setBiometricMessage(result.message || 'Fingerprint authentication is required to continue.');
    }

    setBiometricChecking(false);
  };

  const applySession = async (newSession) => {
    setSession(newSession);
    const nextUser = newSession?.user ?? null;
    setUser(nextUser);
    await applyBiometricCheck(nextUser);
  };

  const unlockWithBiometric = async () => {
    if (!user) return false;

    setBiometricChecking(true);
    const result = await ensureBiometricUnlock(user.id);
    setBiometricChecking(false);

    if (result.unlocked) {
      setBiometricLocked(false);
      setBiometricMessage('');
      return true;
    }

    setBiometricLocked(true);
    setBiometricMessage(result.message || 'Unable to unlock with fingerprint.');
    return false;
  };

  const setBiometricPreference = async (enabled) => {
    if (!user) return;
    await persistBiometricEnabled(user.id, enabled);
    setBiometricEnabled(Boolean(enabled));

    if (enabled) {
      await unlockWithBiometric();
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!error) {
        await applySession(data.session);
      }
      setLoading(false);
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      void applySession(newSession);
    });

    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      biometricLocked,
      biometricMessage,
      biometricAvailable,
      biometricEnabled,
      biometricChecking,
      unlockWithBiometric,
      setBiometricEnabled: setBiometricPreference
    }),
    [
      session,
      user,
      loading,
      biometricLocked,
      biometricMessage,
      biometricAvailable,
      biometricEnabled,
      biometricChecking
    ]
  );

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
