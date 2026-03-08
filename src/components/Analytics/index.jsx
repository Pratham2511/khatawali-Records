import React, { useMemo } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle
} from 'chart.js';
import { format } from 'date-fns';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, ChartTitle);

const categories = ['pipeline', 'khat', 'society', 'maintenance'];

const Analytics = ({ expenses, year }) => {
  const summary = useMemo(() => {
    const totalsByCategory = categories.reduce((acc, cat) => ({ ...acc, [cat]: 0 }), {});
    const totalsByMonth = Array.from({ length: 12 }, () => 0);

    expenses.forEach((exp) => {
      const amt = Number(exp.amount || 0);
      if (totalsByCategory[exp.category] !== undefined) {
        totalsByCategory[exp.category] += amt;
      }
      if (exp.date) {
        const m = new Date(exp.date).getMonth();
        totalsByMonth[m] += amt;
      }
    });

    const totalSpent = expenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
    return { totalsByCategory, totalsByMonth, totalSpent };
  }, [expenses]);

  const pieData = {
    labels: categories,
    datasets: [
      {
        data: categories.map((c) => summary.totalsByCategory[c]),
        backgroundColor: ['#0f6b4a', '#2fb27f', '#7dd9ad', '#c5e8d6']
      }
    ]
  };

  const barData = {
    labels: Array.from({ length: 12 }, (_, i) => format(new Date(2024, i, 1), 'MMM')),
    datasets: [
      {
        label: 'Monthly Spend',
        data: summary.totalsByMonth,
        backgroundColor: '#1b8e5a'
      }
    ]
  };

  return (
    <div className="card p-3 section-card">
      <div className="form-section-title">Analytics ({year || 'All years'})</div>
      <div className="row g-3">
        <div className="col-md-4">
          <div className="stat-box">
            <div className="stat-label">Total Spending</div>
            <div className="stat-value">₹ {summary.totalSpent.toLocaleString()}</div>
          </div>
          <ul className="list-group list-group-flush mt-3">
            {categories.map((c) => (
              <li key={c} className="list-group-item d-flex justify-content-between align-items-center">
                <span className="text-capitalize">{c}</span>
                <span className="fw-semibold">₹ {summary.totalsByCategory[c].toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="col-md-4">
          <Pie data={pieData} options={{ plugins: { legend: { position: 'bottom' } } }} />
        </div>
        <div className="col-md-4">
          <Bar
            data={barData}
            options={{
              plugins: { legend: { display: false } },
              scales: { y: { ticks: { callback: (v) => `₹ ${v}` } } }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Analytics;
