import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { signOut } from '../services/authService';

const ChangeGmailId = () => {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const [agreed, setAgreed] = useState(false);

  const openExportMessage = () => {
    navigate('/dashboard', { state: { openStatement: true } });
  };

  const handleLogoutAndChange = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="config-screen">
      <header className="config-topbar">
        <Link to="/dashboard" className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-arrow-left me-1"></i>
          {t('close')}
        </Link>
        <h1>{t('changeGmailId')}</h1>
      </header>

      <main className="config-card-wrap">
        <section className="config-block gmail-info-block">
          <div className="language-toggle-row">
            <strong>{t('readInHindi')}</strong>
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className={`btn ${language === 'mr' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setLanguage('mr')}
              >
                मराठी
              </button>
              <button
                type="button"
                className={`btn ${language === 'en' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setLanguage('en')}
              >
                English
              </button>
            </div>
          </div>

          <p className="fw-semibold mt-2 mb-1">{t('syncedGmailInfo')}</p>
          <p className="gmail-highlight">{user?.email || '-'}</p>

          <p>{t('changeGmailGuide1')}</p>
          <p>{t('changeGmailGuide2')}</p>
          <p>{t('changeGmailGuide3')}</p>

          <div className="row g-2 mt-1">
            <div className="col-6">
              <button type="button" className="btn btn-outline-primary w-100" onClick={openExportMessage}>
                {t('makeFullPdf')}
              </button>
            </div>
            <div className="col-6">
              <button type="button" className="btn btn-outline-primary w-100" onClick={openExportMessage}>
                {t('makeFullExcel')}
              </button>
            </div>
          </div>

          <p className="mt-3 mb-1">
            {t('helpSupportHint')} <strong>{t('helpSupport')}</strong>
          </p>

          <hr />

          <label className="d-flex align-items-center gap-2">
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
            <span>{t('agreementCheckbox')}</span>
          </label>

          <button
            type="button"
            className="btn btn-secondary w-100 mt-3"
            disabled={!agreed}
            onClick={() => void handleLogoutAndChange()}
          >
            {t('logoutAndChangeGmail')}
          </button>
        </section>
      </main>
    </div>
  );
};

export default ChangeGmailId;
