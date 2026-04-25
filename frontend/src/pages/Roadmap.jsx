import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Network, CheckCircle2, Circle, ArrowLeft, Trash2, Upload,
  FileText, Sparkles, MessageSquare, BookOpen, Settings,
  Share2, PanelLeftClose, PanelRightClose, Search, Plus,
} from 'lucide-react';
import { api } from '../api';
import './Roadmap.css';
import GanttChartModal from '../components/GanttChartModal';

/* ── Layout constants ─────────────────────────────── */
const CARD_W   = 220;
const CARD_H   = 160;
const COL_GAP  = 110;
const ROW_GAP  = 20;
const PADDING  = 48;

/* ── Topological layer assignment (Kahn's BFS) ──────── */
function computeLayers(tasks) {
  const inDeg = {}, children = {};
  tasks.forEach(t => { inDeg[t.id] = 0; children[t.id] = []; });
  tasks.forEach(t =>
    (t.dependencies || []).forEach(dep => {
      inDeg[t.id] = (inDeg[t.id] || 0) + 1;
      (children[dep.dependsOnTaskId] = children[dep.dependsOnTaskId] || []).push(t.id);
    })
  );
  const layer = {};
  const queue = tasks.filter(t => !inDeg[t.id]).map(t => t.id);
  queue.forEach(id => { layer[id] = 0; });
  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    (children[id] || []).forEach(cid => {
      layer[cid] = Math.max(layer[cid] || 0, (layer[id] || 0) + 1);
      if (--inDeg[cid] === 0) queue.push(cid);
    });
  }
  tasks.forEach(t => { if (layer[t.id] === undefined) layer[t.id] = 0; });
  return layer;
}

function computeInitialPositions(tasks) {
  const layers = computeLayers(tasks);
  const cols = {};
  tasks.forEach(t => {
    const c = layers[t.id] || 0;
    (cols[c] = cols[c] || []).push(t);
  });
  const positions = {};
  Object.entries(cols).forEach(([c, col]) => {
    const x = PADDING + Number(c) * (CARD_W + COL_GAP);
    col.forEach((t, i) => { positions[t.id] = { x, y: PADDING + i * (CARD_H + ROW_GAP) }; });
  });
  return positions;
}

/* ── Cycle detection: would adding fromId→targetId create a cycle? ── */
function hasCycle(tasks, targetId, dependsOnId) {
  // Check if dependsOnId can already reach targetId (which would form a cycle)
  const depMap = {};
  tasks.forEach(t => { depMap[t.id] = (t.dependencies || []).map(d => d.dependsOnTaskId); });
  const visited = new Set(), queue = [dependsOnId];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === targetId) return true;
    if (visited.has(cur)) continue;
    visited.add(cur);
    (depMap[cur] || []).forEach(d => queue.push(d));
  }
  return false;
}

/* ── Main Component ─────────────────────────────────── */
const Roadmap = () => {
  const { projectId } = useParams();
  const [project, setProject]         = useState(null);
  const [tasks, setTasks]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [isAdding, setIsAdding]       = useState(false);
  const [newTask, setNewTask]         = useState({ title: '', description: '', durationDays: 1 });
  const [leftOpen, setLeftOpen]       = useState(true);
  const [rightOpen, setRightOpen]     = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [suggestedTasks, setSuggestedTasks] = useState([]);
  const [isResearching, setIsResearching]   = useState(false);
  const [isGenerating, setIsGenerating]     = useState(false);
  const [showGantt, setShowGantt]           = useState(false);

  // ── Interactive canvas state ─────────────────────────
  const [positions, setPositions]     = useState({});     // { [taskId]: { x, y } }
  const [dragState, setDragState]     = useState(null);   // { id, offsetX, offsetY }
  const [connectState, setConnectState] = useState(null); // { fromId, mouseX, mouseY }
  const [hoveredEdge, setHoveredEdge] = useState(null);   // dependencyId
  const canvasRef = useRef(null);

  // Refs to avoid stale closures in global handlers
  const dragRef        = useRef(null);
  const connectRef     = useRef(null);
  const addDepRef      = useRef(null);

  useEffect(() => { dragRef.current    = dragState;    }, [dragState]);
  useEffect(() => { connectRef.current = connectState; }, [connectState]);

  /* ── Data fetch ────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const projRes  = await api.get(`/project/${projectId}`);
        setProject(projRes.data?.data || projRes.data);
        const tasksRes = await api.get(`/roadmaptask/${projectId}`);
        const loaded   = Array.isArray(tasksRes.data?.data) ? tasksRes.data.data : [];
        setTasks(loaded);

        try {
          const ptRes  = await api.get(`/planningtask/${projectId}`);
          const stored = ptRes.data?.data || ptRes.data;
          if (Array.isArray(stored)) {
            const ai = stored.filter(st => st.source === 'AI');
            setSuggestedTasks(ai.map(st => ({ id: st.id, name: st.title, description: st.description })));
          }
        } catch {}
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, [projectId]);

  /* ── Initialize/update positions when tasks change ─── */
  useEffect(() => {
    if (!tasks.length) return;
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem(`dag-pos-${projectId}`)) || {}; } catch { return {}; }
    })();
    const computed = computeInitialPositions(tasks);
    setPositions(prev => {
      const next = { ...prev };
      tasks.forEach(t => { if (!next[t.id]) next[t.id] = stored[t.id] || computed[t.id]; });
      return next;
    });
  }, [tasks, projectId]);

  /* ── Persist positions ─────────────────────────────── */
  useEffect(() => {
    if (!Object.keys(positions).length) return;
    localStorage.setItem(`dag-pos-${projectId}`, JSON.stringify(positions));
  }, [positions, projectId]);

  /* ── Global mouse handlers (set up once) ────────────── */
  useEffect(() => {
    const onMove = (e) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const drag = dragRef.current;
      if (drag) {
        setPositions(prev => ({
          ...prev,
          [drag.id]: { x: Math.max(0, e.clientX - rect.left - drag.offsetX), y: Math.max(0, e.clientY - rect.top - drag.offsetY) },
        }));
      }
      const conn = connectRef.current;
      if (conn) {
        setConnectState(prev => prev ? { ...prev, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top } : null);
      }
    };
    const onUp = (e) => {
      const conn = connectRef.current;
      if (conn) {
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        const knob     = elements.find(el => el.dataset?.knobIn);
        const targetId = knob?.dataset?.knobIn;
        if (targetId && targetId !== conn.fromId) {
          addDepRef.current?.(conn.fromId, targetId);
        }
        setConnectState(null);
        connectRef.current = null;
      }
      setDragState(null);
      dragRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  /* ── API helpers ────────────────────────────────────── */
  const handleAddDependency = useCallback(async (fromId, targetId) => {
    if (hasCycle(tasks, targetId, fromId)) return;
    const target = tasks.find(t => t.id === targetId);
    if (target?.dependencies?.some(d => d.dependsOnTaskId === fromId)) return;
    try {
      const res = await api.post(`/roadmaptask/${targetId}/dependency`, { dependsOnTaskId: fromId });
      const dep = res.data?.data;
      if (dep) setTasks(prev => prev.map(t => t.id === targetId ? { ...t, dependencies: [...(t.dependencies || []), dep] } : t));
    } catch (err) { console.error('Failed to add dependency', err); }
  }, [tasks]);

  // Keep ref up-to-date so global onUp can call it without stale closure
  addDepRef.current = handleAddDependency;

  const handleRemoveDependency = async (depId, taskId) => {
    try {
      await api.delete(`/roadmaptask/dependency/${depId}`);
      setTasks(prev => prev.map(t => t.id === taskId
        ? { ...t, dependencies: (t.dependencies || []).filter(d => d.id !== depId) }
        : t
      ));
      if (hoveredEdge === depId) setHoveredEdge(null);
    } catch (err) { console.error('Failed to remove dependency', err); }
  };

  const handleDelete = async (taskId) => {
    try {
      await api.delete(`/roadmaptask/${taskId}/delete`);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setPositions(prev => { const n = { ...prev }; delete n[taskId]; return n; });
    } catch (err) { console.error('Failed to delete task', err); }
  };

  const handleCreateNewTask = async (e) => {
    e.preventDefault();
    if (!newTask.title) return;
    try {
      const res = await api.post('/roadmaptask/create', {
        projectId, title: newTask.title, description: newTask.description, status: 'TODO',
        orderIndex: tasks.length, durationDays: newTask.durationDays || 1
      });
      const created = res.data?.data || res.data;
      setTasks(prev => [...prev, { ...created, dependencies: [], dependedOnBy: [] }]);
      // Place new card to the right of existing cards or at origin
      const maxX = Object.values(positions).reduce((m, p) => Math.max(m, p?.x || 0), 0);
      setPositions(prev => ({ ...prev, [created.id]: { x: maxX + CARD_W + COL_GAP, y: PADDING } }));
      setIsAdding(false);
      setNewTask({ title: '', description: '', durationDays: 1 });
    } catch (err) { console.error('Failed to create task', err); }
  };

  const toggleTaskCompletion = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'DONE' ? 'TODO' : 'DONE';
      await api.put(`/roadmaptask/${taskId}/update`, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err) { console.error('Failed to update task', err); }
  };

  /* ── Card drag start ──────────────────────────────── */
  const handleCardMouseDown = (e, taskId) => {
    if (e.target.closest('button') || e.target.dataset?.knob) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pos = positions[taskId] || { x: 0, y: 0 };
    setDragState({ id: taskId, offsetX: e.clientX - rect.left - pos.x, offsetY: e.clientY - rect.top - pos.y });
    e.preventDefault();
  };

  /* ── Knob drag start (start connection) ───────────── */
  const handleKnobMouseDown = (e, taskId) => {
    e.stopPropagation();
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setConnectState({ fromId: taskId, mouseX: e.clientX - rect.left, mouseY: e.clientY - rect.top });
  };

  /* ── Computed values ─────────────────────────────── */
  const completedCount = tasks.filter(t => t.status === 'DONE').length;
  const progress       = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const posVals        = Object.values(positions);
  const canvasW = posVals.length ? Math.max(900, ...posVals.map(p => (p?.x || 0) + CARD_W + PADDING * 2)) : 900;
  const canvasH = posVals.length ? Math.max(500, ...posVals.map(p => (p?.y || 0) + CARD_H + PADDING * 2)) : 500;

  /* ── Calendar export ─────────────────────────────── */
  const handleExportToCalendar = async () => {
    if (!tasks.length) return;
    setIsExporting(true); setExportStatus(null);
    try {
      const statusRes = await api.get('/calendar/status');
      if (!statusRes.data.isAuthed) {
        window.location.href = `http://localhost:3000/calendar/auth?returnTo=${encodeURIComponent(window.location.href)}`;
        return;
      }
      const res = await api.post('/calendar/export', { tasks: tasks.map(t => ({ title: t.title, description: t.description, dueDate: t.dueDate, durationDays: t.durationDays ?? 1 })) });
      setExportStatus(res.data.success ? 'success' : 'error');
      if (res.data.links?.[0]) window.open(res.data.links[0], '_blank');
    } catch { setExportStatus('error'); }
    finally { setIsExporting(false); setTimeout(() => setExportStatus(null), 4000); }
  };

  const handleResearchOnline = async () => {
    if (!project) return;
    setIsResearching(true);
    try {
      const res = await api.post('/ai/research-online', { projectDescription: project.description || project.title });
      const raw = res.data?.data?.suggestedTasks || [];
      if (raw.length) {
        const saved = await Promise.all(raw.map(t => api.post('/planningtask/create', { projectId, title: t.name || 'Suggested Task', description: t.description || '', source: 'AI' })));
        setSuggestedTasks(prev => [...prev, ...saved.map(r => { const t = r.data?.data || r.data; return { id: t.id, name: t.title, description: t.description }; })]);
      }
    } catch (err) { console.error(err); }
    finally { setIsResearching(false); }
  };

  const handleGenerateRoadmap = async () => {
    if (!project) return;
    setIsGenerating(true);
    try {
      const res = await api.post('/ai/generate-roadmap', { projectId, projectDescription: project.description || project.title, suggestedTasks });
      const saved = res.data?.data?.tasks || [];
      setTasks(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        return [...prev, ...saved.filter(t => !existingIds.has(t.id))];
      });
    } catch (err) { console.error(err); }
    finally { setIsGenerating(false); }
  };

  /* ── SVG edge rendering ──────────────────────────── */
  const renderEdges = () => {
    const edges = [];
    tasks.forEach(task => {
      (task.dependencies || []).forEach(dep => {
        const from = positions[dep.dependsOnTaskId];
        const to   = positions[task.id];
        if (!from || !to) return;
        const x1 = from.x + CARD_W, y1 = from.y + CARD_H / 2;
        const x2 = to.x,            y2 = to.y + CARD_H / 2;
        const mx = (x1 + x2) / 2;
        const d  = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
        const isHov = hoveredEdge === dep.id;
        const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
        edges.push(
          <g
            key={dep.id}
            style={{ pointerEvents: 'all', cursor: 'pointer' }}
            onMouseEnter={() => setHoveredEdge(dep.id)}
            onMouseLeave={() => setHoveredEdge(null)}
            onClick={(e) => { e.stopPropagation(); handleRemoveDependency(dep.id, task.id); }}
          >
            <path d={d} fill="none" stroke="transparent" strokeWidth={14} />
            <path d={d} className={`dag-edge ${isHov ? 'dag-edge-hov' : ''}`} markerEnd="url(#arrow)" />
            {isHov && (
              <>
                <circle cx={midX} cy={midY} r={9} className="dag-edge-del-bg" />
                <text x={midX} y={midY} textAnchor="middle" dominantBaseline="middle" className="dag-edge-del-x">×</text>
              </>
            )}
          </g>
        );
      });
    });
    // Ghost edge while connecting
    if (connectState) {
      const from = positions[connectState.fromId];
      if (from) {
        const x1 = from.x + CARD_W, y1 = from.y + CARD_H / 2;
        const x2 = connectState.mouseX, y2 = connectState.mouseY;
        const mx = (x1 + x2) / 2;
        edges.push(
          <path key="ghost" d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
            className="dag-ghost-edge" style={{ pointerEvents: 'none' }} />
        );
      }
    }
    return edges;
  };

  /* ── Render ─────────────────────────────────────── */
  return (
    <div className="roadmap-workspace animate-fade-in">

      {/* LEFT PANEL */}
      <aside className={`rm-panel rm-panel-left glass-panel ${leftOpen ? 'open' : 'collapsed'}`}>
        <div className="rm-panel-header">
          <div className="rm-panel-title"><FileText size={16} /><span>Sources</span></div>
          <button className="rm-panel-toggle" onClick={() => setLeftOpen(!leftOpen)}><PanelLeftClose size={16} /></button>
        </div>
        {leftOpen && (
          <div className="rm-panel-body">
            <div className="rm-sources-empty">
              <div className="rm-sources-icon-wrap"><Upload size={28} /></div>
              <p className="rm-sources-label">No sources yet</p>
              <p className="rm-sources-sub">Upload documents, PDFs, or links to enrich your roadmap context.</p>
              <button className="btn-secondary rm-upload-btn" disabled><Upload size={14} />Add source</button>
            </div>
          </div>
        )}
      </aside>

      {/* CENTRE */}
      <main className="rm-centre">
        <div className="rm-centre-header">
          <Link to="/projects" className="back-link"><ArrowLeft size={16} /> Projects</Link>
          <div className="rm-centre-title-block">
            <h1 className="rm-project-title">{project ? project.title : 'Loading…'}</h1>
            {project?.description && <p className="rm-project-desc">{project.description}</p>}
          </div>
          {tasks.length > 0 && (
            <div className="rm-progress-row">
              <div className="rm-progress-bar-track"><div className="rm-progress-bar-fill" style={{ width: `${progress}%` }} /></div>
              <span className="rm-progress-label">{completedCount} / {tasks.length} done</span>
            </div>
          )}
        </div>

        {/* DAG canvas */}
        <div className="rm-dag-scroll">
          {loading ? (
            <div className="loading-state">Loading Roadmap…</div>
          ) : tasks.length === 0 && !isAdding ? (
            <div className="empty-state glass-panel">
              <Network size={48} className="empty-icon text-secondary" />
              <h3>No tasks yet</h3>
              <p>Generate a roadmap or add tasks manually.</p>
              <button className="btn-primary" style={{ marginTop: '1.5rem' }} onClick={handleGenerateRoadmap} disabled={isGenerating}>
                {isGenerating ? <><Sparkles size={16} /> Generating...</> : <><Sparkles size={16} /> Generate Roadmap</>}
              </button>
            </div>
          ) : (
            <>
              <div className="dag-hint">Drag cards to reposition · Drag <span className="dag-hint-knob" /> from right knob to left knob to connect · Hover an edge and click × to remove</div>
              <div className="dag-outer">
                <div
                  ref={canvasRef}
                  className={`dag-canvas-wrap${connectState ? ' is-connecting' : ''}${dragState ? ' is-dragging' : ''}`}
                  style={{ width: canvasW, height: canvasH }}
                >
                  {/* SVG edge layer */}
                  <svg width={canvasW} height={canvasH} className="dag-svg">
                    <defs>
                      <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                        <path d="M0,0 L0,6 L8,3 z" className="dag-arrowhead" />
                      </marker>
                    </defs>
                    {renderEdges()}
                  </svg>

                  {/* Task cards */}
                  {tasks.map(task => {
                    const pos = positions[task.id];
                    if (!pos) return null;
                    const done = task.status === 'DONE';
                    return (
                      <div
                        key={task.id}
                        className={`dag-node glass-panel${done ? ' completed' : ''}${dragState?.id === task.id ? ' dragging' : ''}`}
                        style={{ left: pos.x, top: pos.y, width: CARD_W, height: CARD_H }}
                        onMouseDown={(e) => handleCardMouseDown(e, task.id)}
                      >
                        {/* Input knob (left) */}
                        <div
                          className="dag-knob dag-knob-in"
                          data-knob="in"
                          data-knob-in={task.id}
                          title="Drop connection here"
                        />
                        {/* Output knob (right) */}
                        <div
                          className="dag-knob dag-knob-out"
                          data-knob="out"
                          title="Drag to connect"
                          onMouseDown={(e) => handleKnobMouseDown(e, task.id)}
                        />

                        <div className="dag-node-header">
                          <button className="task-status-btn" onClick={() => toggleTaskCompletion(task.id, task.status)}>
                            {done ? <CheckCircle2 color="#6366f1" size={18} /> : <Circle className="text-secondary" size={18} />}
                          </button>
                          <button className="icon-btn delete-btn" onClick={() => handleDelete(task.id)} title="Delete task">
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="dag-node-body">
                          <p className="dag-node-title">{task.title || 'Untitled'}</p>
                          <p className="dag-node-desc">{task.description}</p>
                        </div>
                        <div style={{ padding: '0 10px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                           <label htmlFor={`dur-${task.id}`}>Duration: </label>
                           <input 
                             id={`dur-${task.id}`}
                             type="number"
                             min={1}
                             value={task.durationDays || 1}
                             onMouseDown={(e) => e.stopPropagation()}
                             onChange={(e) => {
                               const v = parseInt(e.target.value) || 1;
                               setTasks(prev => prev.map(t => t.id === task.id ? { ...t, durationDays: v } : t));
                               api.put(`/roadmaptask/${task.id}/update`, { durationDays: v }).catch(console.error);
                             }}
                             style={{
                               width: '35px',
                               marginLeft: '4px',
                               background: 'rgba(255, 255, 255, 0.1)',
                               border: '1px solid rgba(255, 255, 255, 0.2)',
                               color: 'white',
                               borderRadius: '4px',
                               padding: '2px 4px',
                               fontSize: '0.75rem',
                               outline: 'none'
                             }}
                           /> days
                        </div>
                        {(task.dependencies || []).length > 0 && (
                          <div className="dag-node-deps">
                            {task.dependencies.length} prerequisite{task.dependencies.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add task */}
              <div className="rm-add-task-area">
                {!isAdding ? (
                  <button className="btn-secondary rm-add-task-btn" onClick={() => setIsAdding(true)}>
                    <Plus size={14} /> Add Task
                  </button>
                ) : (
                  <div className="glass-panel rm-add-task-form">
                    <form onSubmit={handleCreateNewTask}>
                      <input type="text" className="input-field" placeholder="Task title…" value={newTask.title}
                        onChange={e => setNewTask({ ...newTask, title: e.target.value })} autoFocus required />
                      <textarea className="input-field textarea-field" placeholder="Description…" value={newTask.description}
                        onChange={e => setNewTask({ ...newTask, description: e.target.value })} rows={2} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <label>Duration (days):</label>
                        <input
                          type="number"
                          className="input-field"
                          min="1"
                          value={newTask.durationDays || 1}
                          onChange={e => setNewTask({ ...newTask, durationDays: parseInt(e.target.value) || 1 })}
                          style={{ width: '60px', padding: '4px', fontSize: '0.8rem' }}
                        />
                      </div>
                      <div className="rm-form-actions">
                        <button type="submit" className="btn-primary">Save Task</button>
                        <button type="button" className="btn-secondary" onClick={() => setIsAdding(false)}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* RIGHT PANEL */}
      <aside className={`rm-panel rm-panel-right glass-panel ${rightOpen ? 'open' : 'collapsed'}`}>
        <div className="rm-panel-header">
          <button className="rm-panel-toggle" onClick={() => setRightOpen(!rightOpen)}><PanelRightClose size={16} /></button>
          <div className="rm-panel-title"><Sparkles size={16} /><span>Tools</span></div>
        </div>
        {rightOpen && (
          <div className="rm-panel-body rm-tools-body">
            <p className="rm-tools-hint">Actions for this roadmap</p>
            <div className="rm-tools-group">
              <button className="rm-tool-btn" onClick={handleResearchOnline} disabled={isResearching || !project}>
                <Search size={16} /><span>{isResearching ? 'Researching...' : 'Research Online'}</span>
              </button>
              <button className="rm-tool-btn" onClick={handleGenerateRoadmap} disabled={isGenerating || !project}>
                <Sparkles size={16} /><span>{isGenerating ? 'Generating...' : 'Generate Roadmap'}</span>
              </button>
              <button className="rm-tool-btn" disabled><MessageSquare size={16} /><span>AI Chat</span></button>
              <button className="rm-tool-btn" onClick={() => setShowGantt(true)} disabled={!tasks.length}><BookOpen size={16} /><span>Gantt Chart</span></button>
              <button className={`rm-tool-btn ${exportStatus === 'success' ? 'rm-tool-success' : exportStatus === 'error' ? 'rm-tool-error' : ''}`}
                onClick={handleExportToCalendar} disabled={isExporting || !tasks.length}>
                <Upload size={16} />
                <span>{isExporting ? 'Exporting…' : exportStatus === 'success' ? '✓ Exported!' : exportStatus === 'error' ? '✗ Failed — retry' : 'Export to Google Calendar'}</span>
              </button>
              <button className="rm-tool-btn" disabled><Share2 size={16} /><span>Share</span></button>
              <button className="rm-tool-btn" disabled><Settings size={16} /><span>Settings</span></button>
            </div>
            {suggestedTasks.length > 0 && (
              <div className="rm-tools-hint" style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Suggested Tasks</h4>
                <ul style={{ paddingLeft: '1.25rem', fontSize: '0.85rem' }}>
                  {suggestedTasks.map((t, i) => <li key={i} title={t.description} style={{ marginBottom: '0.4rem' }}>{t.name}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </aside>

      {showGantt && (
        <GanttChartModal projectId={projectId} onClose={() => setShowGantt(false)} />
      )}
    </div>
  );
};

export default Roadmap;
