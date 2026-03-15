import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CalculatorModal from '../components/CalculatorModal';
import Loader from '../components/loader/Loader';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { addExpense, fetchPersonExpenses } from '../services/expenseService';
import { loadAppConfig } from '../services/appConfigService';
import { buildExpensePayload, decorateExpense } from '../utils/ledgerMeta';

const formatAmount = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;

const PersonLedger = () => {
  const { personName: personSlug } = useParams();
  const personName = decodeURIComponent(personSlug || '');

  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [entryMode, setEntryMode] = useState('credit');
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [amountInput, setAmountInput] = useState('');

  const loadEntries = async () => {
    if (!user || !personName) return;

    setLoading(true);
    setError('');

    const { data, error: fetchError } = await fetchPersonExpenses({
      userId: user.id,
      personName
    });

    if (fetchError) {
      setError(fetchError.message);
      setEntries([]);
    } else {
      setEntries(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, personName]);

  const decoratedEntries = useMemo(() => {
    return entries.map(decorateExpense);
  }, [entries]);

  const entriesWithClosing = useMemo(() => {
    const ascending = [...decoratedEntries].sort((a, b) => {
      const aTime = new Date(a.created_at || a.date || '').getTime();
      const bTime = new Date(b.created_at || b.date || '').getTime();
      return aTime - bTime;
    });

    let running = 0;

    const withRunning = ascending.map((entry) => {
      running += entry.balanceDelta;
      return {
        ...entry,
        closingBalance: running
      };
    });

    return withRunning.reverse();
  }, [decoratedEntries]);

  const totals = useMemo(() => {
    return entriesWithClosing.reduce(
      (acc, item) => {
        acc.credit += item.credit;
        acc.debit += item.debit;
        return acc;
      },
      { credit: 0, debit: 0 }
    );
  }, [entriesWithClosing]);

  const balance = totals.credit - totals.debit;
  const latestEntry = entriesWithClosing[0];
  const primaryPhone = latestEntry?.phone || '';

  const openEntryForm = (mode) => {
    setEntryMode(mode);
    setAmountInput('');
    setShowEntryModal(true);
  };

  const closeEntryForm = () => {
    setShowEntryModal(false);
    setAmountInput('');
  };

  const saveEntry = async () => {
    const amount = Number(amountInput);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setSaving(true);
    setError('');

    const configuredItems = loadAppConfig().catalogItems || [];
    const defaultCategory = configuredItems[0] || 'khat';

    const payload = buildExpensePayload({
      billerName: personName,
      amount,
      displayCategory: latestEntry?.displayCategory || defaultCategory,
      personType: latestEntry?.personType || 'customer',
      entryType: entryMode,
      note: '',
      phone: primaryPhone,
      date: new Date().toISOString().slice(0, 10),
      receipt: null
    });

    const { error: saveError } = await addExpense({
      ...payload,
      user_id: user.id
    });

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    closeEntryForm();
    await loadEntries();
  };

  const openWhatsApp = () => {
    const mobile = String(primaryPhone || '').replace(/\D/g, '');
    if (!mobile) return;

    const appConfig = loadAppConfig();
    const templates = appConfig.messages;
    const message = balance >= 0 ? `${templates.creditorLine1}\n${templates.creditorLine2}` : `${templates.debtorLine1}\n${templates.debtorLine2}`;

    window.open(`https://wa.me/${mobile}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="person-ledger-screen">
      <header className="person-ledger-topbar">
        <div className="person-ledger-head">
          <Link to="/dashboard" className="icon-top-btn muted-link">
            <i className="bi bi-arrow-left"></i>
          </Link>

          <div className="person-title-wrap">
            <h1>{personName}</h1>
            <p>{primaryPhone || t('mobileNumber')}</p>
          </div>

          <div className="person-header-actions">
            {primaryPhone ? (
              <a href={`tel:${primaryPhone}`} className="icon-top-btn success-link" aria-label="Call">
                <i className="bi bi-telephone-fill"></i>
              </a>
            ) : (
              <button type="button" className="icon-top-btn" disabled>
                <i className="bi bi-telephone-fill"></i>
              </button>
            )}

            <button type="button" className="icon-top-btn" onClick={openWhatsApp} disabled={!primaryPhone} aria-label="WhatsApp">
              <i className="bi bi-whatsapp"></i>
            </button>

            <button type="button" className="icon-top-btn" onClick={() => navigate('/profile')} aria-label="Edit Profile">
              <i className="bi bi-pencil-fill"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="person-ledger-content">
        {error && <div className="alert alert-danger py-2">{error}</div>}

        {loading ? (
          <div className="loader-inline mt-4">
            <Loader overlay={false} />
          </div>
        ) : entriesWithClosing.length === 0 ? (
          <div className="ledger-empty mt-3">
            <h2>{t('noPeopleFound')}</h2>
            <p>{t('emptyLedgerHint')}</p>
          </div>
        ) : (
          <div className="entry-list-wrap">
            {entriesWithClosing.map((entry) => (
              <article className="ledger-entry-card" key={entry.id}>
                <div className={`entry-amount ${entry.entryType === 'credit' ? 'credit' : 'debit'}`}>
                  {formatAmount(entry.amount)}
                </div>

                <div className="entry-detail-block">
                  <div className="entry-main-line">{entry.cleanDescription || 'Entry'}</div>
                  <div className="entry-secondary-line">
                    {t('closingBalance')}: <strong>{formatAmount(entry.closingBalance)}</strong>
                  </div>
                  <div className="entry-time-line">
                    {entry.date ? format(new Date(entry.date), 'dd/MM/yyyy') : '-'} |{' '}
                    {entry.created_at ? format(new Date(entry.created_at), 'hh:mm a') : '--:--'}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <section className="person-ledger-bottom">
        <div className="totals-strip-row">
          <span className="credit-text">Cr {formatAmount(totals.credit)}</span>
          <span className="debit-text">Dr {formatAmount(totals.debit)}</span>
        </div>

        <div className="collect-card">
          <span>{t('youCollect')}</span>
          <strong>{formatAmount(balance)}</strong>
        </div>

        <div className="entry-action-row">
          <button className="entry-action-btn receive" type="button" onClick={() => openEntryForm('credit')}>
            {t('receiveIn')}
          </button>
          <button className="entry-action-btn give" type="button" onClick={() => openEntryForm('debit')}>
            {t('giveOut')}
          </button>
        </div>
      </section>

      {showEntryModal && (
        <div className="ledger-modal-overlay" onClick={closeEntryForm}>
          <div className="ledger-modal compact-entry-modal" onClick={(event) => event.stopPropagation()}>
            <h3>{entryMode === 'credit' ? t('creditReceiveTitle') : t('debitGiveTitle')}</h3>

            <div className="simple-entry-row">
              <div className="input-group">
                <span className="input-group-text">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  placeholder={t('enterAmount')}
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value)}
                />
              </div>

              <button type="button" className="btn btn-outline-primary" onClick={() => setShowCalculator(true)}>
                <i className="bi bi-calculator"></i>
              </button>

              <button type="button" className="btn btn-primary" onClick={() => void saveEntry()} disabled={saving}>
                {saving ? t('loading') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      <CalculatorModal
        open={showCalculator}
        initialValue={amountInput}
        onClose={() => setShowCalculator(false)}
        onApply={(value) => setAmountInput(String(value || ''))}
      />
    </div>
  );
};

export default PersonLedger;
