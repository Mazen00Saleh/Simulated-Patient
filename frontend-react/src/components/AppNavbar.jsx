import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AppNavbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/cases');
  };
  return (
    <nav className="navbar navbar-sticky">
      <div className="container nav-container">
        <div className="logo nav-logo-container">
          <div className="logo-text">PsychSim <span className="text-primary">App</span></div>
          <div className="nav-links nav-links-wrapper" style={{ marginTop: '6px' }}>
            <Link to="/">Home</Link>
            <Link to="/cases">Cases</Link>
          </div>
        </div>
        <div className="nav-links nav-auth-container">
          {isAuthenticated ? (
            <>
              <span className="nav-greeting">Hi, {user?.name?.split(' ')[0]}</span>
              <button
                onClick={handleLogout}
                className="btn btn-sm btn-outline btn-logout"
              >
                Log Out
              </button>
            </>
          ) : (
            <Link></Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default AppNavbar;
