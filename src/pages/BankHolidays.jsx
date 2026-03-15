import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useLanguage } from '../hooks/useLanguage';

const createHolidayList = (year) => {
  return [
    { name: 'Republic Day', date: `${year}-01-26` },
    { name: 'Mahashivratri', date: `${year}-02-26` },
    { name: 'Holi', date: `${year}-03-14` },
    { name: 'Gudi Padwa', date: `${year}-03-30` },
    { name: 'Ram Navami', date: `${year}-04-06` },
    { name: 'Ambedkar Jayanti', date: `${year}-04-14` },
    { name: 'Maharashtra Day', date: `${year}-05-01` },
    { name: 'Independence Day', date: `${year}-08-15` },
    { name: 'Ganesh Chaturthi', date: `${year}-08-27` },
    { name: 'Gandhi Jayanti', date: `${year}-10-02` },
    { name: 'Diwali Laxmi Pujan', date: `${year}-10-20` },
    { name: 'Bhai Dooj', date: `${year}-10-23` },
    { name: 'Christmas', date: `${year}-12-25` }
  ];
};

const BankHolidays = () => {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  const holidays = useMemo(() => {
    return createHolidayList(year).map((item) => ({
      ...item,
      parsedDate: new Date(item.date)
    }));
  }, [year]);

  return (
    <div className="config-screen">
      <header className="config-topbar">
        <Link to="/dashboard" className="btn btn-sm btn-outline-secondary">
          <i className="bi bi-arrow-left me-1"></i>
          {t('close')}
        </Link>
        <h1>{t('bankHolidays')}</h1>
      </header>

      <main className="config-card-wrap">
        <section className="config-block">
          <p className="text-muted mb-2">{t('holidayDisclaimer')}</p>

          <div className="holiday-list">
            {holidays.map((holiday) => (
              <article className="holiday-item" key={`${holiday.name}-${holiday.date}`}>
                <strong>{holiday.name}</strong>
                <span>{format(holiday.parsedDate, 'dd MMM yyyy')}</span>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default BankHolidays;
