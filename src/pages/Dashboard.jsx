import React, { useEffect, useMemo, useState } from 'react';
import ExpenseForm from '../components/ExpenseForm';
import ExpenseTable from '../components/ExpenseTable';
import Analytics from '../components/Analytics';
import ExcelImport from '../components/ExcelImport';
import Loader from '../components/loader/Loader';
import { useAuth } from '../hooks/useAuth';
import { addExpense, bulkInsertExpenses, deleteExpense, fetchExpenses, updateExpense } from '../services/expenseService';

const Dashboard = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ year: new Date().getFullYear(), month: '', biller: '' });
  const [editExpense, setEditExpense] = useState(null);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  const loadExpenses = async () => {
    setLoading(true);
    setError('');
    const { data, error: fetchError } = await fetchExpenses({
      userId: user.id,
      year: filters.year,
      month: filters.month,
      billerName: filters.biller
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
    if (user) {
      loadExpenses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filters.year, filters.month, filters.biller]);

  const handleSubmit = async (payload) => {
    setSaving(true);
    setError('');
    const action = editExpense ? updateExpense(editExpense.id, payload) : addExpense({ ...payload, user_id: user.id });
    const { error: actionError } = await action;
    setSaving(false);
    if (actionError) {
      setError(actionError.message);
    } else {
      setEditExpense(null);
      await loadExpenses();
    }
  };

  const handleDelete = async (exp) => {
    setSaving(true);
    const { error: delError } = await deleteExpense(exp.id);
    setSaving(false);
    if (delError) {
      setError(delError.message);
    } else {
      await loadExpenses();
    }
  };

  const handleImport = async (rows) => {
    const shaped = rows.map((r) => ({
      user_id: user.id,
      biller_name: r['Biller Name'],
      amount: Number(r.Amount || 0),
      category: r.Category,
      description: r.Description,
      date: r.Date
    }));
    const { error: importError } = await bulkInsertExpenses(shaped);
    if (importError) throw importError;
    await loadExpenses();
  };

  return (
    <div className="row g-3">
      <div className="col-lg-4">
        <ExpenseForm onSubmit={handleSubmit} initialValues={editExpense} onCancel={() => setEditExpense(null)} loading={saving} />
        <div className="card p-3 mt-3">
          <div className="form-section-title">Filters</div>
          <div className="row g-2">
            <div className="col-6">
              <label className="form-label">Year</label>
              <select
                className="form-select"
                value={filters.year}
                onChange={(e) => setFilters((p) => ({ ...p, year: e.target.value }))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
                <option value="">All</option>
              </select>
            </div>
            <div className="col-6">
              <label className="form-label">Month</label>
              <select
                className="form-select"
                value={filters.month}
                onChange={(e) => setFilters((p) => ({ ...p, month: e.target.value }))}
              >
                <option value="">All</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label">Search Biller</label>
              <input
                className="form-control"
                placeholder="Search biller name"
                value={filters.biller}
                onChange={(e) => setFilters((p) => ({ ...p, biller: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="col-lg-8">
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {loading ? (
          <div className="loader-shell">
            <Loader />
          </div>
        ) : (
          <>
            <ExpenseTable expenses={expenses} onEdit={setEditExpense} onDelete={handleDelete} loading={saving} />
            <Analytics expenses={expenses} year={filters.year} />
            <ExcelImport onImport={handleImport} />
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
