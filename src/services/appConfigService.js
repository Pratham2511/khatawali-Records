const STORAGE_KEY = 'khatawali.app.config.v1';

export const defaultAppConfig = {
  profile: {
    displayName: '',
    detailLine: '',
    phone: '',
    logoDataUrl: '',
    qrDataUrl: '',
    stampDataUrl: ''
  },
  catalogItems: [
    'khat',
    'Tractor',
    'Maintenance',
    'society',
    'Shelke Pipeline',
    'Pansare Pipeline',
    'Korde Pipeline',
    'Anil',
    'Pappu',
    'Salim',
    'Shenkhate',
    'Sanket borachate Fertilizers',
    'Vijay',
    'Bhavana',
    'Uttam'
  ],
  denominations: {
    '50': true,
    '20': true,
    '10': true,
    '5': true,
    '2': true,
    '1': true
  },
  preferences: {
    soundOn: true,
    vibrationOn: true,
    fingerLockOn: false,
    autoShareOn: true,
    shareAsImage: true,
    addPreviousEntries: false,
    addPersonName: true,
    whatsappBusiness: false,
    autoEmailOn: false,
    invoiceShow: false,
    hideTimeInPdf: true
  },
  messages: {
    creditorLine1: 'Great..!',
    creditorLine2: 'Your financial credit is strong.',
    debtorLine1: 'Your payment is due.',
    debtorLine2: 'Please deposit it soon.',
    addQrWithMessage: false,
    addPersonNameInMessage: true
  }
};

const mergeDeep = (base, incoming) => {
  if (!incoming || typeof incoming !== 'object') return { ...base };

  return Object.keys(base).reduce((acc, key) => {
    const baseValue = base[key];
    const incomingValue = incoming[key];

    if (Array.isArray(baseValue)) {
      acc[key] = Array.isArray(incomingValue) ? incomingValue : [...baseValue];
      return acc;
    }

    if (baseValue && typeof baseValue === 'object') {
      acc[key] = mergeDeep(baseValue, incomingValue);
      return acc;
    }

    acc[key] = incomingValue === undefined ? baseValue : incomingValue;
    return acc;
  }, {});
};

export const loadAppConfig = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAppConfig;
    const parsed = JSON.parse(raw);
    return mergeDeep(defaultAppConfig, parsed);
  } catch {
    return defaultAppConfig;
  }
};

export const saveAppConfig = (nextConfig) => {
  const safeConfig = mergeDeep(defaultAppConfig, nextConfig);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeConfig));
  return safeConfig;
};

export const patchAppConfig = (partialConfig) => {
  const current = loadAppConfig();
  const merged = mergeDeep(current, partialConfig);
  return saveAppConfig(merged);
};
