import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Folder, Plus, ArrowRight, Trash2 } from 'lucide-react';
import { api } from '../api';
import './Projects.css';

const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
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

  const handleDeleteClick = (e, project) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToDelete(project);
  };

  const confirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      setIsDeleting(true);
      await api.delete(`/project/${projectToDelete.id}/delete`);
      setProjects(projects.filter(p => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    } catch (err) {
      console.error("Failed to delete project", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="projects-page animate-fade-in">
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 className="project-name">{project.title || 'Untitled Project'}</h3>
                <button 
                  className="icon-btn delete-btn" 
                  onClick={(e) => handleDeleteClick(e, project)} 
                  title="Delete project"
                  style={{ zIndex: 10, position: 'relative', marginTop: '-0.2rem' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
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

      {projectToDelete && (
        <div className="modal-overlay" onClick={() => !isDeleting && setProjectToDelete(null)}>
          <div className="modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <h3>Delete Project</h3>
            <p>Are you sure you want to delete <strong>{projectToDelete.title}</strong>? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setProjectToDelete(null)} disabled={isDeleting}>Cancel</button>
              <button className="btn-primary" style={{ background: '#ef4444', boxShadow: 'none' }} onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
