import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Network } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');

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
          {userId ? (
            <button className="btn-secondary" onClick={handleLogout}>Log Out</button>
          ) : (
            <Link to="/login" className="btn-primary">Sign In</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
