import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import './Header.css';
import dtuLogo from '../../assets/image.png'; // ሎጎህ እዚህ መሆኑን አረጋግጥ

function Header() {
  const getStoredUser = () => {
    const storedUser = localStorage.getItem('user');

    if (!storedUser) return null;

    try {
      const parsedUser = JSON.parse(storedUser);
      const hasUserData = parsedUser && typeof parsedUser === 'object' && (
        parsedUser.id !== undefined ||
        parsedUser.username !== undefined ||
        parsedUser.email !== undefined ||
        parsedUser.role !== undefined
      );

      return hasUserData ? parsedUser : null;
    } catch (error) {
      return null;
    }
  };

  const [user, setUser] = useState(() => getStoredUser());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin') || 
                       location.pathname.startsWith('/registrar') || 
                       location.pathname.startsWith('/head');
  const isDashboardRoute = isAdminRoute || location.pathname.startsWith('/student-dashboard');

  useEffect(() => {
    setUser(getStoredUser());
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const syncUser = (event) => {
      if (event.key === 'user') {
        setUser(getStoredUser());
      }
    };

    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const isAuthenticated = user !== null;

  return (
    <header className="main-header-container">
      {/* TIER 1: University Branding (Sefa yalena Blue) */}
      <div className="top-branding-tier">
        <div className="container d-flex align-items-center">
          <Link to="/" className="d-flex align-items-center text-decoration-none">
            <img src={dtuLogo} alt="DTU Logo" className="university-logo" />
            <div className="brand-text-wrapper ms-3">
              <h1 className="university-name">DEBRE TABOR UNIVERSITY</h1>
              <p className="system-subtitle">Student Department Placement System</p>
            </div>
          </Link>
        </div>
      </div>

      {/* TIER 2: Navigation (Tebeb yalena Professional) */}
      <nav className="navbar navbar-expand-lg navigation-tier">
        <div className="container position-relative">
          
          {/* Mobile Toggle */}
          <button
            className="navbar-toggler"
            type="button"
            aria-controls="dtuNavbar"
            aria-expanded={isMenuOpen}
            aria-label="Toggle navigation"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className={`collapse navbar-collapse ${isMenuOpen ? 'show' : ''}`} id="dtuNavbar">
            {/* Center Links (Home, Services, Contact) */}
            {!isAdminRoute && (
              <ul className="navbar-nav mx-auto mb-2 mb-lg-0">
                <li className="nav-item">
                  <NavLink to="/" end className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Home</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/services" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Services</NavLink>
                </li>
                <li className="nav-item">
                  <NavLink to="/contact" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Contact</NavLink>
                </li>
              </ul>
            )}

            {/* Top Right Action Button */}
            <div className="auth-action-wrapper ms-auto">
              {isAuthenticated && isDashboardRoute ? (
                <div className="d-flex align-items-center gap-3">
                  {user.role === 'admin' && <Link to="/admin-dashboard" className="dashboard-link">Dashboard</Link>}
                  <button onClick={handleLogout} className="btn btn-logout-custom">Logout</button>
                </div>
              ) : (
                <Link to="/login" className="btn btn-login-custom">Login</Link>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Header;