import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Folder, Plus, ArrowRight } from 'lucide-react';
import { api } from '../api';
import './Projects.css';

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          navigate('/login');
          return;
        }
        
        const res = await api.get(`/project/user/${userId}`);
        setProjects(Array.isArray(res.data.data) ? res.data.data : []);
      } catch (err) {
        console.error("Failed to fetch projects", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, [navigate]);

  return (
    <div className="projects-page container animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">My Projects</h1>
          <p className="page-subtitle">Manage your strategic roadmaps and plans.</p>
        </div>
        <Link to="/projects/create" className="btn-primary">
          <Plus size={20} /> New Project
        </Link>
      </header>
      
      {loading ? (
        <div className="loading-state">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="empty-state glass-panel">
          <Folder size={48} className="empty-icon text-secondary" />
          <h3>No projects yet</h3>
          <p>Create your first project to start generating a roadmap</p>
          <Link to="/projects/create" className="btn-primary" style={{ marginTop: '1.5rem' }}>
            Create Project
          </Link>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(project => (
            <Link to={`/projects/${project.id}/roadmap`} key={project.id} className="project-card glass-panel">
              <h3 className="project-name">{project.title || 'Untitled Project'}</h3>
              <p className="project-desc">{project.description ? project.description.substring(0, 100) + '...' : 'No description'}</p>
              
              <div className="project-card-footer">
                <span className="view-link">
                  View Roadmap <ArrowRight size={16} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Projects;
