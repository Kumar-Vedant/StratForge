import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Network, CheckCircle2, Circle, ArrowLeft, ArrowDown, GripVertical, Trash2 } from 'lucide-react';
import { api } from '../api';
import './Roadmap.css';

const Roadmap = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '' });

  const dragItem = React.useRef(null);
  const dragOverItem = React.useRef(null);

  useEffect(() => {
    const fetchProjectAndTasks = async () => {
      try {
        setLoading(true);
        // Fetch project metadata
        const projRes = await api.get(`/project/${projectId}`);
        setProject(projRes.data?.data || projRes.data);
        
        // Fetch tasks
        const tasksRes = await api.get(`/roadmaptask/${projectId}`);
        if (Array.isArray(tasksRes.data?.data)) {
           // Sort tasks by theoretical order/dependency or just keep original order
           setTasks(tasksRes.data.data);
        } else if (Array.isArray(tasksRes.data)) {
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

  const handleDragStart = (e, index) => {
    dragItem.current = index;
  };

  const handleDragEnter = (e, index) => {
    dragOverItem.current = index;
  };

  const handleDrop = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) {
        dragItem.current = null;
        dragOverItem.current = null;
        return;
    }

    const _tasks = [...tasks];
    const draggedItemContent = _tasks.splice(dragItem.current, 1)[0];
    _tasks.splice(dragOverItem.current, 0, draggedItemContent);
    
    dragItem.current = null;
    dragOverItem.current = null;

    setTasks(_tasks);
    setIsSavingOrder(true);

    try {
      await Promise.all(_tasks.map((t, idx) => {
        if (t.orderIndex !== idx) {
           t.orderIndex = idx;
           return api.put(`/roadmaptask/${t.id}/update`, { orderIndex: idx });
        }
        return Promise.resolve();
      }));
    } catch (err) {
      console.error("Failed to reorder tasks in DB:", err);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await api.delete(`/roadmaptask/${taskId}/delete`);
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch(err) {
      console.error("Failed to delete task", err);
    }
  };

  const handleCreateNewTask = async (e) => {
    e.preventDefault();
    if (!newTask.title) return;
    try {
      const res = await api.post(`/roadmaptask/create`, {
        projectId,
        title: newTask.title,
        description: newTask.description,
        status: 'TODO',
        orderIndex: tasks.length
      });
      const createdTask = res.data?.data || res.data;
      setTasks([...tasks, createdTask]);
      setIsAdding(false);
      setNewTask({ title: '', description: '' });
    } catch(err) {
      console.error("Failed to create new task", err);
    }
  };

  const toggleTaskCompletion = async (taskId, currentStatus) => {
    try {
      // Toggle status between 'TODO' and 'DONE'
      const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
      await api.put(`/roadmaptask/${taskId}/update`, { status: newStatus });
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error("Failed to update task", err);
    }
  };

  return (
    <div className="roadmap-page container animate-fade-in">
      <div className="roadmap-header">
        <div className="roadmap-back-row">
          <Link to="/projects" className="back-link"><ArrowLeft size={18} /> Back to Projects</Link>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h1 className="project-title">
            {project ? project.title : 'Loading Project...'}
            {isSavingOrder && <span className="badge" style={{ marginLeft: '1rem', verticalAlign: 'middle' }}>Saving order...</span>}
          </h1>
          <p className="project-desc">{project ? project.description : ''}</p>
        </div>
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
            const isCompleted = task.status === 'DONE';
            return (
              <React.Fragment key={task.id}>
                <div 
                  className={`task-node glass-panel ${isCompleted ? 'completed' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragEnd={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div className="drag-handle" style={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}>
                    <GripVertical className="text-secondary" size={24} />
                  </div>
                  <div className="task-status-btn" onClick={() => toggleTaskCompletion(task.id, task.status)} style={{ cursor: 'pointer' }}>
                    {isCompleted ? <CheckCircle2 color="#6366f1" size={28} /> : <Circle className="text-secondary" size={28} />}
                  </div>
                  <div className="task-content" style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h3 className="task-title">{task.title || 'Untitled Task'}</h3>
                      <button className="icon-btn delete-btn" onClick={() => handleDelete(task.id)} title="Delete task">
                        <Trash2 size={16} />
                      </button>
                    </div>
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

          {!isAdding ? (
             <button className="btn-secondary" onClick={() => setIsAdding(true)} style={{ marginTop: '2rem', padding: '1.5rem', width: '100%', borderStyle: 'dashed' }}>
               + Add Task
             </button>
          ) : (
             <div className="glass-panel" style={{ marginTop: '2rem', padding: '1.5rem', width: '100%' }}>
               <form onSubmit={handleCreateNewTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button type="submit" className="btn-primary">Save Task</button>
                    <button type="button" className="btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
                  </div>
               </form>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Roadmap;
