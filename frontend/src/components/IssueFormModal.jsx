import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, CheckSquare, Layers } from 'lucide-react';
import { createIssue, updateIssue } from '../api/issues';
import { listWorkspaceMembers } from '../api/workspaces';
import { useAuth } from '../context/AuthContext';

export default function IssueFormModal({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  initialData = null,
  parentIssue = null,
}) {
  const { activeWorkspace } = useAuth();

  const [type, setType] = useState('story');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [priority, setPriority] = useState('medium');
  const [status, setStatus] = useState('todo');
  const [storyPoints, setStoryPoints] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [parentId, setParentId] = useState('');

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isEdit = Boolean(initialData);

  useEffect(() => {
    if (activeWorkspace?.id) {
      listWorkspaceMembers(activeWorkspace.id)
        .then(setMembers)
        .catch(() => {});
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type || 'story');
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setAcceptanceCriteria(initialData.acceptance_criteria || '');
      setPriority(initialData.priority || 'medium');
      setStatus(initialData.status || 'todo');
      setStoryPoints(initialData.story_points ?? '');
      setAssigneeId(initialData.assignee?.id || initialData.assignee_id || '');
      setDueDate(initialData.due_date || '');
      setParentId(initialData.parent_id || '');
    } else {
      setType(parentIssue ? 'task' : 'story');
      setTitle('');
      setDescription('');
      setAcceptanceCriteria('');
      setPriority('medium');
      setStatus('todo');
      setStoryPoints('');
      setAssigneeId('');
      setDueDate('');
      setParentId(parentIssue?.id || '');
    }
    setError(null);
  }, [initialData, parentIssue, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      type,
      title: title.trim(),
      description: description.trim(),
      acceptance_criteria: acceptanceCriteria.trim(),
      priority,
      status,
      story_points: storyPoints === '' ? null : parseInt(storyPoints, 10),
      assignee_id: assigneeId ? parseInt(assigneeId, 10) : null,
      due_date: dueDate || null,
      parent_id: parentId ? parseInt(parentId, 10) : null,
    };

    try {
      if (isEdit) {
        await updateIssue(initialData.id, payload);
      } else {
        await createIssue(projectId, payload);
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save issue.');
    } finally {
      setLoading(false);
    }
  };

  const typeConfig = {
    epic: { label: 'Epic', color: '#9333EA', icon: '🟣' },
    story: { label: 'Story', color: '#16A34A', icon: '🟢' },
    task: { label: 'Task', color: '#2563EB', icon: '🔵' },
    bug: { label: 'Bug', color: '#DC2626', icon: '🔴' },
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--color-slate-200)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius)',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckSquare size={18} />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              {isEdit ? `Edit ${initialData.key || 'Issue'}` : parentIssue ? `Add Subtask for ${parentIssue.key}` : 'Create Issue'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '0.35rem', color: 'var(--color-slate-500)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} style={{ overflowY: 'auto', padding: '1.5rem' }}>
          {error && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#B91C1C',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius)',
                marginBottom: '1.25rem',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Issue Type Selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              Issue Type
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {Object.entries(typeConfig).map(([key, cfg]) => {
                const isSelected = type === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    style={{
                      flex: 1,
                      padding: '0.55rem 0.5rem',
                      borderRadius: 'var(--radius)',
                      border: isSelected ? `2px solid ${cfg.color}` : '1px solid var(--color-slate-200)',
                      backgroundColor: isSelected ? `${cfg.color}15` : '#FFFFFF',
                      color: isSelected ? cfg.color : 'var(--color-slate-700)',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem',
                      fontSize: '0.85rem',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{cfg.icon}</span>
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              Title <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. As a user, I want to reset my password..."
              className="input"
              required
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide background, steps, or business logic..."
              className="input"
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Acceptance Criteria (shown prominently for stories/tasks) */}
          {(type === 'story' || type === 'task') && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Acceptance Criteria
              </label>
              <textarea
                rows={3}
                value={acceptanceCriteria}
                onChange={(e) => setAcceptanceCriteria(e.target.value)}
                placeholder="- Given a valid email, when user clicks submit, then send 6-digit OTP&#10;- Token expires in 15 minutes"
                className="input"
                style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '0.85rem' }}
              />
            </div>
          )}

          {/* Priority & Story Points & Status */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="input"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Story Points
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
                placeholder="pts (e.g. 3)"
                className="input"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
              </select>
            </div>
          </div>

          {/* Assignee & Due Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Assignee
              </label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="input"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user.id} value={m.user.id}>
                    {m.user.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--color-slate-200)' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : isEdit ? 'Update Issue' : 'Create Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

