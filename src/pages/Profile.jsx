import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { loadAppConfig, saveAppConfig } from '../services/appConfigService';
import { toImagePayload } from '../services/fileService';

const Profile = () => {
  const { user, biometricAvailable, biometricEnabled, setBiometricEnabled } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const initialConfig = useMemo(() => loadAppConfig(), []);

  const [config, setConfig] = useState(initialConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (!user) return null;

  const updateConfig = (nextUpdater) => {
    setConfig((prev) => nextUpdater(prev));
    setError('');
    setMessage('');
  };

  const updatePreference = (key, value) => {
    updateConfig((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [key]: value
      }
    }));
  };

  const handleUploadAsset = async (field, file) => {
    if (!file) return;

    try {
      const payload = await toImagePayload(file);
      updateConfig((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          [field]: payload?.dataUrl || ''
        }
      }));
    } catch (uploadError) {
      setError(uploadError.message || 'Unable to process image.');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      saveAppConfig(config);

      if (biometricAvailable) {
        await setBiometricEnabled(Boolean(config.preferences.fingerLockOn));
      }

      setMessage(t('dataSynced'));
    } catch (saveError) {
      setError(saveError.message || 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="config-screen">
      <header className="config-topbar">
        <Link className="btn btn-sm btn-outline-secondary" to="/dashboard">
          <i className="bi bi-arrow-left me-1"></i>
          {t('close')}
        </Link>
        <h1>{t('settingsAndProfile')}</h1>
      </header>

      <main className="config-card-wrap">
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {message && <div className="alert alert-success py-2">{message}</div>}

        <section className="config-block">
          <h3>{t('setYourProfile')}</h3>

          <input
            className="form-control"
            placeholder={t('shopCompanyName')}
            value={config.profile.displayName}
            onChange={(event) =>
              updateConfig((prev) => ({
                ...prev,
                profile: { ...prev.profile, displayName: event.target.value }
              }))
            }
          />

          <input
            className="form-control mt-2"
            placeholder={t('addressBankGmail')}
            value={config.profile.detailLine}
            onChange={(event) =>
              updateConfig((prev) => ({
                ...prev,
                profile: { ...prev.profile, detailLine: event.target.value }
              }))
            }
          />

          <input
            className="form-control mt-2"
            placeholder={t('mobileNumber')}
            value={config.profile.phone}
            onChange={(event) =>
              updateConfig((prev) => ({
                ...prev,
                profile: { ...prev.profile, phone: event.target.value }
              }))
            }
          />

          <div className="upload-grid mt-3">
            <label className="upload-tile">
              {config.profile.logoDataUrl ? <img src={config.profile.logoDataUrl} alt="Logo" /> : <i className="bi bi-image"></i>}
              <span>{t('uploadLogo')}</span>
              <input type="file" accept="image/*" hidden onChange={(event) => void handleUploadAsset('logoDataUrl', event.target.files?.[0])} />
            </label>

            <label className="upload-tile">
              {config.profile.qrDataUrl ? <img src={config.profile.qrDataUrl} alt="QR" /> : <i className="bi bi-qr-code"></i>}
              <span>{t('uploadQr')}</span>
              <input type="file" accept="image/*" hidden onChange={(event) => void handleUploadAsset('qrDataUrl', event.target.files?.[0])} />
            </label>

            <label className="upload-tile">
              {config.profile.stampDataUrl ? <img src={config.profile.stampDataUrl} alt="Stamp" /> : <i className="bi bi-award"></i>}
              <span>{t('uploadStamp')}</span>
              <input type="file" accept="image/*" hidden onChange={(event) => void handleUploadAsset('stampDataUrl', event.target.files?.[0])} />
            </label>
          </div>

          <p className="form-text mt-2">{t('uploadAdvice')}</p>
        </section>

        <section className="config-block">
          <h3>{t('currencyDenominationSettings')}</h3>

          <div className="denomination-grid">
            {Object.keys(config.denominations).map((denomination) => (
              <label key={denomination} className="switch-row">
                <span>{denomination} ₹</span>
                <input
                  type="checkbox"
                  checked={Boolean(config.denominations[denomination])}
                  onChange={(event) =>
                    updateConfig((prev) => ({
                      ...prev,
                      denominations: {
                        ...prev.denominations,
                        [denomination]: event.target.checked
                      }
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </section>

        <section className="config-block">
          <h3>{t('soundVibrationFingerLock')}</h3>

          <label className="switch-row">
            <span>{t('sound')}</span>
            <input
              type="checkbox"
              checked={config.preferences.soundOn}
              onChange={(event) => updatePreference('soundOn', event.target.checked)}
            />
          </label>

          <label className="switch-row mt-2">
            <span>{t('vibration')}</span>
            <input
              type="checkbox"
              checked={config.preferences.vibrationOn}
              onChange={(event) => updatePreference('vibrationOn', event.target.checked)}
            />
          </label>

          <label className="switch-row mt-2">
            <span>{t('fingerLock')}</span>
            <input
              type="checkbox"
              checked={config.preferences.fingerLockOn}
              disabled={!biometricAvailable}
              onChange={(event) => updatePreference('fingerLockOn', event.target.checked)}
            />
          </label>
        </section>

        <section className="config-block">
          <h3>{t('whatsappSharingSettings')}</h3>

          <label className="switch-row">
            <span>{t('autoShare')}</span>
            <input
              type="checkbox"
              checked={config.preferences.autoShareOn}
              onChange={(event) => updatePreference('autoShareOn', event.target.checked)}
            />
          </label>

          <label className="switch-row mt-2">
            <span>{t('shareAsImage')}</span>
            <input
              type="checkbox"
              checked={config.preferences.shareAsImage}
              onChange={(event) => updatePreference('shareAsImage', event.target.checked)}
            />
          </label>

          <label className="switch-row mt-2">
            <span>{t('addPreviousEntries')}</span>
            <input
              type="checkbox"
              checked={config.preferences.addPreviousEntries}
              onChange={(event) => updatePreference('addPreviousEntries', event.target.checked)}
            />
          </label>

          <label className="switch-row mt-2">
            <span>{t('addPersonNameInMessage')}</span>
            <input
              type="checkbox"
              checked={config.preferences.addPersonName}
              onChange={(event) => updatePreference('addPersonName', event.target.checked)}
            />
          </label>

          <label className="switch-row mt-2">
            <span>{t('setWhatsapp')}</span>
            <input
              type="checkbox"
              checked={config.preferences.whatsappBusiness}
              onChange={(event) => updatePreference('whatsappBusiness', event.target.checked)}
            />
          </label>
        </section>

        <section className="config-block">
          <h3>{t('autoEmailSettings')}</h3>

          <label className="switch-row">
            <span>{t('autoMail')}</span>
            <input
              type="checkbox"
              checked={config.preferences.autoEmailOn}
              onChange={(event) => updatePreference('autoEmailOn', event.target.checked)}
            />
          </label>
        </section>

        <section className="config-block">
          <h3>{t('invoiceDisplaySettings')}</h3>

          <label className="switch-row">
            <span>{t('invoiceNumberShow')}</span>
            <input
              type="checkbox"
              checked={config.preferences.invoiceShow}
              onChange={(event) => updatePreference('invoiceShow', event.target.checked)}
            />
          </label>

          <label className="switch-row mt-2">
            <span>{t('hideTimeInPdf')}</span>
            <input
              type="checkbox"
              checked={config.preferences.hideTimeInPdf}
              onChange={(event) => updatePreference('hideTimeInPdf', event.target.checked)}
            />
          </label>
        </section>

        <section className="config-block">
          <h3>{t('language')}</h3>

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
        </section>

        <button type="button" className="btn btn-primary w-100" onClick={() => void handleSave()} disabled={saving}>
          {saving ? t('loading') : t('save')}
        </button>
      </main>
    </div>
  );
};

export default Profile;
