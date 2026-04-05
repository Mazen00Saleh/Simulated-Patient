import React from 'react';
import { Link } from 'react-router-dom';

const AppFooter = () => {
  return (
    <footer className="footer" style={{
      padding: '5rem 0 3rem 0',
      background: 'var(--bg-dark)',
      color: 'var(--text-light)',
      borderTop: 'none'
    }}>
      <div className="container footer-content" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(250px, 1fr) auto',
        gap: '3rem',
        alignItems: 'start',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '3rem'
      }}>
        <div className="footer-brand" style={{ maxWidth: '400px' }}>
          <div className="logo-text" style={{ fontSize: '1.75rem', marginBottom: '1rem', color: 'white' }}>
            PsychSim <span className="text-secondary" style={{ filter: 'brightness(1.5)' }}>App</span>
          </div>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', lineHeight: '1.7' }}>
            A state-of-the-art simulation platform empowering the next generation of mental health professionals through safe, realistic, AI-powered patient interactions.
          </p>
        </div>

        <div className="footer-links" style={{ display: 'flex', flexDirection: 'row', gap: '4rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Platform</h4>
            <Link to="/cases" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s' }}>View Cases</Link>
            <Link to="/login" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s' }}>Log In</Link>
            <Link to="/register" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s' }}>Create Account</Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ color: 'white', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Company</h4>
            <Link to="/" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s' }}>About Us</Link>
            <Link to="/" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s' }}>Contact</Link>
            <Link to="/" style={{ color: 'rgba(255, 255, 255, 0.7)', textDecoration: 'none', transition: 'color 0.2s' }}>Privacy</Link>
          </div>
        </div>
      </div>

      <div className="container footer-bottom" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '2.5rem',
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: '0.9rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <p style={{ margin: 0 }}>&copy; 2026 PsychSim Intake. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default AppFooter;
