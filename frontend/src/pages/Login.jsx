import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Backend login expects username + password
        const res = await api.post('/auth/login', {
          username: formData.username,
          password: formData.password
        });
        
        // Backend returns success: true, data: { id, username, ... }
        if (res.data.success) {
          localStorage.setItem('userId', res.data.data.id);
          localStorage.setItem('username', res.data.data.username);
          navigate('/projects');
        }
      } else {
        // Backend register uses userController.userCreate
        const res = await api.post('/user/create', {
          username: formData.username,
          password: formData.password
        });
        
        // Backend returns success: true, data: { id, username, createdAt }
        if (res.data.success) {
          localStorage.setItem('userId', res.data.data.id);
          localStorage.setItem('username', res.data.data.username);
          navigate('/projects');
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page animate-fade-in">
      <div className="login-card glass-panel">
        <h2 className="login-title">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="login-subtitle">
          {isLogin ? 'Sign in to access your roadmaps' : 'Join StratForge to start planning'}
        </p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. stratforge_user" 
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="••••••••" 
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="login-footer">
          <p>
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button className="toggle-btn" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
