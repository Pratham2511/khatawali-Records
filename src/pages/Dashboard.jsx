import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { toImagePayload } from '../services/fileService';
import { isContactPickerSupported, pickDeviceContact } from '../services/contactService';
import { loadAppConfig } from '../services/appConfigService';
import { pushDeletedEntry } from '../services/recycleBinService';
import {
  buildExpensePayload,
  decorateExpense,
  ENTRY_TYPES,
  LEDGER_CATEGORIES
} from '../utils/ledgerMeta';

const createInitialEntry = (defaultCategory) => ({
  billerName: '',
  category: defaultCategory,
  entryType: 'debit',
  amount: '',
  phone: '',
  note: '',
  date: new Date().toISOString().slice(0, 10),
  receipt: null
});

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
  const navigate = useNavigate();
  const location = useLocation();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [filters, setFilters] = useState({
    year: String(new Date().getFullYear()),
    month: '',
    search: ''
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

  const [categoryOptions] = useState(() => {
    const configuredItems = loadAppConfig().catalogItems || [];
    return configuredItems.length ? configuredItems : LEDGER_CATEGORIES;
  });

  const defaultCategory = categoryOptions[0] || LEDGER_CATEGORIES[0];

  const [entryForm, setEntryForm] = useState(() => createInitialEntry(defaultCategory));
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

  useEffect(() => {
    if (location.state?.openStatement) {
      setShowStatementModal(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const decoratedExpenses = useMemo(() => {
    return expenses.map(decorateExpense);
  }, [expenses]);

  const rangeFilteredExpenses = useMemo(() => {
    return decoratedExpenses.filter((item) => inRange(item.date, rangeFilter.mode, rangeFilter.from, rangeFilter.to));
  }, [decoratedExpenses, rangeFilter]);

  const searchFilteredExpenses = useMemo(() => {
    const query = filters.search.trim().toLowerCase();

    return rangeFilteredExpenses.filter((item) => {
      if (!query) return true;

      const haystack = [item.biller_name || '', item.phone || '', item.cleanDescription || '']
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [rangeFilteredExpenses, filters.search]);

  const groupedPeople = useMemo(() => {
    const map = new Map();

    searchFilteredExpenses.forEach((expense) => {
      const name = (expense.biller_name || '').trim() || 'Unknown';
      const existing = map.get(name) || {
        name,
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
        category: expense.displayCategory || defaultCategory,
        entryType: expense.entryType,
        amount: String(expense.amount || ''),
        phone: expense.phone || '',
        note: expense.cleanDescription || '',
        date: expense.date ? expense.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
        receipt: expense.receipt || null
      });
    } else {
      setEditingExpenseId(null);
      setEntryForm(createInitialEntry(defaultCategory));
    }

    setShowAddModal(true);
  };

  const closeAddModal = () => {
    setEditingExpenseId(null);
    setEntryForm(createInitialEntry(defaultCategory));
    setShowAddModal(false);
  };

  const handleSaveEntry = async (event) => {
    event.preventDefault();

    if (!user?.id) {
      setError('Session expired. Please login again.');
      return;
    }

    const normalizedAmount = Number(String(entryForm.amount || '').replace(/,/g, '').trim());

    if (!entryForm.billerName.trim() || !entryForm.date || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setError('Name, amount and date are required.');
      return;
    }

    setSaving(true);
    setError('');

    const payload = buildExpensePayload({
      billerName: entryForm.billerName,
      amount: normalizedAmount,
      displayCategory: entryForm.category,
      personType: 'customer',
      entryType: entryForm.entryType,
      note: entryForm.note,
      phone: entryForm.phone,
      date: entryForm.date,
      receipt: entryForm.receipt
    });

    const result = editingExpenseId
      ? await updateExpense(editingExpenseId, payload)
      : await addExpense({
          ...payload,
          user_id: user.id
        });

    const { data: savedExpense, error: actionError } = result;

    setSaving(false);

    if (actionError) {
      setError(actionError.message);
      return;
    }

    if (savedExpense?.id) {
      if (editingExpenseId) {
        setExpenses((prev) => prev.map((item) => (item.id === savedExpense.id ? savedExpense : item)));
      } else {
        setExpenses((prev) => [savedExpense, ...prev]);
      }
    }

    setMessage(t('dataSynced'));
    setFilters((prev) => ({ ...prev, search: '' }));
    closeAddModal();
    void loadExpenses();
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

    if (user?.id) {
      pushDeletedEntry({
        userId: user.id,
        snapshot: expense
      });
    }

    await loadExpenses();
  };

  const handleImport = async (rows) => {
    if (!rows?.length) return;

    const mappedRows = rows
      .map((row) => {
        const billerName = row['Biller Name'] || row.Name || row.Person || '';
        const amount = Number(row.Amount || row.amount || 0);
        const category = row.Category || row.category || defaultCategory;
        const entryType = String(row.Type || row.EntryType || row.entry_type || 'debit').toLowerCase();
        const note = row.Description || row.Note || row.note || '';
        const phone = row.Mobile || row.Phone || row.phone || '';
        const date = parseImportedDate(row.Date || row.date);

        if (!billerName || amount <= 0) return null;

        return {
          ...buildExpensePayload({
            billerName,
            amount,
            displayCategory: category,
            personType: 'customer',
            entryType,
            note,
            phone,
            date,
            receipt: null
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

  const statementPdfRows = useMemo(() => {
    const sorted = [...searchFilteredExpenses].sort((a, b) => {
      const aTime = new Date(a.created_at || a.date || '').getTime();
      const bTime = new Date(b.created_at || b.date || '').getTime();
      return aTime - bTime;
    });

    let runningBalance = 0;

    return sorted.map((item, index) => {
      runningBalance += item.entryType === 'credit' ? Number(item.amount || 0) : -Number(item.amount || 0);

      return {
        no: index + 1,
        dateTime:
          item.date && item.created_at
            ? `${format(new Date(item.date), 'dd/MM/yyyy')}\n${format(new Date(item.created_at), 'hh:mm a')}`
            : item.date
              ? format(new Date(item.date), 'dd/MM/yyyy')
              : '-',
        remarks: item.cleanDescription || item.biller_name || '-',
        debit: item.entryType === 'debit' ? Number(item.amount || 0) : null,
        credit: item.entryType === 'credit' ? Number(item.amount || 0) : null,
        closing: runningBalance
      };
    });
  }, [searchFilteredExpenses]);

  const handleExportExcel = () => {
    if (!exportRows.length) return;

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ledger');
    XLSX.writeFile(workbook, `khatawali-ledger-${Date.now()}.xlsx`);
  };

  const handleExportPdf = () => {
    if (!statementPdfRows.length) return;

    const profile = loadAppConfig().profile;
    const customerName = profile.displayName || user?.user_metadata?.name || user?.email || 'Khatawali User';
    const customerPhone = profile.phone || '-';

    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

    doc.setFillColor(229, 245, 245);
    doc.rect(20, 16, 555, 74, 'F');

    doc.setTextColor(16, 71, 83);
    doc.setFontSize(24);
    doc.text('Udhar Khata Book', 30, 47);

    doc.setTextColor(34, 44, 48);
    doc.setFontSize(10);
    doc.text('Digital India ka safe and secure Udhar Khata Book.', 30, 63);

    doc.setFillColor(239, 248, 248);
    doc.rect(20, 92, 555, 24, 'F');
    doc.setFontSize(11);
    doc.setTextColor(25, 102, 111);
    doc.text('Transaction Report of All Time', 210, 108);

    doc.setTextColor(20, 83, 87);
    doc.setFontSize(12);
    doc.text(`Name  :  ${customerName}`, 30, 135);
    doc.text(`Phone :  ${customerPhone}`, 300, 135);
    doc.text(`Linked:  ${user?.email || '-'}`, 30, 154);

    autoTable(doc, {
      head: [['No', 'Date', 'Remarks', 'Debit (Out)', 'Credit (In)', 'Cls Balance']],
      body: statementPdfRows.map((row) => [
        row.no,
        row.dateTime,
        row.remarks,
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
        const row = statementPdfRows[hookData.row.index];
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

    const totalDebit = statementPdfRows.reduce((sum, row) => sum + (row.debit || 0), 0);
    const totalCredit = statementPdfRows.reduce((sum, row) => sum + (row.credit || 0), 0);
    const lastClosing = statementPdfRows[statementPdfRows.length - 1]?.closing || 0;

    const finalY = doc.lastAutoTable?.finalY || 170;
    doc.setDrawColor(199, 217, 219);
    doc.line(20, finalY + 10, 575, finalY + 10);

    doc.setFontSize(12);
    doc.setTextColor(22, 96, 48);
    doc.text(`Total Credit ₹ : ${totalCredit.toLocaleString('en-IN')}`, 30, finalY + 30);

    doc.setTextColor(169, 41, 43);
    doc.text(`Total Debit ₹ : ${totalDebit.toLocaleString('en-IN')}`, 240, finalY + 30);

    doc.setTextColor(lastClosing >= 0 ? 22 : 169, lastClosing >= 0 ? 96 : 41, lastClosing >= 0 ? 48 : 43);
    doc.text(`Closing Balance ₹ : ${lastClosing.toLocaleString('en-IN')}`, 420, finalY + 30);

    doc.setFontSize(10);
    doc.setTextColor(100, 114, 118);
    doc.text(`Print Date: ${format(new Date(), 'dd/MM/yyyy hh:mm a')}`, 30, 820);
    doc.text('Page No. 1', 520, 820);

    doc.save(`khatawali-ledger-${Date.now()}.pdf`);
  };

  const setRangeMode = (mode) => {
    setRangeFilter((prev) => ({ ...prev, mode }));
  };

  const openPersonLedger = (personName) => {
    navigate(`/person/${encodeURIComponent(personName)}`);
  };

  const handlePickContact = async () => {
    try {
      if (!isContactPickerSupported()) {
        setError('Contact picker is available only on mobile app.');
        return;
      }

      const picked = await pickDeviceContact();

      setEntryForm((prev) => ({
        ...prev,
        billerName: picked.name || prev.billerName,
        phone: picked.phone || prev.phone
      }));
    } catch (pickError) {
      setError(pickError.message || 'Unable to pick contact.');
    }
  };

  const handleReceiptSelection = async (file) => {
    try {
      const receipt = await toImagePayload(file);
      setEntryForm((prev) => ({ ...prev, receipt }));
    } catch (receiptError) {
      setError(receiptError.message || 'Unable to process receipt image.');
    }
  };

  const handleMenuOption = (action) => {
    action();
    setShowMenu(false);
  };

  const menuOptions = [
    {
      icon: 'bi-bank',
      label: t('bankHolidays'),
      action: () => navigate('/bank-holidays')
    },
    {
      icon: 'bi-file-earmark-richtext',
      label: t('makeYourLetterhead'),
      action: () => navigate('/letterhead')
    },
    {
      icon: 'bi-whatsapp',
      label: t('customizeMessage'),
      action: () => navigate('/message-customization')
    },
    {
      icon: 'bi-node-plus-fill',
      label: t('addOrRemoveItem'),
      action: () => navigate('/item-manager')
    },
    {
      icon: 'bi-gear-fill',
      label: t('settingsAndProfile'),
      action: () => navigate('/profile')
    },
    {
      icon: 'bi-cloud-arrow-up-fill',
      label: t('exportData'),
      action: () => setShowStatementModal(true)
    },
    {
      icon: 'bi-envelope-at-fill',
      label: t('changeGmailId'),
      action: () => navigate('/change-gmail')
    },
    {
      icon: 'bi-arrow-repeat',
      label: t('restoreData'),
      action: () => setShowImportModal(true)
    },
    {
      icon: 'bi-question-circle-fill',
      label: t('helpSupport'),
      action: () => navigate('/help-support')
    },
    {
      icon: 'bi-trash3-fill',
      label: t('recycleBin'),
      action: () => navigate('/recycle-bin')
    }
  ];

  return (
    <div className="ledger-screen">
      <header className="ledger-topbar">
        <div className="account-strip">
          <img src="/icon-192.png" alt="Khatawali" className="ledger-logo" />
          <div className="account-meta">
            <h1>{t('appHeaderTitle')}</h1>
            <p>
              {user?.email} <i className="bi bi-check2"></i>
            </p>
          </div>
          <button className="icon-top-btn" type="button" onClick={() => navigate('/profile')}>
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

            <button className="mini-action" type="button" onClick={() => setShowStatementModal(true)}>
              <i className="bi bi-file-earmark-pdf"></i>
              <span>{t('pdfExcel')}</span>
            </button>

            <div className="menu-anchor">
              <button className="mini-action" type="button" onClick={() => setShowMenu((prev) => !prev)}>
                <i className="bi bi-list"></i>
                <span>{t('mainMenu')}</span>
              </button>

              {showMenu && (
                <div className="ledger-menu-dropdown">
                  <div className="menu-title d-flex justify-content-between align-items-center">
                    <span>{t('mainMenu')}</span>
                    <span className="menu-language-switch">
                      <button
                        className={`lang-btn ${language === 'mr' ? 'active' : ''}`}
                        type="button"
                        onClick={() => setLanguage('mr')}
                      >
                        मर
                      </button>
                      <button
                        className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                        type="button"
                        onClick={() => setLanguage('en')}
                      >
                        EN
                      </button>
                    </span>
                  </div>

                  {menuOptions.map((option) => (
                    <button key={option.label} className="menu-item icon-item" type="button" onClick={() => handleMenuOption(option.action)}>
                      <i className={`bi ${option.icon}`}></i>
                      <span>{option.label}</span>
                    </button>
                  ))}

                  <button className="menu-item danger icon-item" type="button" onClick={() => void signOut()}>
                    <i className="bi bi-box-arrow-right"></i>
                    <span>{t('signOut')}</span>
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
            <h2>{t('emptyLedgerTitle')}..!</h2>
            <p>{t('emptyLedgerHint')}</p>
            <p>{t('emptyLedgerHintMr')}</p>
          </div>
        ) : (
          <div className="people-list">
            {groupedPeople.map((person) => (
              <article
                key={person.name}
                className="person-row-card clickable-person"
                role="button"
                tabIndex={0}
                onClick={() => openPersonLedger(person.name)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openPersonLedger(person.name);
                  }
                }}
              >
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
                  <div className="quick-actions">
                    <button
                      type="button"
                      className="quick-icon"
                      onClick={(event) => {
                        event.stopPropagation();
                        openAddModal(person.lastExpense);
                      }}
                    >
                      <i className="bi bi-pencil-fill"></i>
                    </button>
                    <button
                      type="button"
                      className="quick-icon danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleDelete(person.lastExpense);
                      }}
                    >
                      <i className="bi bi-trash3-fill"></i>
                    </button>
                    {person.phone ? (
                      <a
                        className="quick-icon"
                        href={`tel:${person.phone}`}
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                      >
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
              <div className="mb-2">
                <label className="form-label">{t('personName')}</label>
                <div className="input-group">
                  <input
                    className="form-control"
                    value={entryForm.billerName}
                    onChange={(event) => setEntryForm((prev) => ({ ...prev, billerName: event.target.value }))}
                    placeholder={t('personName')}
                    required
                  />
                  <button type="button" className="btn btn-outline-primary" onClick={() => void handlePickContact()}>
                    <i className="bi bi-person-lines-fill"></i>
                  </button>
                </div>
              </div>

              <div className="mb-2">
                <label className="form-label">{t('category')}</label>
                <select
                  className="form-select"
                  value={entryForm.category}
                  onChange={(event) => setEntryForm((prev) => ({ ...prev, category: event.target.value }))}
                >
                  {categoryOptions.map((category) => (
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
                <div className="input-group">
                  <input
                    className="form-control"
                    value={entryForm.note}
                    onChange={(event) => setEntryForm((prev) => ({ ...prev, note: event.target.value }))}
                    placeholder={t('note')}
                  />
                  <label className="btn btn-outline-primary mb-0">
                    <i className="bi bi-receipt"></i>
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(event) => void handleReceiptSelection(event.target.files?.[0])}
                    />
                  </label>
                </div>

                {entryForm.receipt?.dataUrl && (
                  <div className="receipt-preview-wrap mt-2">
                    <img src={entryForm.receipt.dataUrl} alt="Receipt" className="receipt-preview" />
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => setEntryForm((prev) => ({ ...prev, receipt: null }))}
                    >
                      {t('remove')}
                    </button>
                  </div>
                )}
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
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  handleExportPdf();
                  setShowStatementModal(false);
                }}
              >
                {t('makeFullPdf')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  handleExportExcel();
                  setShowStatementModal(false);
                }}
              >
                {t('makeFullExcel')}
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
