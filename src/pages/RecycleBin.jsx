import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import { addExpense } from '../services/expenseService';
import { buildExpensePayload } from '../utils/ledgerMeta';
import { clearDeletedEntries, listDeletedEntries, removeDeletedEntry } from '../services/recycleBinService';

const RecycleBin = () => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadEntries = () => {
    if (!user) return;
    setEntries(listDeletedEntries(user.id));
  };

  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const restoreEntry = async (entry) => {
    if (!entry?.snapshot || !user) return;

    setLoading(true);
    setError('');

    const snapshot = entry.snapshot;

    const payload = buildExpensePayload({
      billerName: snapshot.biller_name,
      amount: snapshot.amount,
      displayCategory: snapshot.displayCategory,
      entryType: snapshot.entryType,
      note: snapshot.cleanDescription,
      phone: snapshot.phone,
      date: snapshot.date,
      receipt: snapshot.receipt || null
    });

    const { error: restoreError } = await addExpense({
      ...payload,
      user_id: user.id
    });

    setLoading(false);

    if (restoreError) {
      setError(restoreError.message);
      return;
    }

    removeDeletedEntry(entry.recycleId);
    loadEntries();
    setMessage(t('restoredSuccessfully'));
  };

  const clearAll = () => {
    if (!user) return;
    clearDeletedEntries(user.id);
    loadEntries();
  };

  return (
    <div className="config-screen">
      <header className="config-topbar">
        <Link to="/dashboard" className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-arrow-left me-1"></i>
          {t('close')}
        </Link>
        <h1>{t('recycleBin')}</h1>
      </header>

      <main className="config-card-wrap">
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {message && <div className="alert alert-success py-2">{message}</div>}

        <section className="config-block">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h3 className="mb-0">{t('recycleBin')}</h3>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={clearAll}>
              {t('clearAll')}
            </button>
          </div>

          {entries.length === 0 ? (
            <p className="text-muted mb-0">{t('noDeletedEntries')}</p>
          ) : (
            <div className="recycle-list">
              {entries.map((entry) => (
                <article className="recycle-item" key={entry.recycleId}>
                  <div>
                    <strong>{entry.snapshot?.biller_name || '-'}</strong>
                    <p>
                      {t('deletedOn')} {format(new Date(entry.deletedAt), 'dd/MM/yyyy hh:mm a')}
                    </p>
                  </div>

                  <div className="recycle-actions">
                    <button type="button" className="btn btn-sm btn-primary" disabled={loading} onClick={() => void restoreEntry(entry)}>
                      {t('restore')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => {
                        removeDeletedEntry(entry.recycleId);
                        loadEntries();
                      }}
                    >
                      {t('delete')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default RecycleBin;
