import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Sparkles, Trash2, Edit2, CheckCircle2, Save, ArrowRight } from 'lucide-react';
import { api } from '../api';
import './Planning.css';

const Planning = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingReorder, setSavingReorder] = useState(false);

  // For inline editing
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '' });

  // For adding custom tasks
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '' });

  useEffect(() => {
    const fetchPlanData = async () => {
      try {
        setLoading(true);
        // GET Project details
        const projRes = await api.get(`/project/${projectId}`);
        const currentProject = projRes.data.data || projRes.data;
        setProject(currentProject);
        
        // Ensure Project is actually in PLANNING state
        // If it's already ACTIVE, immediately redirect to Roadmap page to prevent duplicating tasks
        if (currentProject.status !== 'PLANNING') {
          navigate(`/projects/${projectId}/roadmap`);
          return;
        }

        // GET existing Planning tasks
        const tasksRes = await api.get(`/planningtask/${projectId}`);
        if (Array.isArray(tasksRes.data?.data)) {
          setTasks(tasksRes.data.data);
        } else if (Array.isArray(tasksRes.data)) {
          setTasks(tasksRes.data);
        }
      } catch (err) {
        console.error("Failed to load planning data", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlanData();
  }, [projectId, navigate]);

  const handleDelete = async (taskId) => {
    try {
      await api.delete(`/planningtask/${taskId}/delete`);
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch(err) {
      console.error("Failed to delete task", err);
    }
  };

  const startEdit = (task) => {
    setEditingId(task.id);
    setEditForm({ title: task.title, description: task.description || '' });
  };

  const saveEdit = async (taskId) => {
    try {
      await api.put(`/planningtask/${taskId}/update`, editForm);
      setTasks(tasks.map(t => t.id === taskId ? { ...t, ...editForm } : t));
      setEditingId(null);
    } catch(err) {
      console.error("Failed to save edit", err);
    }
  };

  const handleCreateNewTask = async (e) => {
    e.preventDefault();
    if (!newTask.title) return;
    try {
      const res = await api.post(`/planningtask/create`, {
        projectId,
        title: newTask.title,
        description: newTask.description,
        source: 'USER'
      });
      const createdTask = res.data?.data || res.data;
      setTasks([...tasks, createdTask]);
      setIsAdding(false);
      setNewTask({ title: '', description: '' });
    } catch(err) {
      console.error("Failed to create new task", err);
    }
  };

  // The Grand Finale: Launch Project Roadmap
  const handleCreateRoadmap = async () => {
    if (tasks.length === 0) {
      alert("You need at least one task to generate a roadmap!");
      return;
    }
    setSavingReorder(true);
    
    try {
      // 1. Move Project Status to ACTIVE
      await api.put(`/project/${projectId}/update`, {
        status: "ACTIVE"
      });

      // 2. Convert Planning Tasks to Roadmap Tasks
      // We process sequentially or in parallel. Parallel is faster.
      await Promise.all(tasks.map((task, index) => {
         return api.post(`/roadmaptask/create`, {
            projectId: projectId,
            title: task.title,
            description: task.description || '',
            status: 'TODO',
            orderIndex: index
         });
      }));

      // NOTE: We could also DELETE the planningTasks but it's okay to leave them as a historical drafting trail.
      
      // 3. Navigate straight to the Roadmap!
      navigate(`/projects/${projectId}/roadmap`);
    } catch (err) {
      console.error("Failed to activate roadmap:", err);
      setSavingReorder(false);
    }
  };

  if (loading) {
    return <div className="planning-page container"><div className="loading-state">Loading AI Draft...</div></div>;
  }

  return (
    <div className="planning-page container animate-fade-in">
      <div className="planning-header">
        <div>
           <Link to="/projects" className="back-link">Back to Projects</Link>
           <h1 className="page-title gradient-text">Review AI Draft Plan</h1>
           <p className="page-subtitle">Refine the tasks that our AI created before converting them into an active roadmap.</p>
        </div>
        <button 
           className="btn-primary create-roadmap-btn" 
           onClick={handleCreateRoadmap}
           disabled={savingReorder || tasks.length === 0}
        >
          {savingReorder ? "Activating..." : <><CheckCircle2 size={20} /> Convert to Roadmap <ArrowRight size={20}/></>}
        </button>
      </div>

      <div className="tasks-container">
        {tasks.map((task, index) => (
          <div key={task.id} className="planning-item glass-panel">
            {editingId === task.id ? (
              <div className="edit-form">
                <input 
                  type="text" 
                  className="input-field" 
                  value={editForm.title} 
                  onChange={e => setEditForm({...editForm, title: e.target.value})}
                  autoFocus
                />
                <textarea 
                  className="input-field textarea-field" 
                  value={editForm.description}
                  onChange={e => setEditForm({...editForm, description: e.target.value})}
                  rows={3}
                />
                <div className="edit-actions">
                  <button className="btn-primary" onClick={() => saveEdit(task.id)}><Save size={16}/> Save</button>
                  <button className="btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="view-mode">
                <div className="task-header">
                  <h3><span className="task-number">{index + 1}.</span> {task.title}</h3>
                  <div className="action-icons">
                    <button className="icon-btn edit-btn" onClick={() => startEdit(task)}><Edit2 size={16} /></button>
                    <button className="icon-btn delete-btn" onClick={() => handleDelete(task.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
                <p className="task-desc">{task.description}</p>
                <div className="task-meta">
                  <span className="badge">Source: {task.source}</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {!isAdding ? (
           <button className="btn-secondary add-task-btn" onClick={() => setIsAdding(true)}>
             + Add Custom Task
           </button>
        ) : (
           <div className="planning-item glass-panel custom-add">
             <form onSubmit={handleCreateNewTask} className="edit-form">
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Task Title..."
                  value={newTask.title} 
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  autoFocus
                  required
                />
                <textarea 
                  className="input-field textarea-field" 
                  placeholder="Description..."
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  rows={3}
                />
                <div className="edit-actions">
                  <button type="submit" className="btn-primary">Add Task</button>
                  <button type="button" className="btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
                </div>
             </form>
           </div>
        )}
      </div>

    </div>
  );
};

export default Planning;
