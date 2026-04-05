import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AppNavbar from '../components/AppNavbar';
import AppFooter from '../components/AppFooter';

const RegisterPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = (e) => {
    e.preventDefault();
    // Simulate registration
    navigate('/cases');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppNavbar />
      <div className="auth-page page-transition" style={{ flex: 1 }}>
      <div className="glass-panel auth-card">
        <div className="auth-header">
          <h1>Create an Account</h1>
          <p>Join PsychSim Intake to save your progress</p>
        </div>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label" htmlFor="fullName">Full Name</label>
            <input
              type="text"
              id="fullName"
              className="form-input"
              placeholder="Your Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

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
              minLength="8"
            />
          </div>

          <div className="auth-actions">
            <button type="submit" className="btn btn-primary btn-lg">Sign Up</button>
          </div>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
      </div>
      <AppFooter />
    </div>
  );
};

export default RegisterPage;
