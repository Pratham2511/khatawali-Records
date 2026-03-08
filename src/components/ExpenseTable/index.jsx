import React from 'react';
import { format } from 'date-fns';

const ExpenseTable = ({ expenses, onEdit, onDelete, loading }) => {
  return (
    <div className="card p-3 section-card">
      <div className="form-section-title">Expense Table</div>
      <div className="table-responsive">
        <table className="table align-middle">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Biller Name</th>
              <th scope="col">Category</th>
              <th scope="col">Description</th>
              <th scope="col" className="text-end">
                Amount
              </th>
              <th scope="col" className="text-end">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center text-muted py-4">
                  No expenses found.
                </td>
              </tr>
            )}
            {expenses.map((exp) => (
              <tr key={exp.id}>
                <td>{exp.date ? format(new Date(exp.date), 'yyyy-MM-dd') : '-'}</td>
                <td>{exp.biller_name}</td>
                <td>
                  <span className={`badge cat-${exp.category}`}>{exp.category}</span>
                </td>
                <td>{exp.description || '-'}</td>
                <td className="text-end fw-semibold">₹ {Number(exp.amount || 0).toLocaleString()}</td>
                <td className="text-end">
                  <div className="btn-group btn-group-sm">
                    <button className="btn btn-outline-primary" onClick={() => onEdit(exp)} disabled={loading}>
                      Edit
                    </button>
                    <button className="btn btn-outline-danger" onClick={() => onDelete(exp)} disabled={loading}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpenseTable;
