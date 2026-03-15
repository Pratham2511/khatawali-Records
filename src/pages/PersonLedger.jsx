import React, { useEffect, useMemo, useState } from 'react';
import { format, isSameDay } from 'date-fns';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import CalculatorModal from '../components/CalculatorModal';
import Loader from '../components/loader/Loader';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import {
  addExpense,
  bulkInsertExpenses,
  deleteExpense,
  fetchExpenses,
  fetchPersonExpenses,
  updateExpense
} from '../services/expenseService';
import { loadAppConfig } from '../services/appConfigService';
import { buildExpensePayload, decorateExpense } from '../utils/ledgerMeta';

const formatAmount = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;
const formatCurrencyValue = (value) => Number(value || 0).toLocaleString('en-IN');

const getMaskedPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length <= 4) return digits;
  const visible = digits.slice(-4);
  return `${'X'.repeat(Math.max(2, digits.length - 4))}${visible}`;
};

const dayGapFromToday = (value) => {
  if (!value) return 0;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 0;

  const diff = Date.now() - date.getTime();
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
};

const PersonLedger = () => {
  const { personName: personSlug } = useParams();
  const personName = decodeURIComponent(personSlug || '');

  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [entries, setEntries] = useState([]);
  const [allPeople, setAllPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transferSaving, setTransferSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [entryMode, setEntryMode] = useState('credit');
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showOnlyToday, setShowOnlyToday] = useState(false);
  const [entrySearch, setEntrySearch] = useState('');
  const [transferSearch, setTransferSearch] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [activeEntryMenuId, setActiveEntryMenuId] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [transferForm, setTransferForm] = useState(() => ({
    targetName: '',
    amount: '',
    note: '',
    date: new Date().toISOString().slice(0, 10),
    time: format(new Date(), 'HH:mm')
  }));

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

  const loadPeople = async () => {
    if (!user?.id) return;

    const { data, error: peopleError } = await fetchExpenses({
      userId: user.id,
      year: '',
      month: '',
      billerName: ''
    });

    if (peopleError) {
      return;
    }

    const mapped = new Map();

    (data || []).map(decorateExpense).forEach((item) => {
      const name = (item.biller_name || '').trim();
      if (!name) return;

      const existing = mapped.get(name) || {
        name,
        phone: '',
        displayCategory: item.displayCategory || 'khat',
        lastSeenAt: item.created_at || item.date || ''
      };

      const seenAt = item.created_at || item.date || '';

      if (item.phone && !existing.phone) {
        existing.phone = item.phone;
      }

      if (seenAt && (!existing.lastSeenAt || new Date(seenAt).getTime() > new Date(existing.lastSeenAt).getTime())) {
        existing.lastSeenAt = seenAt;
        existing.displayCategory = item.displayCategory || existing.displayCategory;

        if (item.phone) {
          existing.phone = item.phone;
        }
      }

      mapped.set(name, existing);
    });

    setAllPeople(Array.from(mapped.values()).sort((a, b) => a.name.localeCompare(b.name)));
  };

  useEffect(() => {
    void loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, personName]);

  useEffect(() => {
    void loadPeople();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
  const fallbackPerson = allPeople.find((person) => person.name === personName);
  const primaryPhone = latestEntry?.phone || fallbackPerson?.phone || '';
  const maskedPhone = getMaskedPhone(primaryPhone);
  const daysPassed = dayGapFromToday(latestEntry?.date || latestEntry?.created_at);

  const filteredEntries = useMemo(() => {
    const query = entrySearch.trim().toLowerCase();

    return entriesWithClosing.filter((entry) => {
      const entryDate = entry.date ? new Date(entry.date) : entry.created_at ? new Date(entry.created_at) : null;

      if (showOnlyToday && (!entryDate || !isSameDay(entryDate, new Date()))) {
        return false;
      }

      if (!query) return true;

      const haystack = [
        entry.cleanDescription || '',
        entry.displayCategory || '',
        entry.entryType || '',
        String(entry.amount || ''),
        entry.date || ''
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [entriesWithClosing, entrySearch, showOnlyToday]);

  const transferCandidates = useMemo(() => {
    const query = transferSearch.trim().toLowerCase();

    return allPeople.filter((person) => {
      if (person.name === personName) return false;
      if (!query) return true;
      return person.name.toLowerCase().includes(query) || String(person.phone || '').toLowerCase().includes(query);
    });
  }, [allPeople, personName, transferSearch]);

  const selectedTransferPerson = useMemo(() => {
    if (!transferForm.targetName) return null;
    return allPeople.find((person) => person.name === transferForm.targetName) || null;
  }, [allPeople, transferForm.targetName]);

  const creditPercent = useMemo(() => {
    const total = totals.credit + totals.debit;
    if (total <= 0) return 50;
    return Math.round((totals.credit / total) * 100);
  }, [totals.credit, totals.debit]);

  const openEntryForm = (mode, entry = null) => {
    setEntryMode(mode);
    setEditingEntry(entry);
    setAmountInput(entry ? String(entry.amount || '') : '');
    setShowEntryModal(true);
    setActiveEntryMenuId(null);
  };

  const closeEntryForm = () => {
    setShowEntryModal(false);
    setAmountInput('');
    setEditingEntry(null);
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
      displayCategory: editingEntry?.displayCategory || latestEntry?.displayCategory || defaultCategory,
      entryType: editingEntry?.entryType || entryMode,
      note: editingEntry?.cleanDescription || '',
      phone: editingEntry?.phone || primaryPhone,
      date: editingEntry?.date || new Date().toISOString().slice(0, 10),
      receipt: editingEntry?.receipt || null
    });

    const result = editingEntry?.id
      ? await updateExpense(editingEntry.id, payload)
      : await addExpense({
          ...payload,
          user_id: user.id
        });

    const { error: saveError } = result;

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    closeEntryForm();
    await loadEntries();
    await loadPeople();
  };

  const deleteLedgerEntry = async (entryId) => {
    if (!entryId) return;

    const confirmed = window.confirm('Delete this entry?');
    if (!confirmed) return;

    setSaving(true);
    setError('');

    const { error: deleteError } = await deleteExpense(entryId);

    setSaving(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setActiveEntryMenuId(null);
    await loadEntries();
    await loadPeople();
  };

  const exportPersonPdf = () => {
    if (!filteredEntries.length) return;

    const profile = loadAppConfig().profile;
    const shopName = profile.displayName || 'Khatawali';

    const ascending = [...filteredEntries].sort((a, b) => {
      const aTime = new Date(a.created_at || a.date || '').getTime();
      const bTime = new Date(b.created_at || b.date || '').getTime();
      return aTime - bTime;
    });

    let running = 0;
    const rows = ascending.map((entry, index) => {
      running += entry.entryType === 'credit' ? Number(entry.amount || 0) : -Number(entry.amount || 0);
      return {
        no: index + 1,
        dateCell:
          entry.date && entry.created_at
            ? `${format(new Date(entry.date), 'dd/MM/yyyy')}\n${format(new Date(entry.created_at), 'hh:mm a')}`
            : entry.date
              ? format(new Date(entry.date), 'dd/MM/yyyy')
              : '-',
        remark: entry.cleanDescription || '-',
        debit: entry.entryType === 'debit' ? Number(entry.amount || 0) : null,
        credit: entry.entryType === 'credit' ? Number(entry.amount || 0) : null,
        closing: running
      };
    });

    const totalDebit = rows.reduce((sum, row) => sum + (row.debit || 0), 0);
    const totalCredit = rows.reduce((sum, row) => sum + (row.credit || 0), 0);
    const finalBalance = rows[rows.length - 1]?.closing || 0;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

    doc.setFillColor(229, 245, 245);
    doc.rect(20, 16, 555, 74, 'F');

    doc.setTextColor(16, 71, 83);
    doc.setFontSize(22);
    doc.text(shopName, 30, 46);

    doc.setTextColor(34, 44, 48);
    doc.setFontSize(10);
    doc.text('Digital India ka safe and secure Khatawali ledger.', 30, 63);

    doc.setFillColor(239, 248, 248);
    doc.rect(20, 92, 555, 24, 'F');
    doc.setFontSize(11);
    doc.setTextColor(25, 102, 111);
    doc.text('Transaction Report of All Time', 210, 108);

    doc.setTextColor(20, 83, 87);
    doc.setFontSize(12);
    doc.text(`Name  :  ${personName}`, 30, 135);
    doc.text(`Phone :  ${primaryPhone || '-'}`, 280, 135);
    doc.text(`Linked:  ${user?.email || '-'}`, 30, 154);

    autoTable(doc, {
      head: [['No', 'Date', 'Remarks', 'Debit (Out)', 'Credit (In)', 'Cls Balance']],
      body: rows.map((row) => [
        row.no,
        row.dateCell,
        row.remark,
        row.debit ? row.debit.toLocaleString('en-IN') : '-',
        row.credit ? row.credit.toLocaleString('en-IN') : '-',
        row.closing.toLocaleString('en-IN')
      ]),
      startY: 170,
      styles: {
        fontSize: 9,
        cellPadding: 5,
        lineColor: [197, 218, 222],
        lineWidth: 0.5,
        textColor: [34, 42, 44]
      },
      headStyles: {
        fillColor: [236, 246, 246],
        textColor: [20, 89, 98],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 34 },
        1: { cellWidth: 88 },
        2: { cellWidth: 172 },
        3: { halign: 'right', cellWidth: 88 },
        4: { halign: 'right', cellWidth: 88 },
        5: { halign: 'right', cellWidth: 85 }
      },
      didParseCell: (hookData) => {
        const row = rows[hookData.row.index];
        if (!row || hookData.section !== 'body') return;

        if (hookData.column.index === 3 && row.debit) {
          hookData.cell.styles.textColor = [180, 48, 48];
        }

        if (hookData.column.index === 4 && row.credit) {
          hookData.cell.styles.textColor = [32, 116, 52];
        }

        if (hookData.column.index === 5) {
          hookData.cell.styles.textColor = row.closing >= 0 ? [32, 116, 52] : [180, 48, 48];
        }
      }
    });

    const finalY = doc.lastAutoTable?.finalY || 170;
    doc.setDrawColor(199, 217, 219);
    doc.line(20, finalY + 10, 575, finalY + 10);

    doc.setFontSize(12);
    doc.setTextColor(22, 96, 48);
    doc.text(`Total Credit ₹ : ${totalCredit.toLocaleString('en-IN')}`, 30, finalY + 30);

    doc.setTextColor(169, 41, 43);
    doc.text(`Total Debit ₹ : ${totalDebit.toLocaleString('en-IN')}`, 230, finalY + 30);

    doc.setTextColor(finalBalance >= 0 ? 22 : 169, finalBalance >= 0 ? 96 : 41, finalBalance >= 0 ? 48 : 43);
    doc.text(`Cls Balance ₹ : ${finalBalance.toLocaleString('en-IN')}`, 430, finalY + 30);

    doc.setFontSize(10);
    doc.setTextColor(100, 114, 118);
    doc.text(`Print Date: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}`, 30, 820);
    doc.text('Page No. 1', 520, 820);

    doc.save(`khatawali-${personName}-${Date.now()}.pdf`);
  };

  const openTransferModal = () => {
    setError('');
    setMessage('');
    setTransferSearch('');
    setTransferForm({
      targetName: '',
      amount: '',
      note: '',
      date: new Date().toISOString().slice(0, 10),
      time: format(new Date(), 'HH:mm')
    });
    setShowTransferModal(true);
    setShowActionMenu(false);
  };

  const closeTransferModal = () => {
    setShowTransferModal(false);
  };

  const submitTransfer = async () => {
    if (!user?.id) {
      setError('Session expired. Please login again.');
      return;
    }

    if (!transferForm.targetName) {
      setError(t('selectPersonFirst'));
      return;
    }

    const transferAmount = Number(String(transferForm.amount || '').replace(/,/g, '').trim());
    if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
      setError(t('invalidTransferAmount'));
      return;
    }

    setTransferSaving(true);
    setError('');
    setMessage('');

    const appConfig = loadAppConfig();
    const configuredItems = appConfig.catalogItems || [];
    const defaultCategory = configuredItems[0] || 'khat';

    const transferStamp = `${transferForm.date || new Date().toISOString().slice(0, 10)} ${transferForm.time || ''}`.trim();
    const transferNote = transferForm.note.trim();

    const sourcePayload = buildExpensePayload({
      billerName: personName,
      amount: transferAmount,
      displayCategory: latestEntry?.displayCategory || defaultCategory,
      entryType: 'debit',
      note: `${t('transferTo')} ${transferForm.targetName}${transferNote ? ` - ${transferNote}` : ''} (${transferStamp})`,
      phone: primaryPhone,
      date: transferForm.date,
      receipt: null
    });

    const targetPayload = buildExpensePayload({
      billerName: transferForm.targetName,
      amount: transferAmount,
      displayCategory: selectedTransferPerson?.displayCategory || latestEntry?.displayCategory || defaultCategory,
      entryType: 'credit',
      note: `${t('transferFrom')} ${personName}${transferNote ? ` - ${transferNote}` : ''} (${transferStamp})`,
      phone: selectedTransferPerson?.phone || '',
      date: transferForm.date,
      receipt: null
    });

    const { error: transferError } = await bulkInsertExpenses([
      {
        ...sourcePayload,
        user_id: user.id
      },
      {
        ...targetPayload,
        user_id: user.id
      }
    ]);

    setTransferSaving(false);

    if (transferError) {
      setError(transferError.message || t('transferFailed'));
      return;
    }

    closeTransferModal();
    setMessage(t('transferSuccess'));
    await loadEntries();
    await loadPeople();
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
      <header className="person-ledger-topbar person-ledger-topbar-ref">
        <div className="person-ledger-head person-ledger-head-ref">
          <Link to="/dashboard" className="icon-top-btn muted-link" aria-label="Back">
            <i className="bi bi-arrow-left"></i>
          </Link>

          <div className="person-head-avatar">{personName.slice(0, 1).toUpperCase()}</div>

          <div className="person-title-wrap">
            <h1>{personName}</h1>
            <p>
              {primaryPhone || t('mobileNumber')}
              {primaryPhone && <span className="person-masked-phone">&nbsp;&nbsp;{maskedPhone}</span>}
            </p>
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

        <div className="person-toolbar-row">
          <div className="person-search-wrap">
            <input
              type="text"
              className="person-search-input"
              placeholder={t('search')}
              value={entrySearch}
              onChange={(event) => setEntrySearch(event.target.value)}
            />
            <small>{t('searchLedgerHint')}</small>
          </div>

          <button
            type="button"
            className={`person-toolbar-btn ${showOnlyToday ? 'active' : ''}`}
            onClick={() => setShowOnlyToday((prev) => !prev)}
          >
            <i className="bi bi-funnel-fill"></i>
            <span>{t('filter')}</span>
          </button>

          <button type="button" className="person-toolbar-btn" onClick={openWhatsApp}>
            <i className="bi bi-whatsapp"></i>
            <span>{t('message')}</span>
          </button>

          <button type="button" className="person-toolbar-btn" onClick={exportPersonPdf}>
            <i className="bi bi-file-earmark-pdf"></i>
            <span>{t('pdfFile')}</span>
          </button>

          <button type="button" className="person-toolbar-btn" onClick={openTransferModal}>
            <i className="bi bi-arrow-left-right"></i>
            <span>{t('transfer')}</span>
          </button>

          <div className="person-toolbar-menu-anchor">
            <button
              type="button"
              className="person-toolbar-btn"
              onClick={() => setShowActionMenu((prev) => !prev)}
              aria-label={t('menu')}
            >
              <i className="bi bi-list"></i>
              <span>{t('menu')}</span>
            </button>

            {showActionMenu && (
              <div className="person-inline-menu">
                <button type="button" onClick={() => navigate('/dashboard')}>
                  {t('dashboard')}
                </button>
                <button type="button" onClick={() => navigate('/profile')}>
                  {t('settingsAndProfile')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowActionMenu(false);
                    exportPersonPdf();
                  }}
                >
                  {t('pdfFile')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="person-ledger-content">
        {message && <div className="alert alert-success py-2">{message}</div>}
        {error && <div className="alert alert-danger py-2">{error}</div>}

        {loading ? (
          <div className="loader-inline mt-4">
            <Loader overlay={false} />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="ledger-empty mt-3">
            <h2>{t('noPeopleFound')}</h2>
            <p>{t('emptyLedgerHint')}</p>
          </div>
        ) : (
          <>
            <section className="person-day-summary">
              <strong>{t('today')}</strong>
              <span>
                {daysPassed} {t('dayPassed')}
              </span>
            </section>

            <div className="entry-list-wrap ref-entry-list">
              {filteredEntries.map((entry, index) => (
                <article className={`ledger-entry-card ref-entry-card ${entry.entryType}`} key={entry.id}>
                  <div className="entry-head-row">
                    <h4>{entry.cleanDescription || personName}</h4>
                    <button
                      type="button"
                      className="entry-more-btn"
                      aria-label="Entry options"
                      onClick={() => setActiveEntryMenuId((prev) => (prev === entry.id ? null : entry.id))}
                    >
                      <i className="bi bi-three-dots-vertical"></i>
                    </button>

                    {activeEntryMenuId === entry.id && (
                      <div className="entry-options-menu">
                        <button type="button" onClick={() => openEntryForm(entry.entryType, entry)}>
                          {t('update')}
                        </button>
                        <button type="button" className="danger" onClick={() => void deleteLedgerEntry(entry.id)}>
                          {t('delete')}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={`entry-amount ${entry.entryType === 'credit' ? 'credit' : 'debit'} ref-amount`}>
                    ₹ {formatCurrencyValue(entry.amount)}
                  </div>

                  <div className="entry-secondary-line ref-closing-line">
                    {t('closingBalance')} :{' '}
                    <strong className={entry.closingBalance >= 0 ? 'credit-text' : 'debit-text'}>
                      ₹ {formatCurrencyValue(Math.abs(entry.closingBalance))}
                    </strong>
                  </div>

                  <div className="entry-time-line ref-time-line">
                    <span>{entry.date ? format(new Date(entry.date), 'dd-MM-yyyy') : '-'}</span>
                    <span>{entry.created_at ? format(new Date(entry.created_at), 'hh:mm a') : '--:--'}</span>
                    <span className="entry-order-badge">{index + 1}</span>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </main>

      <section className="person-ledger-bottom">
        <div className="totals-strip-row ref-totals-strip">
          <span className="credit-text">Cr {formatAmount(totals.credit)}</span>
          <span className="debit-text">Dr {formatAmount(totals.debit)}</span>
        </div>

        <div className="totals-progress-track">
          <div className="totals-progress-credit" style={{ width: `${creditPercent}%` }}></div>
          <div className="totals-progress-debit" style={{ width: `${100 - creditPercent}%` }}></div>
        </div>

        <div className="collect-card ref-collect-card">
          <span>{balance >= 0 ? t('youCollect') : t('youWillPay')}</span>
          <strong>{formatAmount(Math.abs(balance))}</strong>
        </div>

        <div className="entry-action-row ref-action-row">
          <button className="entry-action-btn receive" type="button" onClick={() => openEntryForm('credit')}>
            <i className="bi bi-arrow-down-square-fill me-1"></i>
            {t('receiveIn')}
          </button>
          <button className="entry-action-btn give" type="button" onClick={() => openEntryForm('debit')}>
            <i className="bi bi-arrow-up-square-fill me-1"></i>
            {t('giveOut')}
          </button>
        </div>
      </section>

      {showEntryModal && (
        <div className="ledger-modal-overlay" onClick={closeEntryForm}>
          <div className="ledger-modal compact-entry-modal" onClick={(event) => event.stopPropagation()}>
            <h3>
              {editingEntry ? t('update') : entryMode === 'credit' ? t('creditReceiveTitle') : t('debitGiveTitle')}
            </h3>

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
                {saving ? t('loading') : editingEntry ? t('update') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTransferModal && (
        <div className="ledger-modal-overlay" onClick={closeTransferModal}>
          <div className="ledger-modal transfer-modal" onClick={(event) => event.stopPropagation()}>
            <h3>{t('selectPersonForTransfer')}</h3>

            <input
              className="form-control"
              placeholder={t('searchPerson')}
              value={transferSearch}
              onChange={(event) => setTransferSearch(event.target.value)}
            />

            <div className="transfer-people-list">
              {transferCandidates.length === 0 ? (
                <p className="text-muted mb-0">{t('noTransferPeople')}</p>
              ) : (
                transferCandidates.map((person) => (
                  <button
                    key={person.name}
                    type="button"
                    className={`transfer-person-item ${transferForm.targetName === person.name ? 'active' : ''}`}
                    onClick={() => setTransferForm((prev) => ({ ...prev, targetName: person.name }))}
                  >
                    <span className="transfer-avatar">{person.name.slice(0, 1).toUpperCase()}</span>
                    <span>
                      <strong>{person.name}</strong>
                      {person.phone && <small>{person.phone}</small>}
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="transfer-form-grid">
              <div className="input-group">
                <span className="input-group-text">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control"
                  value={transferForm.amount}
                  onChange={(event) => setTransferForm((prev) => ({ ...prev, amount: event.target.value }))}
                  placeholder={t('amount')}
                />
              </div>

              <input
                className="form-control"
                value={transferForm.note}
                onChange={(event) => setTransferForm((prev) => ({ ...prev, note: event.target.value }))}
                placeholder={t('transferNotePlaceholder')}
              />

              <input
                type="date"
                className="form-control"
                value={transferForm.date}
                onChange={(event) => setTransferForm((prev) => ({ ...prev, date: event.target.value }))}
              />

              <input
                type="time"
                className="form-control"
                value={transferForm.time}
                onChange={(event) => setTransferForm((prev) => ({ ...prev, time: event.target.value }))}
              />

              <button type="button" className="btn btn-primary" onClick={() => void submitTransfer()} disabled={transferSaving}>
                {transferSaving ? t('loading') : t('transferNow')}
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
