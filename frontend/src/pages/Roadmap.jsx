import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Network,
  CheckCircle2,
  Circle,
  ArrowLeft,
  ArrowDown,
  GripVertical,
  Trash2,
  Upload,
  FileText,
  Sparkles,
  MessageSquare,
  BookOpen,
  Settings,
  Share2,
  PanelLeftClose,
  PanelRightClose,
  Search,
} from 'lucide-react';
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
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null); // null | 'success' | 'error'
  const [suggestedTasks, setSuggestedTasks] = useState([]);
  const [isResearching, setIsResearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  useEffect(() => {
    const fetchProjectAndTasks = async () => {
      try {
        setLoading(true);
        const projRes = await api.get(`/project/${projectId}`);
        setProject(projRes.data?.data || projRes.data);

        const tasksRes = await api.get(`/roadmaptask/${projectId}`);
        if (Array.isArray(tasksRes.data?.data)) {
          setTasks(tasksRes.data.data);
        } else if (Array.isArray(tasksRes.data)) {
          setTasks(tasksRes.data);
          setTasks([]);
        }

        // Fetch persisted suggested tasks (PlanningTasks)
        try {
          const ptRes = await api.get(`/planningtask/${projectId}`);
          const stored = ptRes.data?.data || ptRes.data;
          if (Array.isArray(stored)) {
            // Filter strictly for 'AI' source
            const suggested = stored.filter(st => st.source === 'AI');
            setSuggestedTasks(suggested.map(st => ({
              id: st.id,
              name: st.title,
              description: st.description
            })));
          }
        } catch (e) {
          console.warn("Could not fetch planning tasks", e);
        }
      } catch (err) {
        console.error('Failed to fetch roadmap data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProjectAndTasks();
  }, [projectId]);

  /* ── Drag-to-reorder ── */
  const handleDragStart = (e, index) => { dragItem.current = index; };
  const handleDragEnter = (e, index) => { dragOverItem.current = index; };
  const handleDrop = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }
    const _tasks = [...tasks];
    const dragged = _tasks.splice(dragItem.current, 1)[0];
    _tasks.splice(dragOverItem.current, 0, dragged);
    dragItem.current = null;
    dragOverItem.current = null;
    setTasks(_tasks);
    setIsSavingOrder(true);
    try {
      await Promise.all(
        _tasks.map((t, idx) => {
          if (t.orderIndex !== idx) {
            t.orderIndex = idx;
            return api.put(`/roadmaptask/${t.id}/update`, { orderIndex: idx });
          }
          return Promise.resolve();
        })
      );
    } catch (err) {
      console.error('Failed to reorder tasks in DB:', err);
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await api.delete(`/roadmaptask/${taskId}/delete`);
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task', err);
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
        orderIndex: tasks.length,
      });
      const createdTask = res.data?.data || res.data;
      setTasks([...tasks, createdTask]);
      setIsAdding(false);
      setNewTask({ title: '', description: '' });
    } catch (err) {
      console.error('Failed to create new task', err);
    }
  };

  const toggleTaskCompletion = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
      await api.put(`/roadmaptask/${taskId}/update`, { status: newStatus });
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    } catch (err) {
      console.error('Failed to update task', err);
    }
  };

  const completedCount = tasks.filter((t) => t.status === 'DONE').length;
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  const handleExportToCalendar = async () => {
    if (tasks.length === 0) return;
    setIsExporting(true);
    setExportStatus(null);
    try {
      // Check if already authed
      const statusRes = await api.get('/calendar/status');
      if (!statusRes.data.isAuthed) {
        // Redirect browser to backend auth endpoint; include current page as returnTo
        const returnTo = encodeURIComponent(window.location.href);
        window.location.href = `http://localhost:3000/calendar/auth?returnTo=${returnTo}`;
        return; // browser will navigate away
      }

      // Already authed — bulk export
      const payload = tasks.map((t) => ({
        title: t.title,
        description: t.description,
        dueDate: t.dueDate,
        durationDays: t.durationDays ?? 1,
      }));

      const res = await api.post('/calendar/export', { tasks: payload });
      if (res.data.success) {
        setExportStatus('success');
        // Open first event link in a new tab
        if (res.data.links?.[0]) window.open(res.data.links[0], '_blank');
      } else {
        setExportStatus('error');
      }
    } catch (err) {
      console.error('Export failed:', err);
      setExportStatus('error');
    } finally {
      setIsExporting(false);
      // Auto-clear status badge after 4 seconds
      setTimeout(() => setExportStatus(null), 4000);
    }
  };

  const handleResearchOnline = async () => {
    if (!project) return;
    setIsResearching(true);
    try {
      const res = await api.post('/ai/research-online', {
        projectDescription: project.description || project.title
      });
      const newTasksRaw = res.data?.data?.suggestedTasks || [];
      if (newTasksRaw.length > 0) {
        // Persist to PlanningTask table
        const savedPromises = newTasksRaw.map(task => 
          api.post('/planningtask/create', {
            projectId,
            title: task.name || 'Suggested Task',
            description: task.description || '',
            source: 'AI'
          })
        );
        const savedResults = await Promise.all(savedPromises);
        
        const newPersisted = savedResults.map(r => {
          const t = r.data?.data || r.data;
          return { id: t.id, name: t.title, description: t.description };
        });
        
        setSuggestedTasks(prev => [...prev, ...newPersisted]);
      }
    } catch (err) {
      console.error('Failed to research online and persist', err);
    } finally {
      setIsResearching(false);
    }
  };

  const handleGenerateRoadmap = async () => {
    if (!project) return;
    setIsGenerating(true);
    try {
      const res = await api.post('/ai/generate-roadmap', {
        projectDescription: project.description || project.title,
        suggestedTasks: suggestedTasks
      });
      const generatedTasks = res.data?.data?.tasks || [];
      
      const savedTasks = await Promise.all(
        generatedTasks.map((task, i) =>
          api.post('/roadmaptask/create', {
            projectId,
            title: task.title || 'Untitled Task',
            description: task.description || '',
            status: 'TODO',
            orderIndex: tasks.length + i
          })
        )
      );
      
      const newTasks = savedTasks.map(r => r.data?.data || r.data);
      setTasks([...tasks, ...newTasks]);
    } catch (err) {
      console.error('Failed to generate roadmap', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="roadmap-workspace animate-fade-in">

      {/* ── LEFT PANEL ── */}
      <aside className={`rm-panel rm-panel-left glass-panel ${leftOpen ? 'open' : 'collapsed'}`}>
        <div className="rm-panel-header">
          <div className="rm-panel-title">
            <FileText size={16} />
            <span>Sources</span>
          </div>
          <button className="rm-panel-toggle" onClick={() => setLeftOpen(!leftOpen)} title="Toggle sources panel">
            <PanelLeftClose size={16} />
          </button>
        </div>

        {leftOpen && (
          <div className="rm-panel-body">
            <div className="rm-sources-empty">
              <div className="rm-sources-icon-wrap">
                <Upload size={28} />
              </div>
              <p className="rm-sources-label">No sources yet</p>
              <p className="rm-sources-sub">Upload documents, PDFs, or links to enrich your roadmap context.</p>
              <button className="btn-secondary rm-upload-btn" disabled>
                <Upload size={14} />
                Add source
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ── CENTRE PANEL ── */}
      <main className="rm-centre">
        {/* Sticky header inside centre */}
        <div className="rm-centre-header">
          <Link to="/projects" className="back-link">
            <ArrowLeft size={16} /> Projects
          </Link>

          <div className="rm-centre-title-block">
            <h1 className="rm-project-title">
              {project ? project.title : 'Loading…'}
            </h1>
            {project?.description && (
              <p className="rm-project-desc">{project.description}</p>
            )}
          </div>

          {/* Progress bar */}
          {tasks.length > 0 && (
            <div className="rm-progress-row">
              <div className="rm-progress-bar-track">
                <div className="rm-progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="rm-progress-label">
                {completedCount} / {tasks.length} done
                {isSavingOrder && <span className="rm-saving-badge">Saving…</span>}
              </span>
            </div>
          )}
        </div>

        {/* Scrollable timeline */}
        <div className="rm-timeline-scroll">
          {loading ? (
            <div className="loading-state">Loading Roadmap…</div>
          ) : (
            <div className="roadmap-timeline">
              {tasks.length === 0 && !isAdding && (
                <div className="empty-state glass-panel">
                  <Network size={48} className="empty-icon text-secondary" />
                  <h3>No tasks yet</h3>
                  <p>Click below to use AI to generate your project roadmap.</p>
                  <button 
                    className="btn-primary" 
                    style={{ marginTop: '1.5rem' }}
                    onClick={handleGenerateRoadmap}
                    disabled={isGenerating}
                  >
                    {isGenerating ? <><Sparkles size={16} /> Generating...</> : <><Sparkles size={16} /> Generate Roadmap</>}
                  </button>
                </div>
              )}

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
                      <div className="drag-handle">
                        <GripVertical className="text-secondary" size={20} />
                      </div>
                      <div
                        className="task-status-btn"
                        onClick={() => toggleTaskCompletion(task.id, task.status)}
                      >
                        {isCompleted
                          ? <CheckCircle2 color="#6366f1" size={26} />
                          : <Circle className="text-secondary" size={26} />}
                      </div>
                      <div className="task-content">
                        <div className="task-content-header">
                          <h3 className="task-title">{task.title || 'Untitled Task'}</h3>
                          <button
                            className="icon-btn delete-btn"
                            onClick={() => handleDelete(task.id)}
                            title="Delete task"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <p className="task-desc">{task.description}</p>
                        {task.dependencies?.length > 0 && (
                          <div className="task-dependencies">
                            Requires: {task.dependencies.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>

                    {index < tasks.length - 1 && (
                      <div className="timeline-connector">
                        <ArrowDown size={20} className="text-secondary" />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Add task — always visible */}
              {!isAdding ? (
                <button
                  className="btn-secondary rm-add-task-btn"
                  onClick={() => setIsAdding(true)}
                >
                  + Add Task
                </button>
              ) : (
                <div className="glass-panel rm-add-task-form">
                  <form onSubmit={handleCreateNewTask}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Task title…"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      autoFocus
                      required
                    />
                    <textarea
                      className="input-field textarea-field"
                      placeholder="Description…"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                      rows={3}
                    />
                    <div className="rm-form-actions">
                      <button type="submit" className="btn-primary">Save Task</button>
                      <button type="button" className="btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── RIGHT PANEL ── */}
      <aside className={`rm-panel rm-panel-right glass-panel ${rightOpen ? 'open' : 'collapsed'}`}>
        <div className="rm-panel-header">
          <button className="rm-panel-toggle" onClick={() => setRightOpen(!rightOpen)} title="Toggle tools panel">
            <PanelRightClose size={16} />
          </button>
          <div className="rm-panel-title">
            <Sparkles size={16} />
            <span>Tools</span>
          </div>
        </div>

        {rightOpen && (
          <div className="rm-panel-body rm-tools-body">
            <p className="rm-tools-hint">Actions for this roadmap</p>

            <div className="rm-tools-group">
              <button
                className="rm-tool-btn"
                onClick={handleResearchOnline}
                disabled={isResearching || !project}
              >
                <Search size={16} />
                <span>{isResearching ? 'Researching...' : 'Research Online'}</span>
              </button>
              <button className="rm-tool-btn" disabled>
                <MessageSquare size={16} />
                <span>AI Chat</span>
              </button>
              <button className="rm-tool-btn" disabled>
                <BookOpen size={16} />
                <span>Gantt Chart</span>
              </button>
              <button
                className={`rm-tool-btn ${exportStatus === 'success' ? 'rm-tool-success' : exportStatus === 'error' ? 'rm-tool-error' : ''}`}
                onClick={handleExportToCalendar}
                disabled={isExporting || tasks.length === 0}
                title={tasks.length === 0 ? 'Add tasks first' : 'Export all tasks to Google Calendar'}
              >
                <Upload size={16} />
                <span>
                  {isExporting
                    ? 'Exporting…'
                    : exportStatus === 'success'
                    ? '✓ Exported!'
                    : exportStatus === 'error'
                    ? '✗ Failed — retry'
                    : 'Export to Google Calendar'}
                </span>
              </button>
              <button className="rm-tool-btn" disabled>
                <Share2 size={16} />
                <span>Share</span>
              </button>
              <button className="rm-tool-btn" disabled>
                <Settings size={16} />
                <span>Settings</span>
              </button>
            </div>

            {suggestedTasks.length > 0 && (
              <div className="rm-tools-hint" style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Suggested Tasks</h4>
                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                  {suggestedTasks.map((t, i) => (
                    <li key={i} title={t.description} style={{ marginBottom: '0.4rem' }}>{t.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
};

export default Roadmap;
