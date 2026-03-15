import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { useLanguage } from '../hooks/useLanguage';
import { loadAppConfig } from '../services/appConfigService';

const Letterhead = () => {
  const { t } = useLanguage();

  const profile = useMemo(() => loadAppConfig().profile, []);

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

    doc.setFillColor(54, 88, 63);
    doc.rect(0, 0, 595, 118, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text(profile.displayName || 'Business Name', 46, 64);

    doc.setFontSize(11);
    doc.text(profile.detailLine || 'Address / Bank info / Gmail etc...', 46, 86);
    doc.text(profile.phone ? `Phone: ${profile.phone}` : 'Phone: --', 46, 102);

    if (profile.logoDataUrl) {
      doc.addImage(profile.logoDataUrl, 'JPEG', 492, 22, 66, 66);
    }

    if (profile.stampDataUrl) {
      doc.addImage(profile.stampDataUrl, 'JPEG', 454, 724, 92, 92);
    }

    doc.setTextColor(40, 52, 44);
    doc.setFontSize(12);
    doc.text('Letterhead generated from Khatawali', 46, 150);

    doc.save(`khatawali-letterhead-${Date.now()}.pdf`);
  };

  return (
    <div className="config-screen">
      <header className="config-topbar">
        <Link to="/dashboard" className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-arrow-left me-1"></i>
          {t('close')}
        </Link>
        <h1>{t('makeYourLetterhead')}</h1>
      </header>

      <main className="config-card-wrap">
        <section className="config-block">
          <div className="letterhead-preview">
            <div className="letterhead-banner">
              <div>
                <h2>{profile.displayName || t('shopCompanyName')}</h2>
                <p>{profile.detailLine || t('addressBankGmail')}</p>
                <p>{profile.phone || t('mobileNumber')}</p>
              </div>
              {profile.logoDataUrl && <img src={profile.logoDataUrl} alt="logo" className="letterhead-logo" />}
            </div>

            <div className="letterhead-body">
              <p>{t('letterheadPreviewHint')}</p>
              {profile.qrDataUrl && (
                <div className="letterhead-qr-wrap">
                  <img src={profile.qrDataUrl} alt="qr" className="letterhead-qr" />
                </div>
              )}
            </div>
          </div>

          <button type="button" className="btn btn-primary mt-3" onClick={exportPdf}>
            {t('makeFullPdf')}
          </button>
        </section>
      </main>
    </div>
  );
};

export default Letterhead;
