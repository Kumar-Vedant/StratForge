import React from 'react';
import { Link } from 'react-router-dom';
import { Network, Zap, Layout } from 'lucide-react';
import './Home.css';

const Home = () => {
  return (
    <div className="home-page animate-fade-in">
      <header className="hero-section">
        <h1 className="hero-title">
          Map your vision with <span className="gradient-text">StratForge</span>
        </h1>
        <p className="hero-subtitle">
          AI-powered roadmap generation to transform your bold ideas into actionable, linked tasks.
        </p>
        <div className="hero-actions">
          <Link to="/projects/create" className="btn-primary">
            Start Generating
          </Link>
          <Link to="/projects" className="btn-secondary">
            View My Projects
          </Link>
        </div>
      </header>

      <section className="features-section container">
        <div className="feature-card glass-panel">
          <Zap className="feature-icon gradient-text" size={40} />
          <h3>AI Generation</h3>
          <p>Describe your project, and let our LLM instantly draft a comprehensive multi-step roadmap.</p>
        </div>
        <div className="feature-card glass-panel">
          <Network className="feature-icon gradient-text" size={40} />
          <h3>Task Linking</h3>
          <p>Connect dependent tasks dynamically. Visualize the critical path of your development directly in the browser.</p>
        </div>
        <div className="feature-card glass-panel">
          <Layout className="feature-icon gradient-text" size={40} />
          <h3>Clean Dashboard</h3>
          <p>Organize multiple ventures with a premium, responsive interface tailored for modern teams.</p>
        </div>
      </section>
    </div>
  );
};

export default Home;
