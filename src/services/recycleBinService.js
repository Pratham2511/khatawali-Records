const STORAGE_KEY = 'khatawali.recycle.bin.v1';

const loadBin = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveBin = (entries) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  return entries;
};

export const listDeletedEntries = (userId) => {
  return loadBin().filter((item) => item.userId === userId);
};

export const pushDeletedEntry = ({ userId, snapshot }) => {
  const current = loadBin();
  const next = [
    {
      recycleId: crypto.randomUUID(),
      userId,
      deletedAt: new Date().toISOString(),
      snapshot
    },
    ...current
  ].slice(0, 150);

  return saveBin(next);
};

export const removeDeletedEntry = (recycleId) => {
  const current = loadBin();
  const next = current.filter((item) => item.recycleId !== recycleId);
  saveBin(next);
};

export const clearDeletedEntries = (userId) => {
  const current = loadBin();
  const next = current.filter((item) => item.userId !== userId);
  saveBin(next);
};
