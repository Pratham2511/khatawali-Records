import React, { useEffect, useMemo, useState } from 'react';

const keypad = ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '(', ')', 'C', '='];

const sanitizeExpression = (value) => String(value || '').replace(/[^0-9+\-*/().\s]/g, '');

const evaluateExpression = (value) => {
  const safeExpression = sanitizeExpression(value).trim();

  if (!safeExpression) {
    return '';
  }

  if (!/^[0-9+\-*/().\s]+$/.test(safeExpression)) {
    throw new Error('Invalid expression');
  }

  // Uses restricted sanitized input to evaluate basic arithmetic expressions.
  const result = Function(`"use strict"; return (${safeExpression});`)();

  if (!Number.isFinite(result)) {
    throw new Error('Invalid result');
  }

  return String(Number(result.toFixed(2)));
};

const CalculatorModal = ({ open, initialValue = '', onApply, onClose }) => {
  const [expression, setExpression] = useState(String(initialValue || ''));
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setExpression(String(initialValue || ''));
      setError('');
    }
  }, [open, initialValue]);

  const canApply = useMemo(() => {
    return expression.trim().length > 0;
  }, [expression]);

  if (!open) return null;

  const appendToken = (token) => {
    setError('');

    if (token === 'C') {
      setExpression('');
      return;
    }

    if (token === '=') {
      try {
        const result = evaluateExpression(expression);
        setExpression(result);
      } catch {
        setError('Please check the expression.');
      }
      return;
    }

    setExpression((prev) => `${prev}${token}`);
  };

  const applyValue = () => {
    try {
      const result = evaluateExpression(expression);
      onApply(result || expression);
      onClose();
    } catch {
      setError('Please check the expression.');
    }
  };

  return (
    <div className="calculator-overlay" onClick={onClose}>
      <div className="calculator-card" onClick={(event) => event.stopPropagation()}>
        <div className="calculator-head">
          <h4>Calculator</h4>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        <input
          className="form-control calculator-display"
          value={expression}
          onChange={(event) => setExpression(sanitizeExpression(event.target.value))}
          placeholder="0"
        />

        {error && <p className="calculator-error">{error}</p>}

        <div className="calculator-grid">
          {keypad.map((token) => (
            <button type="button" key={token} className="calculator-key" onClick={() => appendToken(token)}>
              {token}
            </button>
          ))}
        </div>

        <button type="button" className="btn btn-primary w-100 mt-2" onClick={applyValue} disabled={!canApply}>
          Use Value
        </button>
      </div>
    </div>
  );
};

export default CalculatorModal;
