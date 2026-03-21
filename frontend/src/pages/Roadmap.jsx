import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Network, CheckCircle2, Circle, ArrowLeft, ArrowDown } from 'lucide-react';
import { api } from '../api';
import './Roadmap.css';

const Roadmap = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjectAndTasks = async () => {
      try {
        setLoading(true);
        // Fetch project metadata
        const projRes = await api.get(`/project/${projectId}`);
        setProject(projRes.data);
        
        // Fetch tasks
        const tasksRes = await api.get(`/roadmaptask/${projectId}`);
        if (Array.isArray(tasksRes.data)) {
           // Sort tasks by theoretical order/dependency or just keep original order
           setTasks(tasksRes.data);
        } else {
           setTasks([]);
        }
      } catch (err) {
        console.error("Failed to fetch roadmap data", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjectAndTasks();
  }, [projectId]);

  const toggleTaskCompletion = async (taskId, currentStatus) => {
    try {
      // Toggle status between 'PENDING' and 'COMPLETED' (or similar logic)
      const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
      await api.put(`/roadmaptask/${taskId}/update`, { status: newStatus });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error("Failed to update task", err);
    }
  };

  return (
    <div className="roadmap-page container animate-fade-in">
      <div className="roadmap-header">
        <Link to="/projects" className="back-link"><ArrowLeft size={18} /> Back to Projects</Link>
        <h1 className="project-title">{project ? project.name : 'Loading Project...'}</h1>
        <p className="project-desc">{project ? project.description : ''}</p>
      </div>

      {loading ? (
        <div className="loading-state">Loading Roadmap...</div>
      ) : tasks.length === 0 ? (
        <div className="empty-state glass-panel">
          <Network size={48} className="empty-icon text-secondary" />
          <h3>No tasks generated yet</h3>
          <p>It seems the AI didn't create tasks for this project, or they haven't been saved.</p>
        </div>
      ) : (
        <div className="roadmap-timeline">
          {tasks.map((task, index) => {
            const isCompleted = task.status === 'COMPLETED';
            return (
              <React.Fragment key={task.id}>
                <div className={`task-node glass-panel ${isCompleted ? 'completed' : ''}`}>
                  <div className="task-status-btn" onClick={() => toggleTaskCompletion(task.id, task.status)}>
                    {isCompleted ? <CheckCircle2 className="gradient-text" size={28} /> : <Circle className="text-secondary" size={28} />}
                  </div>
                  <div className="task-content">
                    <h3 className="task-title">{task.title || 'Untitled Task'}</h3>
                    <p className="task-desc">{task.description}</p>
                    {task.dependencies && task.dependencies.length > 0 && (
                      <div className="task-dependencies">
                        <span>Requires: {task.dependencies.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
                {index < tasks.length - 1 && (
                  <div className="timeline-connector">
                    <ArrowDown size={24} className="text-secondary" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Roadmap;
