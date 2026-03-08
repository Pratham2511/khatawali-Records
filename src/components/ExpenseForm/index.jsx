import React, { useEffect, useState } from 'react';

const categories = ['pipeline', 'khat', 'society', 'maintenance'];

const defaultValues = {
  biller_name: '',
  amount: '',
  category: categories[0],
  description: '',
  date: new Date().toISOString().slice(0, 10)
};

const ExpenseForm = ({ onSubmit, initialValues, onCancel, loading }) => {
  const [form, setForm] = useState(defaultValues);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialValues) {
      setForm({
        biller_name: initialValues.biller_name,
        amount: initialValues.amount,
        category: initialValues.category,
        description: initialValues.description || '',
        date: initialValues.date?.slice(0, 10) || defaultValues.date
      });
    }
  }, [initialValues]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!form.biller_name || !form.amount || !form.category || !form.date) {
      setError('Please fill in biller, amount, category, and date.');
      return;
    }

    const payload = {
      ...form,
      amount: Number(form.amount)
    };

    onSubmit(payload).catch((err) => setError(err.message || 'Unable to save expense.'));
  };

  const handleReset = () => {
    setForm(defaultValues);
    onCancel?.();
  };

  return (
    <form onSubmit={handleSubmit} className="card p-3">
      <div className="form-section-title">Add Expense</div>
      {error && <div className="alert alert-danger py-2">{error}</div>}
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label">Biller Name</label>
          <input
            name="biller_name"
            className="form-control"
            value={form.biller_name}
            onChange={handleChange}
            placeholder="e.g., Electricity Board"
            required
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Amount</label>
          <input
            type="number"
            name="amount"
            className="form-control"
            value={form.amount}
            onChange={handleChange}
            min="0"
            step="0.01"
            required
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Category</label>
          <select name="category" className="form-select" value={form.category} onChange={handleChange}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label">Description</label>
          <input
            name="description"
            className="form-control"
            value={form.description}
            onChange={handleChange}
            placeholder="Optional note"
          />
        </div>
        <div className="col-md-3">
          <label className="form-label">Date</label>
          <input type="date" name="date" className="form-control" value={form.date} onChange={handleChange} required />
        </div>
      </div>
      <div className="d-flex gap-2 mt-3">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving...' : initialValues ? 'Update Expense' : 'Add Expense'}
        </button>
        {initialValues && (
          <button type="button" className="btn btn-outline-secondary" onClick={handleReset} disabled={loading}>
            Cancel edit
          </button>
        )}
      </div>
    </form>
  );
};

export default ExpenseForm;
