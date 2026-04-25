import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { X, Calendar as CalendarIcon, Clock } from 'lucide-react';
import './GanttChartModal.css';

const GanttChartModal = ({ projectId, onClose }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGantt = async () => {
      try {
        const res = await api.get(`/roadmaptask/${projectId}/gantt`);
        setTasks(res.data?.data || []);
      } catch (err) {
        console.error("Failed to load Gantt data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGantt();
  }, [projectId]);

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content glass-panel" style={{ minWidth: '600px', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>Loading Gantt Chart...</p>
        </div>
      </div>
    );
  }

  const maxDay = tasks.length > 0 ? Math.max(...tasks.map(t => t.endDay)) : 0;
  const numDays = Math.max(maxDay, 30); // minimum 30 days scale to look nice

  return (
    <div className="modal-overlay gantt-overlay" onClick={onClose}>
      <div className="modal-content glass-panel gantt-modal" onClick={e => e.stopPropagation()}>
        <div className="gantt-header">
          <h3><CalendarIcon size={20} /> Project Timeline</h3>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        {tasks.length === 0 ? (
          <div className="empty-gantt">
            <Clock size={40} className="text-secondary" />
            <p>No tasks to plot</p>
          </div>
        ) : (
          <div className="gantt-scroll-container">
            <div className="gantt-chart">
              {/* Day headers */}
              <div className="gantt-row gantt-labels-header">
                <div className="gantt-task-name-col">Task</div>
                <div className="gantt-timeline-header">
                   {[...Array(numDays)].map((_, i) => (
                     <div key={i} className="gantt-day-header">Day {i + 1}</div>
                   ))}
                </div>
              </div>
              
              {/* Task rows */}
              {tasks.map(task => (
                <div key={task.id} className="gantt-row">
                  <div className="gantt-task-name-col" title={task.title}>
                    <span className={`status-dot ${task.status.toLowerCase()}`}></span>
                    {task.title}
                    <span className="gantt-duration">{task.durationDays || 1}d</span>
                  </div>
                  <div className="gantt-timeline-col">
                    {[...Array(numDays)].map((_, i) => {
                      const isTaskDay = i >= task.startDay && i < task.endDay;
                      const isStart = i === task.startDay;
                      const isEnd = i === task.endDay - 1;
                      return (
                        <div key={i} className="gantt-cell">
                          {isTaskDay && (
                            <div className={`gantt-bar ${isStart ? 'start' : ''} ${isEnd ? 'end' : ''} ${task.status.toLowerCase()}`}></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GanttChartModal;
