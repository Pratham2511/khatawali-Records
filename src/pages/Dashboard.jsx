import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelImport from '../components/ExcelImport';
import Loader from '../components/loader/Loader';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../hooks/useLanguage';
import {
  addExpense,
  bulkInsertExpenses,
  deleteExpense,
  fetchExpenses,
  updateExpense
} from '../services/expenseService';
import { signOut } from '../services/authService';
import {
  buildExpensePayload,
  decorateExpense,
  ENTRY_TYPES,
  LEDGER_CATEGORIES,
  PERSON_TYPES
} from '../utils/ledgerMeta';

const personTypeTabs = ['all', ...PERSON_TYPES];

const initialEntry = {
  billerName: '',
  personType: 'customer',
  category: LEDGER_CATEGORIES[0],
  entryType: 'debit',
  amount: '',
  phone: '',
  note: '',
  date: new Date().toISOString().slice(0, 10)
};

const rangeOptions = [
  { key: 'all', labelKey: 'allTime' },
  { key: 'today', labelKey: 'today' },
  { key: 'yesterday', labelKey: 'yesterday' },
  { key: 'last15', labelKey: 'last15' },
  { key: 'last30', labelKey: 'last30' },
  { key: 'last90', labelKey: 'last90' },
  { key: 'last180', labelKey: 'last180' },
  { key: 'custom', labelKey: 'from' }
];

const monthLabels = Array.from({ length: 12 }, (_, index) => String(index + 1));

const parseImportedDate = (value) => {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
};

const inRange = (entryDate, mode, from, to) => {
  const sourceDate = entryDate ? new Date(entryDate) : null;
  if (!sourceDate || Number.isNaN(sourceDate.getTime())) return false;

  const today = endOfDay(new Date());
  let start = null;
  let end = today;

  switch (mode) {
    case 'today':
      start = startOfDay(today);
      break;
    case 'yesterday':
      start = startOfDay(subDays(today, 1));
      end = endOfDay(subDays(today, 1));
      break;
    case 'last15':
      start = startOfDay(subDays(today, 14));
      break;
    case 'last30':
      start = startOfDay(subDays(today, 29));
      break;
    case 'last90':
      start = startOfDay(subDays(today, 89));
      break;
    case 'last180':
      start = startOfDay(subDays(today, 179));
      break;
    case 'custom':
      if (!from || !to) return true;
      start = startOfDay(new Date(from));
      end = endOfDay(new Date(to));
      break;
    default:
      return true;
  }

  const value = sourceDate.getTime();
  return value >= start.getTime() && value <= end.getTime();
};

const formatAmount = (value) => `₹ ${Number(value || 0).toLocaleString('en-IN')}`;

const Dashboard = () => {
  const { user, biometricEnabled } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [filters, setFilters] = useState({
    year: String(new Date().getFullYear()),
    month: '',
    search: '',
    personType: 'all'
  });

  const [rangeFilter, setRangeFilter] = useState({
    mode: 'all',
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10)
  });

  const [showMenu, setShowMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [hideTotal, setHideTotal] = useState(false);

  const [entryForm, setEntryForm] = useState(initialEntry);
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => String(current - index));
  }, []);

  const loadExpenses = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    const { data, error: fetchError } = await fetchExpenses({
      userId: user.id,
      year: filters.year,
      month: filters.month,
      billerName: ''
    });

    if (fetchError) {
      setError(fetchError.message);
      setExpenses([]);
    } else {
      setExpenses(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filters.year, filters.month]);

  const decoratedExpenses = useMemo(() => {
    return expenses.map(decorateExpense);
  }, [expenses]);

  const rangeFilteredExpenses = useMemo(() => {
    return decoratedExpenses.filter((item) => inRange(item.date, rangeFilter.mode, rangeFilter.from, rangeFilter.to));
  }, [decoratedExpenses, rangeFilter]);

  const searchFilteredExpenses = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return rangeFilteredExpenses.filter((item) => {
      const matchesSearch = !query || (item.biller_name || '').toLowerCase().includes(query);
      const matchesPersonType = filters.personType === 'all' || item.personType === filters.personType;
      return matchesSearch && matchesPersonType;
    });
  }, [rangeFilteredExpenses, filters.search, filters.personType]);

  const groupedPeople = useMemo(() => {
    const map = new Map();

    searchFilteredExpenses.forEach((expense) => {
      const name = (expense.biller_name || '').trim() || 'Unknown';
      const existing = map.get(name) || {
        name,
        personType: expense.personType,
        phone: expense.phone,
        credit: 0,
        debit: 0,
        balance: 0,
        lastTransactionAt: null,
        lastExpense: null,
        entries: []
      };

      existing.credit += expense.credit;
      existing.debit += expense.debit;
      existing.balance = existing.credit - existing.debit;
      existing.entries.push(expense);

      const currentTime = expense.created_at || expense.date;
      const previousTime = existing.lastTransactionAt;

      if (!previousTime || new Date(currentTime).getTime() > new Date(previousTime).getTime()) {
        existing.lastTransactionAt = currentTime;
        existing.lastExpense = expense;
        existing.personType = expense.personType || existing.personType;
        if (expense.phone) {
          existing.phone = expense.phone;
        }
      }

      map.set(name, existing);
    });

    return Array.from(map.values()).sort((a, b) => {
      const bTime = b.lastTransactionAt ? new Date(b.lastTransactionAt).getTime() : 0;
      const aTime = a.lastTransactionAt ? new Date(a.lastTransactionAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [searchFilteredExpenses]);

  const totals = useMemo(() => {
    return groupedPeople.reduce(
      (acc, person) => {
        acc.credit += person.credit;
        acc.debit += person.debit;
        return acc;
      },
      { credit: 0, debit: 0 }
    );
  }, [groupedPeople]);

  const balance = totals.credit - totals.debit;

  const openAddModal = (expense = null) => {
    if (expense) {
      setEditingExpenseId(expense.id);
      setEntryForm({
        billerName: expense.biller_name,
        personType: expense.personType,
        category: expense.displayCategory,
        entryType: expense.entryType,
        amount: String(expense.amount || ''),
        phone: expense.phone || '',
        note: expense.cleanDescription || '',
        date: expense.date ? expense.date.slice(0, 10) : new Date().toISOString().slice(0, 10)
      });
    } else {
      setEditingExpenseId(null);
      setEntryForm(initialEntry);
    }

    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setEditingExpenseId(null);
    setEntryForm(initialEntry);
    setShowAddModal(false);
  };

  const handleSaveEntry = async (event) => {
    event.preventDefault();

    if (!entryForm.billerName.trim() || !entryForm.amount || !entryForm.date) {
      setError('Name, amount and date are required.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = buildExpensePayload({
      billerName: entryForm.billerName,
      amount: entryForm.amount,
      displayCategory: entryForm.category,
      personType: entryForm.personType,
      entryType: entryForm.entryType,
      note: entryForm.note,
      phone: entryForm.phone,
      date: entryForm.date
    });

    const action = editingExpenseId
      ? updateExpense(editingExpenseId, payload)
      : addExpense({
          ...payload,
          user_id: user.id
        });

    const { error: actionError } = await action;

    setSaving(false);

    if (actionError) {
      setError(actionError.message);
      return;
    }

    setMessage(t('dataSynced'));
    closeAddModal();
    await loadExpenses();
  };

  const handleDelete = async (expense) => {
    if (!expense?.id) return;

    const confirmed = window.confirm('Delete this entry?');
    if (!confirmed) return;

    setSaving(true);
    setError('');

    const { error: deleteError } = await deleteExpense(expense.id);

    setSaving(false);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadExpenses();
  };

  const handleImport = async (rows) => {
    if (!rows?.length) return;

    const mappedRows = rows
      .map((row) => {
        const billerName = row['Biller Name'] || row.Name || row.Person || '';
        const amount = Number(row.Amount || row.amount || 0);
        const category = row.Category || row.category || LEDGER_CATEGORIES[0];
        const entryType = String(row.Type || row.EntryType || row.entry_type || 'debit').toLowerCase();
        const personType = String(row.PersonType || row.person_type || 'customer').toLowerCase();
        const note = row.Description || row.Note || row.note || '';
        const phone = row.Mobile || row.Phone || row.phone || '';
        const date = parseImportedDate(row.Date || row.date);

        if (!billerName || amount <= 0) return null;

        return {
          ...buildExpensePayload({
            billerName,
            amount,
            displayCategory: category,
            personType,
            entryType,
            note,
            phone,
            date
          }),
          user_id: user.id
        };
      })
      .filter(Boolean);

    if (!mappedRows.length) {
      throw new Error('No valid rows found in file.');
    }

    const { error: importError } = await bulkInsertExpenses(mappedRows);
    if (importError) throw importError;

    setMessage(t('dataSynced'));
    await loadExpenses();
  };

  const exportRows = useMemo(() => {
    return searchFilteredExpenses.map((item) => ({
      Date: item.date ? format(new Date(item.date), 'dd/MM/yyyy') : '-',
      Person: item.biller_name,
      Type: item.entryType,
      Category: item.displayCategory,
      Amount: Number(item.amount || 0),
      Note: item.cleanDescription || '',
      Phone: item.phone || ''
    }));
  }, [searchFilteredExpenses]);

  const handleExportExcel = () => {
    if (!exportRows.length) return;

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger');
    XLSX.writeFile(workbook, `khatawali-ledger-${Date.now()}.xlsx`);
  };

  const handleExportPdf = () => {
    if (!exportRows.length) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    doc.setFontSize(15);
    doc.text('Khatawali Ledger Statement', 40, 42);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}`, 40, 60);

    autoTable(doc, {
      head: [['Date', 'Person', 'Type', 'Category', 'Amount', 'Note']],
      body: exportRows.map((row) => [row.Date, row.Person, row.Type, row.Category, formatAmount(row.Amount), row.Note]),
      startY: 78,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [12, 95, 69] }
    });

    doc.save(`khatawali-ledger-${Date.now()}.pdf`);
  };

  const setRangeMode = (mode) => {
    setRangeFilter((prev) => ({ ...prev, mode }));
  };

  return (
    <div className="ledger-screen">
      <header className="ledger-topbar">
        <div className="account-strip">
          <img src="/icon-192.png" alt="Khatawali" className="ledger-logo" />
          <div className="account-meta">
            <h1>{filters.year || t('defaultYearLabel')}</h1>
            <p>
              {user?.email} <i className="bi bi-check2"></i>
            </p>
          </div>
          <button className="icon-top-btn" type="button" onClick={() => setShowFilterModal(true)}>
            <i className="bi bi-pencil-fill"></i>
          </button>
        </div>

        <div className="search-area">
          <input
            type="text"
            className="ledger-search"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            placeholder={t('searchPlaceholder')}
          />

          <div className="action-row">
            <button className="mini-action" type="button" onClick={() => setHideTotal((prev) => !prev)}>
              <i className={`bi ${hideTotal ? 'bi-toggle-off' : 'bi-toggle-on'}`}></i>
              <span>{hideTotal ? t('showTotal') : t('hideTotal')}</span>
            </button>

            <button className="mini-action" type="button" onClick={() => setShowFilterModal(true)}>
              <i className="bi bi-funnel-fill"></i>
              <span>{t('filter')}</span>
            </button>

            <button className="mini-action" type="button" onClick={() => setShowStatementModal(true)}>
              <i className="bi bi-card-list"></i>
              <span>{t('statement')}</span>
            </button>

            <button className="mini-action" type="button" onClick={() => setShowImportModal(true)}>
              <i className="bi bi-file-arrow-up-fill"></i>
              <span>{t('import')}</span>
            </button>

            <button className="mini-action" type="button" onClick={handleExportPdf}>
              <i className="bi bi-file-earmark-pdf"></i>
              <span>{t('pdf')}</span>
            </button>

            <button className="mini-action" type="button" onClick={handleExportExcel}>
              <i className="bi bi-file-earmark-spreadsheet"></i>
              <span>{t('excel')}</span>
            </button>

            <div className="menu-anchor">
              <button className="mini-action" type="button" onClick={() => setShowMenu((prev) => !prev)}>
                <i className="bi bi-list"></i>
                <span>{t('mainMenu')}</span>
              </button>

              {showMenu && (
                <div className="ledger-menu-dropdown">
                  <div className="menu-title">{t('language')}</div>
                  <button
                    className={`menu-item ${language === 'mr' ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      setLanguage('mr');
                      setShowMenu(false);
                    }}
                  >
                    {t('marathi')}
                  </button>
                  <button
                    className={`menu-item ${language === 'en' ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      setLanguage('en');
                      setShowMenu(false);
                    }}
                  >
                    {t('english')}
                  </button>
                  <Link className="menu-item" to="/profile" onClick={() => setShowMenu(false)}>
                    {t('profile')}
                  </Link>
                  <button className="menu-item" type="button" onClick={() => void setShowImportModal(true)}>
                    {t('import')}
                  </button>
                  <button className="menu-item danger" type="button" onClick={() => void signOut()}>
                    {t('signOut')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="ledger-content">
        {error && <div className="alert alert-danger py-2 mb-2">{error}</div>}
        {message && <div className="alert alert-success py-2 mb-2">{message}</div>}

        {loading ? (
          <div className="loader-shell">
            <Loader />
          </div>
        ) : groupedPeople.length === 0 ? (
          <div className="ledger-empty">
            <h2>{t('emptyLedgerTitle')}</h2>
            <p>{t('emptyLedgerHint')}</p>
            <p>{t('emptyLedgerHintMr')}</p>
          </div>
        ) : (
          <div className="people-list">
            {groupedPeople.map((person) => (
              <article key={person.name} className="person-row-card">
                <div className="person-avatar">{person.name.slice(0, 1).toUpperCase()}</div>

                <div className="person-main">
                  <h3>{person.name}</h3>

                  <div className="person-amounts">
                    <span className="credit-text">Cr {Number(person.credit || 0).toLocaleString('en-IN')}</span>
                    <span className="debit-text">Dr {Number(person.debit || 0).toLocaleString('en-IN')}</span>
                  </div>

                  <div className="person-time">
                    {person.lastTransactionAt
                      ? `${format(new Date(person.lastTransactionAt), 'dd/MM/yyyy')} | ${format(new Date(person.lastTransactionAt), 'hh:mm a')}`
                      : '-'}
                  </div>
                </div>

                <div className="person-side">
                  <div className="person-balance">{formatAmount(person.balance)}</div>
                  <div className="person-type">{t(person.personType)}</div>
                  <div className="quick-actions">
                    <button type="button" className="quick-icon" onClick={() => openAddModal(person.lastExpense)}>
                      <i className="bi bi-pencil-fill"></i>
                    </button>
                    <button type="button" className="quick-icon danger" onClick={() => void handleDelete(person.lastExpense)}>
                      <i className="bi bi-trash3-fill"></i>
                    </button>
                    {person.phone ? (
                      <a className="quick-icon" href={`tel:${person.phone}`}>
                        <i className="bi bi-telephone-fill"></i>
                      </a>
                    ) : (
                      <span className="quick-icon disabled">
                        <i className="bi bi-telephone-fill"></i>
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <section className="ledger-bottom-bar">
        <div className="person-type-tabs">
          {personTypeTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`tab-btn ${filters.personType === tab ? 'active' : ''}`}
              onClick={() => setFilters((prev) => ({ ...prev, personType: tab }))}
            >
              {t(tab)}
            </button>
          ))}
        </div>

        {!hideTotal && (
          <div className="totals-grid">
            <div className="totals-main">
              <span>{t('total')}</span>
              <strong>{formatAmount(balance)}</strong>
            </div>
            <div className="totals-split">
              <div>
                <label>{t('totalCredit')}</label>
                <strong className="credit-text">{formatAmount(totals.credit)}</strong>
              </div>
              <div>
                <label>{t('totalDebit')}</label>
                <strong className="debit-text">{formatAmount(totals.debit)}</strong>
              </div>
            </div>
          </div>
        )}

        <button className="add-person-fab" type="button" onClick={() => openAddModal()}>
          <i className="bi bi-person-plus-fill"></i>
          <span>{t('addPerson')}</span>
        </button>
      </section>

      {showAddModal && (
        <div className="ledger-modal-overlay" onClick={closeAddModal}>
          <div className="ledger-modal" onClick={(event) => event.stopPropagation()}>
            <h3>{editingExpenseId ? t('editPersonEntry') : t('addNewPerson')}</h3>

            <form className="ledger-form" onSubmit={handleSaveEntry}>
              <div className="dual-cols">
                {PERSON_TYPES.map((type) => (
                  <label key={type} className="type-chip">
                    <input
                      type="radio"
                      name="personType"
                      value={type}
                      checked={entryForm.personType === type}
                      onChange={(event) => setEntryForm((prev) => ({ ...prev, personType: event.target.value }))}
                    />
                    <span>{t(type)}</span>
                  </label>
                ))}
              </div>

              <div className="mb-2">
                <label className="form-label">{t('personName')}</label>
                <input
                  className="form-control"
                  value={entryForm.billerName}
                  onChange={(event) => setEntryForm((prev) => ({ ...prev, billerName: event.target.value }))}
                  placeholder={t('personName')}
                  required
                />
              </div>

              <div className="mb-2">
                <label className="form-label">{t('category')}</label>
                <select
                  className="form-select"
                  value={entryForm.category}
                  onChange={(event) => setEntryForm((prev) => ({ ...prev, category: event.target.value }))}
                >
                  {LEDGER_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="dual-cols">
                <div>
                  <label className="form-label">{t('mobileNumber')}</label>
                  <input
                    className="form-control"
                    value={entryForm.phone}
                    onChange={(event) => setEntryForm((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder={t('mobileNumber')}
                  />
                </div>
                <div>
                  <label className="form-label">{t('amount')}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    value={entryForm.amount}
                    onChange={(event) => setEntryForm((prev) => ({ ...prev, amount: event.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="dual-cols">
                <div>
                  <label className="form-label">{t('transactionType')}</label>
                  <select
                    className="form-select"
                    value={entryForm.entryType}
                    onChange={(event) => setEntryForm((prev) => ({ ...prev, entryType: event.target.value }))}
                  >
                    {ENTRY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {t(type)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">{t('date')}</label>
                  <input
                    type="date"
                    className="form-control"
                    value={entryForm.date}
                    onChange={(event) => setEntryForm((prev) => ({ ...prev, date: event.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="mb-2">
                <label className="form-label">{t('note')}</label>
                <input
                  className="form-control"
                  value={entryForm.note}
                  onChange={(event) => setEntryForm((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder={t('note')}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline-secondary" onClick={closeAddModal}>
                  {t('cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? t('loading') : editingExpenseId ? t('update') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showFilterModal && (
        <div className="ledger-modal-overlay" onClick={() => setShowFilterModal(false)}>
          <div className="ledger-modal" onClick={(event) => event.stopPropagation()}>
            <h3>{t('filter')}</h3>

            <div className="dual-cols">
              <div>
                <label className="form-label">{t('year')}</label>
                <select
                  className="form-select"
                  value={filters.year}
                  onChange={(event) => setFilters((prev) => ({ ...prev, year: event.target.value }))}
                >
                  <option value="">All</option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">{t('month')}</label>
                <select
                  className="form-select"
                  value={filters.month}
                  onChange={(event) => setFilters((prev) => ({ ...prev, month: event.target.value }))}
                >
                  <option value="">All</option>
                  {monthLabels.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  setFilters((prev) => ({
                    ...prev,
                    year: String(new Date().getFullYear()),
                    month: ''
                  }));
                }}
              >
                {t('clearFilters')}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setShowFilterModal(false)}>
                {t('applyFilters')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showStatementModal && (
        <div className="ledger-modal-overlay" onClick={() => setShowStatementModal(false)}>
          <div className="ledger-modal" onClick={(event) => event.stopPropagation()}>
            <h3>{t('selectStatementRange')}</h3>

            <div className="range-list">
              {rangeOptions.map((option) => (
                <label key={option.key} className="range-option">
                  <input
                    type="radio"
                    name="rangeMode"
                    checked={rangeFilter.mode === option.key}
                    onChange={() => setRangeMode(option.key)}
                  />
                  <span>{t(option.labelKey)}</span>
                </label>
              ))}
            </div>

            <div className="dual-cols">
              <div>
                <label className="form-label">{t('from')}</label>
                <input
                  type="date"
                  className="form-control"
                  value={rangeFilter.from}
                  onChange={(event) => setRangeFilter((prev) => ({ ...prev, mode: 'custom', from: event.target.value }))}
                />
              </div>
              <div>
                <label className="form-label">{t('to')}</label>
                <input
                  type="date"
                  className="form-control"
                  value={rangeFilter.to}
                  onChange={(event) => setRangeFilter((prev) => ({ ...prev, mode: 'custom', to: event.target.value }))}
                />
              </div>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-primary" onClick={handleExportPdf}>
                {t('pdf')}
              </button>
              <button type="button" className="btn btn-primary" onClick={handleExportExcel}>
                {t('excel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="ledger-modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="ledger-modal import-modal" onClick={(event) => event.stopPropagation()}>
            <h3>{t('import')}</h3>
            <p className="text-muted mb-2">{t('importInstructions')}</p>
            <ExcelImport onImport={handleImport} />
            <div className="modal-actions mt-2">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setShowImportModal(false)}>
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {saving && (
        <div className="loader-shell">
          <Loader />
        </div>
      )}

      {biometricEnabled && <div className="biometric-badge"><i className="bi bi-fingerprint"></i></div>}
    </div>
  );
};

export default Dashboard;
