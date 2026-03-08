import React from 'react';
import './loader.css';

const Loader = () => (
  <div className="loader-container" role="status" aria-live="polite" aria-label="Loading">
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
    <span className="sr-only">Loading</span>
  </div>
);

export default Loader;
