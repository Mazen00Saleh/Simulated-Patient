import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar';
import AppFooter from '../components/AppFooter';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // Simulate authentication
    navigate('/cases');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppNavbar />
      <div className="auth-page page-transition" style={{ flex: 1 }}>
      <div className="glass-panel auth-card">
        <div className="auth-header">
          <h1>Welcome Back</h1>
          <p>Log in to access your saved cases</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              className="form-input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="auth-actions">
            <button type="submit" className="btn btn-primary btn-lg">Log In</button>
          </div>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register">Sign up</Link>
        </div>
      </div>
      </div>
      <AppFooter />
    </div>
  );
};

export default LoginPage;
