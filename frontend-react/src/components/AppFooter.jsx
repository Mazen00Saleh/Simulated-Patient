import React from 'react';
import { Link } from 'react-router-dom';

const AppFooter = () => {
  return (
    <footer className="footer" style={{
      background: 'var(--bg-dark)',
      color: 'var(--text-light)'
    }}>
      <div className="container footer-content">
        <div className="footer-brand">
          <div className="logo-text" style={{ color: 'white' }}>
            PsychSim <span className="text-primary">App</span>
          </div>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', lineHeight: '1.7' }}>
            A state-of-the-art simulation platform empowering the next generation of mental health professionals through safe, realistic, AI-powered patient interactions.
          </p>
        </div>

        <div className="footer-links">
          <h4 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '1.1rem' }}>About Us</h4>
          <Link to="/#features" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s' }}>Features</Link>
          <Link to="/#how-it-works" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s' }}>How It Works</Link>
          <Link to="/#roadmap" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s' }}>Roadmap</Link>
        </div>
      </div>

      <div className="container footer-bottom" style={{ color: 'rgba(255, 255, 255, 0.5)', }}>
        <p>&copy; 2026 PsychSim Intake. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default AppFooter;
