import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { api } from '../api';
import './CreateProject.css';

const CreateProject = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        navigate('/login');
        return;
      }

      // 1. Create the project in backend
      const projRes = await api.post('/project/create', {
        title: formData.name,
        description: formData.description,
        ownerId: userId
      });
      
      const projectId = projRes.data.data?.id || projRes.data.project?.id;

      // 2. Await AI Generation
      if (projectId) {
         setAiGenerating(true);
         try {
           // Call the backend proxy instead of calling FastAPI directly
           const aiRes = await api.post('/ai/generate-planning', {
             projectDescription: formData.description
           });
           
           // Flatten all solutions from detailed tasks into individual planning tasks
           const detailed = aiRes.data.data?.detailed || [];
           const generatedTasks = detailed.flatMap(task =>
             (task.solutions || []).map(sol => ({
               title: sol.name || task.title,
               description: sol.description || task.description
             }))
           );
           
           // Fallback to simple tasks if no solutions found
           const tasksToSave = generatedTasks.length > 0
             ? generatedTasks
             : (aiRes.data.data?.tasks || []);
           
           // Loop and push each task to db sequentially or parallel
           await Promise.all(tasksToSave.map(task => {
              return api.post('/planningtask/create', {
                projectId: projectId,
                title: task.title || 'Untitled Task',
                description: task.description || '',
                source: 'AI'
              });
           }));
           
         } catch (aiErr) {
           console.error("AI Generation non-fatal error", aiErr);
         }
         
         setAiGenerating(false);
      }

      // 3. Navigate to Planning Page
      navigate(`/projects/${projectId}/plan`);

    } catch (err) {
      console.error("Project creation failed", err);
      // Fallback
      setLoading(false);
      setAiGenerating(false);
    }
  };

  return (
    <div className="create-project-page container animate-fade-in">
      <div className="form-container glass-panel">
        <h1 className="page-title">
          Outline your next <span className="gradient-text">masterpiece</span>
        </h1>
        <p className="page-subtitle">Provide details, and our AI will draft a complete roadmap</p>

        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-group">
            <label>Project Name</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. NextGen E-Commerce" 
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Detailed Description</label>
            <textarea 
              className="input-field textarea-field" 
              placeholder="Describe your goals, tech stack, and target audience. Our AI uses this context to build your custom roadmap."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              required
              rows={6}
            />
          </div>

          <button type="submit" className="btn-primary form-submit" disabled={loading || aiGenerating}>
            {aiGenerating ? (
              <><Sparkles size={18} className="spin-anim" /> Designing Plan...</>
            ) : loading ? (
              'Saving Project...'
            ) : (
               <><Sparkles size={18} /> Create & Plan Project</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateProject;
