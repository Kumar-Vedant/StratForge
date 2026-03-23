import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, LogOut } from 'lucide-react';
import { api } from '../api';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem('username');
  const userId = localStorage.getItem('userId');
  const avatarLetter = username ? username.charAt(0).toUpperCase() : '?';

  const [joinDate, setJoinDate] = useState('');

  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }
    
    const fetchUser = async () => {
      try {
        const res = await api.get(`/user/${userId}`);
        const userData = res.data?.data || res.data;
        if (userData?.createdAt) {
          const date = new Date(userData.createdAt);
          setJoinDate(date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }));
        }
      } catch (err) {
        console.error("Failed to fetch user data", err);
      }
    };
    
    fetchUser();
  }, [navigate, userId]);

  const handleLogout = () => {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    navigate('/login');
  };

  return (
    <div className="profile-page animate-fade-in">
      <div className="profile-header-meta">
        <Link to="/" className="back-link"><ArrowLeft size={18} /> Back to Home</Link>
      </div>
      
      <div className="profile-container glass-panel">
        <div className="profile-header">
          <div className="profile-avatar-large">
            {avatarLetter}
          </div>
          <div>
            <h1 className="profile-username">{username || 'Unknown User'}</h1>
            <p className="profile-id">Joined: {joinDate || 'Loading...'} </p>
          </div>
        </div>

        <div className="profile-details">
          <div className="detail-item">
            <User className="detail-icon" />
            <div>
              <span className="detail-label">Username</span>
              <p>{username || 'Not logged in'}</p>
            </div>
          </div>
        </div>

        <div className="profile-actions">
          <button className="btn-primary" style={{ background: '#ef4444', boxShadow: 'none' }} onClick={handleLogout}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
