import React, { useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import Loader from '../loader/Loader';

const ExcelImport = ({ onImport }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setRows([]);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(sheet);
          setRows(data || []);
        } catch (err) {
          setError(err.message || 'Failed to parse Excel file');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setRows(results.data || []);
        },
        error: (err) => setError(err.message || 'Failed to parse file')
      });
    }
  };

  const handleConfirm = async () => {
    if (!rows.length) return;
    setLoading(true);
    setError('');
    try {
      await onImport(rows);
      setRows([]);
    } catch (err) {
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-3 section-card">
      <div className="form-section-title">Excel / CSV Import</div>
      <p className="text-muted mb-2">Columns required: Biller Name, Amount, Category, Description, Date</p>
      <input type="file" accept=".csv,.xlsx,.xls" className="form-control" onChange={handleFile} />
      {error && <div className="alert alert-danger mt-2 py-2">{error}</div>}

      {loading && (
        <div className="loader-shell">
          <Loader />
        </div>
      )}

      {rows.length > 0 && !loading && (
        <>
          <div className="alert alert-info mt-3 py-2">Parsed {rows.length} rows. Preview first 5:</div>
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Biller Name</th>
                  <th>Amount</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r, i) => (
                  <tr key={i}>
                    <td>{r['Biller Name']}</td>
                    <td>{r.Amount}</td>
                    <td>{r.Category}</td>
                    <td>{r.Description}</td>
                    <td>{r.Date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn btn-primary" onClick={handleConfirm} disabled={loading}>
            Confirm Import
          </button>
        </>
      )}
    </div>
  );
};

export default ExcelImport;
