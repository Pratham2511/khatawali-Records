import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { defaultAppConfig, loadAppConfig, saveAppConfig } from '../services/appConfigService';

const MessageCustomization = () => {
  const { t } = useLanguage();

  const initialMessages = useMemo(() => {
    return loadAppConfig().messages;
  }, []);

  const [messages, setMessages] = useState(initialMessages);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const current = loadAppConfig();
    saveAppConfig({
      ...current,
      messages
    });

    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const handleReset = () => {
    setMessages(defaultAppConfig.messages);
  };

  return (
    <div className="config-screen">
      <header className="config-topbar">
        <Link to="/dashboard" className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-arrow-left me-1"></i>
          {t('close')}
        </Link>
        <h1>{t('messageModification')}</h1>
      </header>

      <main className="config-card-wrap">
        {saved && <div className="alert alert-success py-2">{t('dataSynced')}</div>}

        <section className="config-block creditors-block">
          <h3>{t('editMessageForCreditors')}</h3>
          <input
            className="form-control"
            value={messages.creditorLine1}
            onChange={(event) => setMessages((prev) => ({ ...prev, creditorLine1: event.target.value }))}
          />
          <input
            className="form-control mt-2"
            value={messages.creditorLine2}
            onChange={(event) => setMessages((prev) => ({ ...prev, creditorLine2: event.target.value }))}
          />
        </section>

        <section className="config-block debtors-block">
          <h3>{t('editMessageForDebtors')}</h3>
          <input
            className="form-control"
            value={messages.debtorLine1}
            onChange={(event) => setMessages((prev) => ({ ...prev, debtorLine1: event.target.value }))}
          />
          <input
            className="form-control mt-2"
            value={messages.debtorLine2}
            onChange={(event) => setMessages((prev) => ({ ...prev, debtorLine2: event.target.value }))}
          />
        </section>

        <section className="config-block">
          <label className="switch-row">
            <span>{t('addQrCodeWithMessage')}</span>
            <input
              type="checkbox"
              checked={messages.addQrWithMessage}
              onChange={(event) => setMessages((prev) => ({ ...prev, addQrWithMessage: event.target.checked }))}
            />
          </label>

          <label className="switch-row mt-2">
            <span>{t('addPersonNameInMessage')}</span>
            <input
              type="checkbox"
              checked={messages.addPersonNameInMessage}
              onChange={(event) => setMessages((prev) => ({ ...prev, addPersonNameInMessage: event.target.checked }))}
            />
          </label>
        </section>

        <div className="config-actions">
          <button type="button" className="btn btn-outline-secondary" onClick={handleReset}>
            {t('reset')}
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            {t('save')}
          </button>
        </div>
      </main>
    </div>
  );
};

export default MessageCustomization;
