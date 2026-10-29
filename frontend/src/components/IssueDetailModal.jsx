import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  AlertCircle,
  MessageSquare,
  History,
  CornerDownRight,
  Sparkles,
  Edit2
} from 'lucide-react';
import {
  getIssueDetail,
  updateIssue,
  deleteIssue,
  createIssueComment,
} from '../api/issues';
import { listWorkspaceMembers } from '../api/workspaces';
import { useAuth } from '../context/AuthContext';
import IssueFormModal from './IssueFormModal';

export default function IssueDetailModal({
  isOpen,
  onClose,
  issueId,
  onIssueUpdated,
  onIssueDeleted
}) {
  const { activeWorkspace } = useAuth();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [members, setMembers] = useState([]);
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);
  const [activeTab, setActiveTab] = useState('comments'); // 'comments' | 'activity'

  const currentRole = activeWorkspace?.current_user_role || 'member';
  const canManage = ['admin', 'manager'].includes(currentRole);
  const canEdit = ['admin', 'manager', 'developer'].includes(currentRole);

  const fetchDetail = useCallback(async () => {
    if (!issueId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getIssueDetail(issueId);
      setIssue(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load issue details.');
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    if (isOpen && issueId) {
      fetchDetail();
      if (activeWorkspace?.id) {
        listWorkspaceMembers(activeWorkspace.id)
          .then(setMembers)
          .catch(() => {});
      }
    }
  }, [isOpen, issueId, fetchDetail, activeWorkspace?.id]);

  if (!isOpen) return null;

  const handleFieldChange = async (fieldName, value) => {
    if (!canEdit) return;
    try {
      const updated = await updateIssue(issue.id, { [fieldName]: value });
      setIssue(updated);
      onIssueUpdated?.(updated);
    } catch (err) {
      alert(err.response?.data?.error?.message || `Failed to update ${fieldName}`);
    }
  };

  const handleSubtaskToggle = async (subtaskId, currentStatus) => {
    if (!canEdit) return;
    const nextStatus = currentStatus === 'done' ? 'todo' : 'done';
    try {
      await updateIssue(subtaskId, { status: nextStatus });
      fetchDetail();
      onIssueUpdated?.();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update subtask.');
    }
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      await createIssueComment(issue.id, newComment.trim());
      setNewComment('');
      await fetchDetail();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to post comment.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${issue.key}: "${issue.title}"?`)) return;
    try {
      await deleteIssue(issue.id);
      onIssueDeleted?.(issue.id);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete issue.');
    }
  };

  const typeConfig = {
    epic: { label: 'Epic', color: '#9333EA', icon: '🟣' },
    story: { label: 'Story', color: '#16A34A', icon: '🟢' },
    task: { label: 'Task', color: '#2563EB', icon: '🔵' },
    bug: { label: 'Bug', color: '#DC2626', icon: '🔴' },
  };

  const priorityColors = {
    low: { bg: '#F1F5F9', color: '#475569' },
    medium: { bg: '#EFF6FF', color: '#2563EB' },
    high: { bg: '#FEF3C7', color: '#D97706' },
    critical: { bg: '#FEE2E2', color: '#DC2626' },
  };

  return (
    <>
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
            maxWidth: '900px',
            height: '88vh',
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
              padding: '1rem 1.5rem',
              borderBottom: '1px solid var(--color-slate-200)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {issue && (
                <>
                  <span style={{ fontSize: '1.1rem' }}>
                    {typeConfig[issue.type]?.icon || '🔵'}
                  </span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                      fontSize: '0.95rem',
                    }}
                  >
                    {issue.key}
                  </span>
                  <span style={{ color: 'var(--color-slate-400)' }}>•</span>
                  <span
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      padding: '0.2rem 0.55rem',
                      borderRadius: 'var(--radius)',
                      backgroundColor: 'var(--color-light-gray)',
                      color: 'var(--color-slate-600)',
                    }}
                  >
                    {issue.type}
                  </span>
                </>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {canManage && issue && (
                <button
                  onClick={handleDelete}
                  className="btn btn-ghost"
                  title="Delete Issue"
                  style={{ color: 'var(--color-danger)', padding: '0.4rem' }}
                >
                  <Trash2 size={18} />
                </button>
              )}
              <button
                onClick={onClose}
                className="btn btn-ghost"
                style={{ padding: '0.4rem', color: 'var(--color-slate-500)' }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Body Content */}
          {loading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-slate-500)' }}>
              Loading issue details...
            </div>
          ) : error ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 0.5rem' }} />
              <p>{error}</p>
            </div>
          ) : issue ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.6fr 1fr',
                flex: 1,
                overflow: 'hidden',
              }}
            >
              {/* LEFT COLUMN: Main content */}
              <div
                style={{
                  padding: '1.5rem',
                  overflowY: 'auto',
                  borderRight: '1px solid var(--color-slate-200)',
                }}
              >
                {/* Title */}
                <h1
                  style={{
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    lineHeight: 1.35,
                    marginBottom: '1.25rem',
                    color: 'var(--color-slate-900)',
                  }}
                >
                  {issue.title}
                </h1>

                {/* Description */}
                <div style={{ marginBottom: '1.75rem' }}>
                  <h3
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: 'var(--color-slate-500)',
                      marginBottom: '0.5rem',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Description
                  </h3>
                  <div
                    style={{
                      backgroundColor: 'var(--color-light-gray)',
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius)',
                      fontSize: '0.9rem',
                      lineHeight: 1.5,
                      color: issue.description ? 'var(--color-slate-800)' : 'var(--color-slate-400)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {issue.description || 'No description provided.'}
                  </div>
                </div>

                {/* Acceptance Criteria */}
                {issue.acceptance_criteria && (
                  <div style={{ marginBottom: '1.75rem' }}>
                    <h3
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'var(--color-slate-500)',
                        marginBottom: '0.5rem',
                        letterSpacing: '0.04em',
                      }}
                    >
                      Acceptance Criteria
                    </h3>
                    <div
                      style={{
                        backgroundColor: '#F8FAFC',
                        border: '1px solid var(--color-slate-200)',
                        padding: '0.85rem 1rem',
                        borderRadius: 'var(--radius)',
                        fontSize: '0.875rem',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'monospace',
                      }}
                    >
                      {issue.acceptance_criteria}
                    </div>
                  </div>
                )}

                {/* Sub-tasks section */}
                <div style={{ marginBottom: '2rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.65rem',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'var(--color-slate-500)',
                        margin: 0,
                        letterSpacing: '0.04em',
                      }}
                    >
                      Sub-tasks ({issue.subtasks?.length || 0})
                    </h3>
                    {canEdit && (
                      <button
                        onClick={() => setShowSubtaskModal(true)}
                        className="btn btn-ghost"
                        style={{
                          fontSize: '0.8rem',
                          padding: '0.2rem 0.5rem',
                          color: 'var(--color-primary)',
                        }}
                      >
                        <Plus size={14} /> Add Subtask
                      </button>
                    )}
                  </div>

                  {issue.subtasks && issue.subtasks.length > 0 ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--color-slate-200)',
                        borderRadius: 'var(--radius)',
                        overflow: 'hidden',
                      }}
                    >
                      {issue.subtasks.map((st) => (
                        <div
                          key={st.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.65rem 0.85rem',
                            borderBottom: '1px solid var(--color-slate-100)',
                            backgroundColor: st.status === 'done' ? '#F8FAFC' : '#FFFFFF',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                            <input
                              type="checkbox"
                              checked={st.status === 'done'}
                              onChange={() => handleSubtaskToggle(st.id, st.status)}
                              disabled={!canEdit}
                              style={{ cursor: canEdit ? 'pointer' : 'default', width: '16px', height: '16px' }}
                            />
                            <span
                              style={{
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: 'var(--color-slate-600)',
                              }}
                            >
                              {st.key}
                            </span>
                            <span
                              style={{
                                fontSize: '0.9rem',
                                color: st.status === 'done' ? 'var(--color-slate-400)' : 'var(--color-slate-800)',
                                textDecoration: st.status === 'done' ? 'line-through' : 'none',
                              }}
                            >
                              {st.title}
                            </span>
                          </div>
                          {st.story_points != null && (
                            <span className="badge" style={{ fontSize: '0.75rem' }}>
                              {st.story_points} pts
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-400)', margin: 0 }}>
                      No child tasks created yet.
                    </p>
                  )}
                </div>

                {/* Tabs: Comments & Activity */}
                <div style={{ borderTop: '1px solid var(--color-slate-200)', paddingTop: '1.25rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab('comments')}
                      style={{
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'comments' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        paddingBottom: '0.4rem',
                        fontWeight: activeTab === 'comments' ? 700 : 500,
                        color: activeTab === 'comments' ? 'var(--color-primary)' : 'var(--color-slate-500)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.85rem',
                      }}
                    >
                      <MessageSquare size={16} /> Comments ({issue.comments?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('activity')}
                      style={{
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === 'activity' ? '2px solid var(--color-primary)' : '2px solid transparent',
                        paddingBottom: '0.4rem',
                        fontWeight: activeTab === 'activity' ? 700 : 500,
                        color: activeTab === 'activity' ? 'var(--color-primary)' : 'var(--color-slate-500)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.85rem',
                      }}
                    >
                      <History size={16} /> History ({issue.activity_logs?.length || 0})
                    </button>
                  </div>

                  {activeTab === 'comments' ? (
                    <div>
                      {/* Comment list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
                        {issue.comments && issue.comments.length > 0 ? (
                          issue.comments.map((c) => (
                            <div
                              key={c.id}
                              style={{
                                backgroundColor: 'var(--color-light-gray)',
                                padding: '0.85rem 1rem',
                                borderRadius: 'var(--radius)',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  marginBottom: '0.35rem',
                                }}
                              >
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                  {c.author?.name || 'User'}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>
                                  {new Date(c.created_at).toLocaleString([], {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-slate-800)', whiteSpace: 'pre-wrap' }}>
                                {c.body}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-400)' }}>No comments yet.</p>
                        )}
                      </div>

                      {/* Add comment box */}
                      <form onSubmit={handlePostComment} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Write a comment..."
                          className="input"
                          style={{ flex: 1 }}
                        />
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={submittingComment || !newComment.trim()}
                          style={{ padding: '0.5rem 1rem' }}
                        >
                          Send
                        </button>
                      </form>
                    </div>
                  ) : (
                    /* Activity Log list */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {issue.activity_logs && issue.activity_logs.length > 0 ? (
                        issue.activity_logs.map((log) => (
                          <div
                            key={log.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '0.65rem',
                              fontSize: '0.825rem',
                              color: 'var(--color-slate-600)',
                              borderLeft: '2px solid var(--color-slate-200)',
                              paddingLeft: '0.75rem',
                            }}
                          >
                            <span style={{ fontWeight: 600, color: 'var(--color-slate-800)' }}>
                              {log.actor?.name || 'System'}
                            </span>
                            <span>{log.action.replace('_', ' ')}</span>
                            <span style={{ marginLeft: 'auto', color: 'var(--color-slate-400)', fontSize: '0.75rem' }}>
                              {new Date(log.created_at).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-400)' }}>No activities logged.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Metadata & Sidebar Controls */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  padding: '1.5rem',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                }}
              >
                {/* Status */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-slate-500)', marginBottom: '0.35rem' }}>
                    Status
                  </label>
                  <select
                    value={issue.status}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    disabled={!canEdit}
                    className="input"
                    style={{ fontWeight: 600 }}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                {/* Assignee */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-slate-500)', marginBottom: '0.35rem' }}>
                    Assignee
                  </label>
                  <select
                    value={issue.assignee?.id || ''}
                    onChange={(e) => handleFieldChange('assignee_id', e.target.value ? parseInt(e.target.value, 10) : null)}
                    disabled={!canEdit}
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

                {/* Priority */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-slate-500)', marginBottom: '0.35rem' }}>
                    Priority
                  </label>
                  <select
                    value={issue.priority}
                    onChange={(e) => handleFieldChange('priority', e.target.value)}
                    disabled={!canEdit}
                    className="input"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                {/* Story Points */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-slate-500)', marginBottom: '0.35rem' }}>
                    Story Points
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={issue.story_points ?? ''}
                    onChange={(e) => handleFieldChange('story_points', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                    disabled={!canEdit}
                    placeholder="Points"
                    className="input"
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-slate-500)', marginBottom: '0.35rem' }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={issue.due_date || ''}
                    onChange={(e) => handleFieldChange('due_date', e.target.value || null)}
                    disabled={!canEdit}
                    className="input"
                  />
                </div>

                {/* Parent / Epic info */}
                {issue.parent_key && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-slate-500)', marginBottom: '0.35rem' }}>
                      Parent Issue
                    </label>
                    <span className="badge" style={{ fontSize: '0.85rem' }}>
                      {issue.parent_key}
                    </span>
                  </div>
                )}

                {/* Reporter & Created timestamp */}
                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--color-slate-200)', fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
                  <p style={{ margin: '0 0 0.35rem 0' }}>
                    Reporter: <strong>{issue.reporter?.name || 'Unknown'}</strong>
                  </p>
                  <p style={{ margin: 0 }}>
                    Created: {new Date(issue.created_at).toLocaleDateString([], {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Subtask Creation Modal */}
      {showSubtaskModal && (
        <IssueFormModal
          isOpen={showSubtaskModal}
          onClose={() => setShowSubtaskModal(false)}
          onSuccess={() => {
            fetchDetail();
            onIssueUpdated?.();
          }}
          projectId={issue.project_id}
          parentIssue={issue}
        />
      )}
    </>
  );
}

