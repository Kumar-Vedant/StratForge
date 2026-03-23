import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Network, Sun, Moon } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  const username = localStorage.getItem('username');
  const avatarLetter = username ? username.charAt(0).toUpperCase() : '?';
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="navbar-brand">
          <Network className="gradient-text" size={28} />
          <span>StratForge</span>
        </Link>
        <div className="navbar-links">
          <Link to="/" className="nav-link">Home</Link>
          {userId && <Link to="/projects" className="nav-link">My Projects</Link>}
        </div>
        <div className="nav-actions">
          <button className="icon-btn theme-toggle" onClick={toggleTheme} style={{ padding: '0.5rem', borderRadius: '50%', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'flex', color: 'var(--text-primary)' }}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          {userId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button className="btn-secondary" onClick={handleLogout}>Log Out</button>
              <Link to="/profile" className="profile-avatar" title="My Profile">
                {avatarLetter}
              </Link>
            </div>
          ) : (
            <Link to="/login" className="btn-primary">Sign In</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
