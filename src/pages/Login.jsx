import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signInWithGoogle } from '../services/authService';
import Loader from '../components/loader/Loader';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';

const Login = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hasAttemptedAutoLogin = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    const { error: authError } = await signInWithGoogle();
    setLoading(false);

    if (authError) {
      setError(authError.message);
    }
  };

  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
      return;
    }

    if (!hasAttemptedAutoLogin.current) {
      hasAttemptedAutoLogin.current = true;
      void handleGoogleLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, location.state, navigate]);

  return (
    <div className="auth-page-wrap">
      <div className="auth-card text-center">
        <img src="/icon-192.png" alt="Khatawali" className="hero-logo" />
        <h1 className="mb-1">{t('appName')}</h1>
        <p className="text-muted mb-4">{t('subtitle')}</p>

        {error && <div className="alert alert-danger py-2">{error}</div>}

        <button className="btn btn-primary w-100 mb-2" onClick={() => void handleGoogleLogin()} disabled={loading}>
          <i className="bi bi-google me-2" aria-hidden="true"></i>
          {t('continueWithGoogle')}
        </button>

        <p className="small text-muted mb-0">{loading ? t('signingIn') : t('signOutHint')}</p>

        {loading && (
          <div className="loader-inline mt-3">
            <Loader overlay={false} />
          </div>
        )}

        <div className="footer-credit mt-4">
          <span>Developed by Pratham</span>
        </div>
      </div>
    </div>
  );
};

export default Login;
