import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Loader from './loader/Loader';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { signOut } from '../services/authService';

const ProtectedRoute = () => {
  const { user, loading, biometricLocked, biometricMessage, biometricChecking, unlockWithBiometric } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (loading || biometricChecking) {
    return (
      <div className="loader-shell">
        <Loader />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (biometricLocked) {
    return (
      <div className="auth-page-wrap">
        <div className="auth-card text-center">
          <div className="auth-logo-circle mb-3">
            <i className="bi bi-fingerprint"></i>
          </div>
          <h2>{t('biometricUnlockTitle')}</h2>
          <p className="text-muted mb-3">{biometricMessage || t('biometricUnlockHint')}</p>
          <button className="btn btn-primary w-100 mb-2" onClick={() => void unlockWithBiometric()}>
            {t('retryBiometric')}
          </button>
          <button className="btn btn-outline-secondary w-100" onClick={() => void signOut()}>
            {t('openWithGoogleAgain')}
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;
