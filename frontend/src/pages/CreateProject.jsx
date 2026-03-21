import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { api, aiApi } from '../api';
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

      // 2. Fire and forget AI generation if needed, or await it
      if (projectId) {
         setAiGenerating(true);
         try {
           const aiRes = await aiApi.post('/generate-planning', {
             projectDescription: formData.description
           });
           
           // Based on the planning result, we would ideally parse and create roadmap tasks here.
           // For now, we simulate success and move to the project page.
           console.log("AI Generation complete:", aiRes.data);
         } catch (aiErr) {
           console.error("AI Generation non-fatal error", aiErr);
         }
         
         setAiGenerating(false);
      }

      navigate('/projects');
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
              <><Sparkles size={18} className="spin-anim" /> Generating AI Roadmap...</>
            ) : loading ? (
              'Saving...'
            ) : (
               <><Sparkles size={18} /> Create & Generate Plan</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateProject;
