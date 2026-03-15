import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';

const SUPPORT_EMAIL = 'support@khatawali.app';
const SUPPORT_PHONE = '+918268786121';

const HelpSupport = () => {
  const { t } = useLanguage();

  const openWhatsapp = () => {
    const text = encodeURIComponent('Hi, I need support with Khatawali app.');
    window.open(`https://wa.me/${SUPPORT_PHONE.replace(/\D/g, '')}?text=${text}`, '_blank');
  };

  return (
    <div className="config-screen">
      <header className="config-topbar">
        <Link to="/dashboard" className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-arrow-left me-1"></i>
          {t('close')}
        </Link>
        <h1>{t('helpSupport')}</h1>
      </header>

      <main className="config-card-wrap">
        <section className="config-block">
          <h3>{t('helpSupport')}</h3>
          <p>{t('supportDescription')}</p>

          <div className="support-actions">
            <a className="btn btn-outline-primary" href={`tel:${SUPPORT_PHONE}`}>
              <i className="bi bi-telephone-fill me-1"></i>
              {t('callNow')}
            </a>
            <a className="btn btn-outline-primary" href={`mailto:${SUPPORT_EMAIL}`}>
              <i className="bi bi-envelope-fill me-1"></i>
              {t('emailUs')}
            </a>
            <button type="button" className="btn btn-primary" onClick={openWhatsapp}>
              <i className="bi bi-whatsapp me-1"></i>
              WhatsApp
            </button>
          </div>
        </section>

        <section className="config-block">
          <h3>{t('faq')}</h3>
          <div className="faq-list">
            <article>
              <strong>{t('faqBackupQ')}</strong>
              <p>{t('faqBackupA')}</p>
            </article>
            <article>
              <strong>{t('faqRestoreQ')}</strong>
              <p>{t('faqRestoreA')}</p>
            </article>
            <article>
              <strong>{t('faqContactQ')}</strong>
              <p>{t('faqContactA')}</p>
            </article>
          </div>
        </section>
      </main>
    </div>
  );
};

export default HelpSupport;
