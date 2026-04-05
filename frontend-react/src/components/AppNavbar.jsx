import React from 'react';
import { Link } from 'react-router-dom';

const AppNavbar = () => {
  return (
    <nav className="navbar" style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(12px)' }}>
      <div className="container nav-container">
        <div className="logo d-flex align-center" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Link to="/" className="btn btn-sm btn-outline" style={{ color: 'var(--text-main)', borderColor: 'var(--text-muted)' }}>
            ⮌
          </Link>
          <div className="logo-text">PsychSim <span className="text-secondary">App</span></div>
        </div>
        <div className="nav-links">
          <Link to="/cases" style={{ marginRight: '1rem', color: 'var(--text-muted)', fontWeight: 500, textDecoration: 'none' }}>Cases</Link>
          <Link to="/login" className="btn btn-sm btn-primary">Log In</Link>
        </div>
      </div>
    </nav>
  );
};

export default AppNavbar;
