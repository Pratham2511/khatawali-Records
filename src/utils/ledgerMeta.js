export const LEDGER_CATEGORIES = [
  'khat',
  'tractor',
  'शेळके पाईप लाईन',
  'पानसरे पाईप लाईन',
  'कोरडे पाईप लाईन',
  'ट्रैक्टर',
  'अनिल',
  'पप्पु',
  'सलिम',
  'शेणखते',
  'रासायनिक खते',
  'विजय',
  'भावना',
  'उत्तम',
  'society',
  'maintenance'
];

export const PERSON_TYPES = ['customer', 'supplier', 'other'];
export const ENTRY_TYPES = ['credit', 'debit'];

const META_PREFIX = '[[khatawali-meta:';
const META_SUFFIX = ']]';

const encodeBase64 = (raw) => {
  try {
    return window.btoa(unescape(encodeURIComponent(raw)));
  } catch {
    return '';
  }
};

const decodeBase64 = (encoded) => {
  try {
    return decodeURIComponent(escape(window.atob(encoded)));
  } catch {
    return '';
  }
};

const safeJson = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

export const normalizePersonType = (value) => {
  return PERSON_TYPES.includes(value) ? value : 'customer';
};

export const normalizeEntryType = (value) => {
  return value === 'credit' ? 'credit' : 'debit';
};

export const normalizeCategoryForStorage = (displayCategory) => {
  const lower = (displayCategory || '').trim().toLowerCase();

  if (lower === 'society') return 'society';
  if (lower === 'maintenance') return 'maintenance';
  if (lower.includes('pipe') || lower.includes('pipeline') || lower.includes('पाईप')) return 'pipeline';
  if (lower.includes('khat') || lower.includes('tractor') || lower.includes('ट्रैक्टर') || lower.includes('खते')) {
    return 'khat';
  }

  return 'maintenance';
};

export const withLedgerMeta = (description, meta) => {
  const clean = (description || '').trim();
  const payload = encodeBase64(JSON.stringify(meta || {}));
  if (!payload) return clean;
  return clean ? `${clean} ${META_PREFIX}${payload}${META_SUFFIX}` : `${META_PREFIX}${payload}${META_SUFFIX}`;
};

export const stripLedgerMeta = (description = '') => {
  const start = description.indexOf(META_PREFIX);
  if (start === -1) return description;
  return description.slice(0, start).trim();
};

export const readLedgerMeta = (description = '') => {
  const start = description.indexOf(META_PREFIX);
  if (start === -1) return {};

  const tokenStart = start + META_PREFIX.length;
  const end = description.indexOf(META_SUFFIX, tokenStart);
  if (end === -1) return {};

  const encoded = description.slice(tokenStart, end);
  return safeJson(decodeBase64(encoded));
};

export const buildExpensePayload = ({
  billerName,
  amount,
  displayCategory,
  personType,
  entryType,
  note,
  phone,
  date
}) => {
  const normalizedPersonType = normalizePersonType(personType);
  const normalizedEntryType = normalizeEntryType(entryType);
  const chosenCategory = displayCategory || LEDGER_CATEGORIES[0];

  const metadata = {
    displayCategory: chosenCategory,
    personType: normalizedPersonType,
    entryType: normalizedEntryType,
    phone: (phone || '').trim()
  };

  return {
    biller_name: (billerName || '').trim(),
    amount: Number(amount || 0),
    category: normalizeCategoryForStorage(chosenCategory),
    description: withLedgerMeta(note, metadata),
    date
  };
};

export const decorateExpense = (expense) => {
  const amount = Number(expense.amount || 0);
  const meta = readLedgerMeta(expense.description || '');
  const entryType = normalizeEntryType(meta.entryType);
  const personType = normalizePersonType(meta.personType);

  return {
    ...expense,
    amount,
    entryType,
    personType,
    phone: (meta.phone || '').trim(),
    displayCategory: meta.displayCategory || expense.category || 'maintenance',
    cleanDescription: stripLedgerMeta(expense.description || ''),
    credit: entryType === 'credit' ? amount : 0,
    debit: entryType === 'debit' ? amount : 0,
    balanceDelta: entryType === 'credit' ? amount : -amount
  };
};
