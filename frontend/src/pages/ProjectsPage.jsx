import React, { useState, useEffect, useCallback } from 'react';
import { Plus, FolderGit2, Calendar, Archive, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listProjects, archiveProject } from '../api/projects';
import NewProjectModal from '../components/NewProjectModal';
import NewWorkspaceModal from '../components/NewWorkspaceModal';

export default function ProjectsPage() {
  const {
    activeWorkspace,
    workspaces,
    activeProject,
    setActiveProject,
    fetchProjects: refreshWorkspaceProjects
  } = useAuth();

  const [projectsList, setProjectsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showNewProjModal, setShowNewProjModal] = useState(false);
  const [showNewWsModal, setShowNewWsModal] = useState(false);

  const currentRole = activeWorkspace?.current_user_role || 'member';
  const canManageProjects = ['admin', 'manager'].includes(currentRole);

  const loadProjects = useCallback(async () => {
    if (!activeWorkspace) {
      setProjectsList([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listProjects(activeWorkspace.id);
      setProjectsList(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch projects.');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleArchive = async (projId) => {
    if (!window.confirm('Are you sure you want to archive this project?')) return;
    try {
      await archiveProject(projId);
      await loadProjects();
      await refreshWorkspaceProjects(activeWorkspace.id);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to archive project.');
    }
  };

  if (workspaces.length === 0) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '3rem 2rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius)',
            background: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem'
          }}>
            <Building2 size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Create Your First Workspace</h2>
          <p style={{ color: 'var(--color-slate-600)', marginBottom: '1.75rem', fontSize: '0.95rem' }}>
            Workspaces isolate your team's projects, sprints, and AI planning assistants.
          </p>
          <button onClick={() => setShowNewWsModal(true)} className="btn btn-primary" style={{ padding: '0.65rem 1.25rem' }}>
            <Plus size={18} /> Create Workspace
          </button>
        </div>
        <NewWorkspaceModal isOpen={showNewWsModal} onClose={() => setShowNewWsModal(false)} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Projects
          </h1>
          <p style={{ color: 'var(--color-slate-600)', fontSize: '0.95rem' }}>
            Manage Agile projects for <strong>{activeWorkspace?.name}</strong>
          </p>
        </div>

        {canManageProjects && (
          <button
            onClick={() => setShowNewProjModal(true)}
            className="btn btn-primary"
            style={{ padding: '0.6rem 1.1rem' }}
          >
            <Plus size={18} /> New Project
          </button>
        )}
      </div>

      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: 'var(--color-danger-bg)',
          color: 'var(--color-danger)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius)',
          marginBottom: '1.5rem'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-slate-500)' }}>
          Loading projects...
        </div>
      ) : projectsList.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
          <FolderGit2 size={40} style={{ color: 'var(--color-slate-400)', margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem' }}>No Projects Yet</h3>
          <p style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Create your first Scrum or Kanban project to organize sprint backlogs and issues.
          </p>
          {canManageProjects && (
            <button onClick={() => setShowNewProjModal(true)} className="btn btn-primary">
              <Plus size={16} /> Create Project
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {projectsList.map((proj) => {
            const isSelected = activeProject?.id === proj.id;
            return (
              <div
                key={proj.id}
                className="card"
                style={{
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-slate-200)',
                  position: 'relative'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                      backgroundColor: 'var(--color-primary-light)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem'
                    }}>
                      {proj.key}
                    </span>

                    <span className="badge" style={{
                      textTransform: 'capitalize',
                      backgroundColor: proj.methodology === 'scrum' ? 'var(--color-ai-purple-light)' : 'var(--color-slate-100)',
                      color: proj.methodology === 'scrum' ? 'var(--color-ai-purple)' : 'var(--color-slate-700)',
                    }}>
                      {proj.methodology}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                    {proj.name}
                  </h3>
                  <p style={{ color: 'var(--color-slate-600)', fontSize: '0.85rem', marginBottom: '1rem', minHeight: '38px' }}>
                    {proj.description || 'No description provided.'}
                  </p>
                </div>

                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--color-slate-100)',
                    fontSize: '0.8rem',
                    color: 'var(--color-slate-500)',
                    marginBottom: '1rem'
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Calendar size={14} /> {new Date(proj.created_at).toLocaleDateString()}
                    </span>
                    <span>{proj.issue_counter} Issues</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => setActiveProject(proj)}
                      className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '0.45rem' }}
                    >
                      {isSelected ? <><CheckCircle2 size={15} /> Active</> : 'Select'}
                    </button>

                    {canManageProjects && (
                      <button
                        onClick={() => handleArchive(proj.id)}
                        className="btn btn-secondary"
                        title="Archive Project"
                        style={{ padding: '0.45rem 0.65rem', color: 'var(--color-slate-500)' }}
                      >
                        <Archive size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewProjectModal
        isOpen={showNewProjModal}
        onClose={() => setShowNewProjModal(false)}
        onProjectCreated={() => loadProjects()}
      />
    </div>
  );
}
