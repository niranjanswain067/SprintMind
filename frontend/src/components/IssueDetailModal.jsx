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
  Edit2,
  Loader2,
  Check,
  AlertTriangle,
  Bug,
  Lightbulb,
} from 'lucide-react';
import {
  getIssueDetail,
  updateIssue,
  deleteIssue,
  createIssueComment,
  bulkCreateIssues,
} from '../api/issues';
import {
  generateAICriteria,
  generateAITasks,
  analyzeAIBug,
} from '../api/ai';
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

  // AI Criteria state
  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [aiCriteria, setAiCriteria] = useState(null);
  const [selectedCriteriaIndices, setSelectedCriteriaIndices] = useState([]);

  // AI Tasks state
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [aiTasks, setAiTasks] = useState(null);
  const [selectedTaskIndices, setSelectedTaskIndices] = useState([]);
  const [savingAITasks, setSavingAITasks] = useState(false);

  // AI Bug Analysis state
  const [analyzingBug, setAnalyzingBug] = useState(false);
  const [bugAnalysis, setBugAnalysis] = useState(null);
  const [applyingSeverity, setApplyingSeverity] = useState(false);

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

  const handleGenerateCriteria = async () => {
    setLoadingCriteria(true);
    try {
      const data = await generateAICriteria(issue.id);
      const list = data.criteria || data.acceptance_criteria || [];
      setAiCriteria(list);
      setSelectedCriteriaIndices(list.map((_, i) => i));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to generate acceptance criteria.');
    } finally {
      setLoadingCriteria(false);
    }
  };

  const handleApplyCriteria = async () => {
    if (!aiCriteria || selectedCriteriaIndices.length === 0) return;
    const selected = selectedCriteriaIndices.map((i) => aiCriteria[i]).filter(Boolean);
    const formatted = selected.map((s) => (s.startsWith('- ') ? s : `- ${s}`)).join('\n');
    const merged = issue.acceptance_criteria
      ? `${issue.acceptance_criteria}\n${formatted}`
      : formatted;

    await handleFieldChange('acceptance_criteria', merged);
    setAiCriteria(null);
    setSelectedCriteriaIndices([]);
  };

  const handleGenerateTasks = async () => {
    setLoadingTasks(true);
    try {
      const data = await generateAITasks(issue.id);
      const list = data.tasks || [];
      setAiTasks(list);
      setSelectedTaskIndices(list.map((_, i) => i));
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to generate subtasks.');
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleCreateAITasks = async () => {
    if (!aiTasks || selectedTaskIndices.length === 0) return;
    setSavingAITasks(true);
    try {
      const toCreate = selectedTaskIndices.map((i) => ({
        title: aiTasks[i].title,
        description: aiTasks[i].description || '',
        story_points: aiTasks[i].estimated_points ?? aiTasks[i].estimated_story_points ?? null,
        parent_id: issue.id,
        type: 'task',
      }));

      await bulkCreateIssues(issue.project_id, toCreate);
      setAiTasks(null);
      setSelectedTaskIndices([]);
      await fetchDetail();
      onIssueUpdated?.();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to create subtasks.');
    } finally {
      setSavingAITasks(false);
    }
  };

  const handleAnalyzeBug = async () => {
    setAnalyzingBug(true);
    try {
      const data = await analyzeAIBug(issue.id);
      setBugAnalysis(data);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to analyze bug.');
    } finally {
      setAnalyzingBug(false);
    }
  };

  const handleApplyBugSeverity = async () => {
    if (!bugAnalysis?.suggested_severity) return;
    setApplyingSeverity(true);
    try {
      await handleFieldChange('priority', bugAnalysis.suggested_severity);
    } finally {
      setApplyingSeverity(false);
    }
  };

  const handleAppendBugFixToDescription = async () => {
    if (!bugAnalysis?.suggested_fix) return;
    const addition = `\n\n### Suggested Fix (AI):\n${bugAnalysis.suggested_fix}`;
    const newDesc = (issue.description || '') + addition;
    await handleFieldChange('description', newDesc);
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

                {/* AI Bug Analysis & Triage (for bug issue types) */}
                {issue.type === 'bug' && (
                  <div
                    style={{
                      marginBottom: '1.75rem',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: 'var(--radius)',
                      padding: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#B91C1C', fontWeight: 700, fontSize: '0.85rem' }}>
                        <Bug size={16} />
                        <span>AI BUG ANALYSIS & TRIAGE</span>
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={handleAnalyzeBug}
                          disabled={analyzingBug}
                          className="btn btn-secondary"
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.25rem 0.65rem',
                            borderColor: '#F87171',
                            color: '#B91C1C',
                            backgroundColor: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                        >
                          {analyzingBug ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
                          <span>{analyzingBug ? 'Analyzing...' : 'Analyze Bug'}</span>
                        </button>
                      )}
                    </div>

                    {bugAnalysis ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                        {/* Enhanced summary */}
                        {bugAnalysis.enhanced_summary && (
                          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #FECACA', padding: '0.65rem 0.8rem', borderRadius: 'var(--radius)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#991B1B' }}>Refined Bug Summary:</span>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => handleFieldChange('description', bugAnalysis.enhanced_summary)}
                                  className="btn btn-ghost"
                                  style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem', color: '#B91C1C' }}
                                >
                                  Apply to Description
                                </button>
                              )}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#7F1D1D', whiteSpace: 'pre-wrap' }}>
                              {bugAnalysis.enhanced_summary}
                            </p>
                          </div>
                        )}

                        {/* Hypotheses */}
                        {bugAnalysis.root_cause_hypotheses?.length > 0 && (
                          <div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#991B1B' }}>Root Cause Hypotheses:</span>
                            <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0, fontSize: '0.85rem', color: '#7F1D1D' }}>
                              {bugAnalysis.root_cause_hypotheses.map((h, i) => (
                                <li key={i}>{h}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Missing context / reproduction details */}
                        {(bugAnalysis.missing_information?.length > 0 || bugAnalysis.missing_repro_steps?.length > 0) && (
                          <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius)' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#B45309', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <AlertTriangle size={14} /> Missing Context / Reproduction Info:
                            </span>
                            <ul style={{ margin: '0.25rem 0 0 1.25rem', padding: 0, fontSize: '0.825rem', color: '#92400E' }}>
                              {(bugAnalysis.missing_information || bugAnalysis.missing_repro_steps || []).map((m, i) => (
                                <li key={i}>{m}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Suggested severity */}
                        {bugAnalysis.suggested_severity && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '1px solid #FCA5A5' }}>
                            <span style={{ fontSize: '0.825rem', color: '#7F1D1D' }}>
                              Suggested Severity: <strong style={{ textTransform: 'uppercase' }}>{bugAnalysis.suggested_severity}</strong>
                            </span>
                            {canEdit && issue.priority !== bugAnalysis.suggested_severity && (
                              <button
                                type="button"
                                onClick={handleApplyBugSeverity}
                                disabled={applyingSeverity}
                                className="btn btn-secondary"
                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: '#FFFFFF' }}
                              >
                                Apply Severity ({bugAnalysis.suggested_severity})
                              </button>
                            )}
                          </div>
                        )}

                        {/* Suggested Fix */}
                        {bugAnalysis.suggested_fix && (
                          <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <Lightbulb size={14} /> Suggested Fix:
                              </span>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={handleAppendBugFixToDescription}
                                  className="btn btn-ghost"
                                  style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem', color: '#15803D' }}
                                >
                                  Append to Description
                                </button>
                              )}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.825rem', color: '#14532D', whiteSpace: 'pre-wrap' }}>
                              {bugAnalysis.suggested_fix}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.825rem', color: '#991B1B' }}>
                        Run AI triage to hypothesize root cause, verify reproduction steps, and suggest severity and fixes.
                      </p>
                    )}
                  </div>
                )}

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
                <div style={{ marginBottom: '1.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <h3
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'var(--color-slate-500)',
                        letterSpacing: '0.04em',
                        margin: 0,
                      }}
                    >
                      Acceptance Criteria
                    </h3>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={handleGenerateCriteria}
                        disabled={loadingCriteria}
                        className="btn btn-ghost"
                        style={{
                          fontSize: '0.8rem',
                          padding: '0.2rem 0.5rem',
                          color: 'var(--color-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        {loadingCriteria ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
                        <span>Suggest criteria</span>
                      </button>
                    )}
                  </div>

                  {/* Existing Criteria */}
                  {issue.acceptance_criteria ? (
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
                  ) : (
                    !aiCriteria && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-400)', margin: 0 }}>
                        No acceptance criteria defined yet.
                      </p>
                    )
                  )}

                  {/* AI Suggested Criteria Review Box */}
                  {aiCriteria && (
                    <div
                      style={{
                        marginTop: '0.75rem',
                        backgroundColor: '#EEF2FF',
                        border: '1px solid #C7D2FE',
                        borderRadius: 'var(--radius)',
                        padding: '0.85rem 1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3730A3', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Sparkles size={14} /> AI Suggested Acceptance Criteria ({selectedCriteriaIndices.length}/{aiCriteria.length} selected)
                        </span>
                        <button
                          type="button"
                          onClick={() => setAiCriteria(null)}
                          className="btn btn-ghost"
                          style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem', color: 'var(--color-slate-500)' }}
                        >
                          Discard
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.75rem' }}>
                        {aiCriteria.map((crit, idx) => {
                          const isChecked = selectedCriteriaIndices.includes(idx);
                          return (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.5rem',
                                backgroundColor: '#FFFFFF',
                                padding: '0.5rem 0.65rem',
                                borderRadius: 'var(--radius)',
                                border: '1px solid #E0E7FF',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedCriteriaIndices((prev) =>
                                    isChecked ? prev.filter((i) => i !== idx) : [...prev, idx]
                                  );
                                }}
                                style={{ marginTop: '0.2rem', cursor: 'pointer' }}
                              />
                              <input
                                type="text"
                                value={crit}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAiCriteria((prev) => {
                                    const next = [...prev];
                                    next[idx] = val;
                                    return next;
                                  });
                                }}
                                className="input"
                                style={{
                                  flex: 1,
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.825rem',
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={handleApplyCriteria}
                          disabled={selectedCriteriaIndices.length === 0}
                          className="btn btn-primary"
                          style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Check size={14} /> Apply to Story
                        </button>
                      </div>
                    </div>
                  )}
                </div>

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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={handleGenerateTasks}
                          disabled={loadingTasks}
                          className="btn btn-ghost"
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.2rem 0.5rem',
                            color: 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          {loadingTasks ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
                          <span>Suggest tasks</span>
                        </button>
                        <button
                          type="button"
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
                      </div>
                    )}
                  </div>

                  {/* AI Suggested Subtasks Review Box */}
                  {aiTasks && (
                    <div
                      style={{
                        marginBottom: '1rem',
                        backgroundColor: '#EEF2FF',
                        border: '1px solid #C7D2FE',
                        borderRadius: 'var(--radius)',
                        padding: '0.85rem 1rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3730A3', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Sparkles size={14} /> AI Suggested Breakdown ({selectedTaskIndices.length}/{aiTasks.length} selected)
                        </span>
                        <button
                          type="button"
                          onClick={() => setAiTasks(null)}
                          className="btn btn-ghost"
                          style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem', color: 'var(--color-slate-500)' }}
                        >
                          Discard
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        {aiTasks.map((t, idx) => {
                          const isChecked = selectedTaskIndices.includes(idx);
                          return (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.65rem',
                                backgroundColor: '#FFFFFF',
                                padding: '0.65rem 0.75rem',
                                borderRadius: 'var(--radius)',
                                border: '1px solid #E0E7FF',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  setSelectedTaskIndices((prev) =>
                                    isChecked ? prev.filter((i) => i !== idx) : [...prev, idx]
                                  );
                                }}
                                style={{ marginTop: '0.35rem', cursor: 'pointer' }}
                              />
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    value={t.title}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setAiTasks((prev) => {
                                        const next = [...prev];
                                        next[idx] = { ...next[idx], title: val };
                                        return next;
                                      });
                                    }}
                                    placeholder="Task title"
                                    className="input"
                                    style={{ flex: 1, fontSize: '0.85rem', padding: '0.25rem 0.5rem', fontWeight: 600 }}
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={t.estimated_story_points ?? ''}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                                      setAiTasks((prev) => {
                                        const next = [...prev];
                                        next[idx] = { ...next[idx], estimated_story_points: val };
                                        return next;
                                      });
                                    }}
                                    placeholder="Pts"
                                    className="input"
                                    style={{ width: '60px', fontSize: '0.8rem', padding: '0.25rem 0.4rem', textAlign: 'center' }}
                                  />
                                </div>
                                <input
                                  type="text"
                                  value={t.description || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setAiTasks((prev) => {
                                      const next = [...prev];
                                      next[idx] = { ...next[idx], description: val };
                                      return next;
                                    });
                                  }}
                                  placeholder="Technical description (optional)"
                                  className="input"
                                  style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', color: 'var(--color-slate-600)' }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={handleCreateAITasks}
                          disabled={savingAITasks || selectedTaskIndices.length === 0}
                          className="btn btn-primary"
                          style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Check size={14} />
                          {savingAITasks ? 'Creating Subtasks...' : `Create ${selectedTaskIndices.length} Subtasks`}
                        </button>
                      </div>
                    </div>
                  )}

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
                    {Array.isArray(members) && members.map((m) => {
                      const memberId = m.user_id || m.user?.id || m.id;
                      const memberName = m.name || m.user?.name || m.email || `Member ${memberId}`;
                      return (
                        <option key={memberId} value={memberId}>
                          {memberName} ({m.role})
                        </option>
                      );
                    })}
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

