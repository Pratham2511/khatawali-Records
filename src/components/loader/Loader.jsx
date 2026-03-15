import React from 'react';
import './loader.css';

const Loader = ({ overlay = false }) => (
  <div className={overlay ? 'loader-shell loader-host' : 'loader-host'} role="status" aria-live="polite" aria-label="Loading">
    <div className="loader-book-container">
      <div className="loader-book">
        <div className="loader-book-inner">
          <div className="loader-book-left" />
          <div className="loader-book-middle" />
          <div className="loader-book-right" />
        </div>

        <ul className="loader-book-pages">
          {Array.from({ length: 18 }).map((_, index) => (
            <li key={index} style={{ '--i': index }} />
          ))}
        </ul>
      </div>

      <span className="loader-sr-only">Loading</span>
    </div>
  </div>
);

export default Loader;
