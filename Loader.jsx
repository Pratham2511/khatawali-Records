import React from 'react';
import './loader.css';

const Loader = () => {
  return (
    <div className="loader-root" role="status" aria-live="polite" aria-label="Loading">
      <div className="book">
        <div className="inner">
          <div className="left" />
          <div className="middle" />
          <div className="right" />
        </div>
        <ul>
          {Array.from({ length: 18 }).map((_, index) => (
            <li key={index} style={{ '--i': index }} />
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Loader;
