import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { signOut } from '../services/authService';

const Profile = () => {
  const { user, biometricAvailable, biometricEnabled, setBiometricEnabled } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  if (!user) return null;

  const handleBiometricToggle = async () => {
    await setBiometricEnabled(!biometricEnabled);
  };

  return (
    <div className="profile-page-wrap">
      <div className="profile-card">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="mb-0">{t('profile')}</h3>
          <Link className="btn btn-sm btn-outline-secondary" to="/dashboard">
            <i className="bi bi-arrow-left me-1"></i>
            {t('close')}
          </Link>
        </div>

        <div className="mb-3">
          <label className="form-label">Google</label>
          <input className="form-control" value={user.user_metadata?.name || user.email} readOnly />
        </div>

        <div className="mb-3">
          <label className="form-label">Email</label>
          <input className="form-control" value={user.email || ''} readOnly />
        </div>

        <div className="mb-3">
          <label className="form-label">{t('language')}</label>
          <div className="d-flex gap-2">
            <button
              type="button"
              className={`btn btn-sm ${language === 'mr' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setLanguage('mr')}
            >
              {t('marathi')}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${language === 'en' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setLanguage('en')}
            >
              {t('english')}
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="form-label">Fingerprint</label>
          <button
            type="button"
            className={`btn w-100 ${biometricEnabled ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => void handleBiometricToggle()}
            disabled={!biometricAvailable}
          >
            <i className="bi bi-fingerprint me-2"></i>
            {biometricEnabled ? 'Enabled' : 'Disabled'}
          </button>
          {!biometricAvailable && <div className="form-text mt-2">Biometric sensor is not available on this device.</div>}
        </div>

        <button className="btn btn-outline-secondary w-100" onClick={() => void signOut()}>
          {t('signOut')}
        </button>
      </div>
    </div>
  );
};

export default Profile;
