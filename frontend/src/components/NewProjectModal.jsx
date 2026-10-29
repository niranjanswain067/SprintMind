import React, { useState } from 'react';
import { X, FolderPlus, AlertCircle } from 'lucide-react';
import { createProject } from '../api/projects';
import { useAuth } from '../context/AuthContext';

export default function NewProjectModal({ isOpen, onClose, onProjectCreated }) {
  const { activeWorkspace, fetchProjects, setActiveProject } = useAuth();

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [methodology, setMethodology] = useState('scrum');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleNameChange = (val) => {
    setName(val);
    // Auto-generate key acronym if key hasn't been manually typed
    if (!key || key.length <= 4) {
      const words = val.trim().split(/\s+/).filter(Boolean);
      let suggested = '';
      if (words.length >= 2) {
        suggested = words.map((w) => w[0]).join('').slice(0, 4).toUpperCase();
      } else if (words.length === 1 && words[0].length >= 2) {
        suggested = words[0].slice(0, 3).toUpperCase();
      }
      if (suggested) {
        setKey(suggested);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeWorkspace) {
      setError('Please select or create an active workspace first.');
      return;
    }

    const cleanKey = key.trim().toUpperCase();
    if (cleanKey.length < 2 || cleanKey.length > 10) {
      setError('Project key must be between 2 and 10 characters.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const newProj = await createProject({
        workspaceId: activeWorkspace.id,
        name: name.trim(),
        key: cleanKey,
        description: description.trim(),
        methodology,
      });

      await fetchProjects(activeWorkspace.id);
      setActiveProject(newProj);
      if (onProjectCreated) onProjectCreated(newProj);

      setName('');
      setKey('');
      setDescription('');
      onClose();
    } catch (err) {
      const msg =
        err.response?.data?.key?.[0] ||
        err.response?.data?.error?.message ||
        'Failed to create project.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.5)',
      backdropFilter: 'blur(3px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: '1rem'
    }}>
      <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '1.75rem', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            right: '1.25rem',
            top: '1.25rem',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--color-slate-400)'
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
          <div style={{
            background: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
            padding: '0.5rem',
            borderRadius: 'var(--radius)'
          }}>
            <FolderPlus size={20} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Create Project</h2>
        </div>

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            padding: '0.6rem 0.8rem',
            borderRadius: 'var(--radius)',
            fontSize: '0.85rem',
            marginBottom: '1rem'
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
              Project Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. SprintMind Core"
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--color-slate-300)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Project Key
              </label>
              <input
                type="text"
                required
                maxLength={10}
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                placeholder="e.g. SM"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--color-slate-300)',
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', marginTop: '0.2rem', display: 'block' }}>
                Used in issue IDs (e.g. {key || 'SM'}-1)
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
                Methodology
              </label>
              <select
                value={methodology}
                onChange={(e) => setMethodology(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--color-slate-300)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  backgroundColor: '#FFFFFF'
                }}
              >
                <option value="scrum">Scrum (Sprints)</option>
                <option value="kanban">Kanban (Continuous)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the project goals..."
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--color-slate-300)',
                fontSize: '0.9rem',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
