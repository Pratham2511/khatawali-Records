import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../hooks/useLanguage';
import { loadAppConfig, saveAppConfig } from '../services/appConfigService';

const ItemManager = () => {
  const { t } = useLanguage();

  const initialItems = useMemo(() => loadAppConfig().catalogItems || [], []);

  const [items, setItems] = useState(initialItems);
  const [newItem, setNewItem] = useState('');
  const [saved, setSaved] = useState(false);

  const addItem = () => {
    const value = newItem.trim();
    if (!value) return;

    if (items.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setNewItem('');
      return;
    }

    setItems((prev) => [...prev, value]);
    setNewItem('');
  };

  const removeItem = (name) => {
    setItems((prev) => prev.filter((item) => item !== name));
  };

  const saveItems = () => {
    const config = loadAppConfig();
    saveAppConfig({
      ...config,
      catalogItems: items.length ? items : config.catalogItems
    });

    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="config-screen">
      <header className="config-topbar">
        <Link to="/dashboard" className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-arrow-left me-1"></i>
          {t('close')}
        </Link>
        <h1>{t('addOrRemoveItem')}</h1>
      </header>

      <main className="config-card-wrap">
        {saved && <div className="alert alert-success py-2">{t('dataSynced')}</div>}

        <section className="config-block">
          <div className="item-add-row">
            <input
              className="form-control"
              value={newItem}
              onChange={(event) => setNewItem(event.target.value)}
              placeholder={t('addItemPlaceholder')}
            />
            <button type="button" className="btn btn-primary" onClick={addItem}>
              {t('add')}
            </button>
          </div>

          <div className="item-list mt-3">
            {items.map((item) => (
              <div className="item-chip" key={item}>
                <span>{item}</span>
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeItem(item)}>
                  <i className="bi bi-x"></i>
                </button>
              </div>
            ))}
          </div>

          <button type="button" className="btn btn-primary mt-3" onClick={saveItems}>
            {t('save')}
          </button>
        </section>
      </main>
    </div>
  );
};

export default ItemManager;
