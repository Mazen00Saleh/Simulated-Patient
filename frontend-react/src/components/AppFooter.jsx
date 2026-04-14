import React from 'react';
import { Link } from 'react-router-dom';
import './AppFooter.css';

const AppFooter = () => {
  return (
    <footer className="app-footer">
      <div className="app-footer-content">
        <div className="app-footer-section">
          <h3 className="app-footer-brand">
            <span className="app-footer-icon">🔬</span>
            PsychSim
          </h3>
          <p className="app-footer-description">
            AI-powered mental health simulation platform for training healthcare professionals.
          </p>
        </div>

        <div className="app-footer-section">
          <h4 className="app-footer-heading">Navigate</h4>
          <nav className="app-footer-links">
            <Link to="/">Home</Link>
            <Link to="/cases">Cases</Link>
            <Link to="/#features">Features</Link>
          </nav>
        </div>

        <div className="app-footer-section">
          <h4 className="app-footer-heading">Learn More</h4>
          <nav className="app-footer-links">
            <a href="#" onClick={(e) => e.preventDefault()}>Documentation</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Support</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Contact</a>
          </nav>
        </div>
      </div>

      <div className="app-footer-divider"></div>

      <div className="app-footer-bottom">
        <p>&copy; 2026 PsychSim. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default AppFooter;
