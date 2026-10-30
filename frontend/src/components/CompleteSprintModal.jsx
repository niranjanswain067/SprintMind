import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Loader2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { completeSprint } from '../api/sprints';
import { generateAISprintSummary } from '../api/ai';

export default function CompleteSprintModal({
  isOpen,
  onClose,
  onSuccess,
  sprint,
  plannedSprints = [],
}) {
  const [destination, setDestination] = useState('backlog'); // 'backlog' | 'sprint'
  const [targetSprintId, setTargetSprintId] = useState(
    plannedSprints.length > 0 ? String(plannedSprints[0].id) : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // AI Summary State
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showSummaryDetails, setShowSummaryDetails] = useState(true);

  if (!isOpen || !sprint) return null;

  // Compute completed vs incomplete from issues in sprint if present
  const issues = sprint.issues || [];
  const completedIssues = issues.filter((i) => i.status === 'done');
  const incompleteIssues = issues.filter((i) => i.status !== 'done');

  const completedPoints = completedIssues.reduce((sum, i) => sum + (i.story_points || 0), 0);
  const incompletePoints = incompleteIssues.reduce((sum, i) => sum + (i.story_points || 0), 0);

  const handleGenerateSummary = async () => {
    setLoadingSummary(true);
    try {
      const data = await generateAISprintSummary(sprint.id);
      setAiSummary(data);
      setShowSummaryDetails(true);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to generate sprint summary.');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleCopySummary = () => {
    if (!aiSummary) return;
    const narrative = aiSummary.summary_draft || aiSummary.summary || '';
    const lines = [
      `### Sprint Summary: ${sprint.name}`,
      `\n${narrative}`,
      `\n**Highlights:**`,
      ...(aiSummary.highlights || []).map((h) => `- ${h}`),
      `\n**Lowlights:**`,
      ...(aiSummary.lowlights || []).map((l) => `- ${l}`),
      `\n**Recommendations:**`,
      ...(aiSummary.recommendations || []).map((r) => `- ${r}`),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      unfinished_issues_destination: destination,
      target_sprint_id: destination === 'sprint' && targetSprintId ? parseInt(targetSprintId, 10) : null,
    };

    try {
      await completeSprint(sprint.id, payload);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        'Failed to complete sprint.'
      );
    } finally {
      setLoading(false);
    }
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
          maxWidth: '640px',
          maxHeight: '90vh',
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
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius)',
                backgroundColor: 'var(--color-success-light, #DCFCE7)',
                color: 'var(--color-success, #16A34A)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={18} />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Complete: {sprint.name}
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

        {/* Content */}
        <form onSubmit={handleComplete} style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
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

          {/* Sprint outcome stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                padding: '1rem',
                borderRadius: 'var(--radius)',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#16A34A' }}>
                Completed
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803D', marginTop: '0.2rem' }}>
                {completedIssues.length} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>issues</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#166534' }}>
                {completedPoints} story points delivered
              </span>
            </div>

            <div
              style={{
                backgroundColor: '#FFFBEB',
                border: '1px solid #FDE68A',
                padding: '1rem',
                borderRadius: 'var(--radius)',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#D97706' }}>
                Incomplete
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#B45309', marginTop: '0.2rem' }}>
                {incompleteIssues.length} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>issues</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#92400E' }}>
                {incompletePoints} story points left
              </span>
            </div>
          </div>

          {/* AI Sprint Summary & Retrospective Draft */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 'var(--radius)',
              padding: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={16} color="var(--color-primary)" />
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-slate-800)' }}>
                  AI Sprint Retrospective & Summary
                </span>
              </div>
              <button
                type="button"
                onClick={handleGenerateSummary}
                disabled={loadingSummary}
                className="btn btn-secondary"
                style={{
                  fontSize: '0.8rem',
                  padding: '0.3rem 0.65rem',
                  borderColor: 'var(--color-primary)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: '#FFFFFF',
                }}
              >
                {loadingSummary ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
                <span>{loadingSummary ? 'Drafting...' : 'Draft summary with AI'}</span>
              </button>
            </div>

            {aiSummary && (
              <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Executive summary narrative */}
                <div style={{ backgroundColor: '#FFFFFF', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--color-slate-200)', fontSize: '0.875rem', lineHeight: 1.5, color: 'var(--color-slate-800)', whiteSpace: 'pre-wrap' }}>
                  {aiSummary.summary_draft || aiSummary.summary}
                </div>

                {/* Highlights */}
                {aiSummary.highlights?.length > 0 && (
                  <div style={{ backgroundColor: '#F0FDF4', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid #BBF7D0' }}>
                    <strong style={{ fontSize: '0.775rem', textTransform: 'uppercase', color: '#166534', display: 'block', marginBottom: '0.25rem' }}>
                      Highlights
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.825rem', color: '#14532D' }}>
                      {aiSummary.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Lowlights */}
                {aiSummary.lowlights?.length > 0 && (
                  <div style={{ backgroundColor: '#FFFBEB', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid #FDE68A' }}>
                    <strong style={{ fontSize: '0.775rem', textTransform: 'uppercase', color: '#B45309', display: 'block', marginBottom: '0.25rem' }}>
                      Impediments / Lowlights
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.825rem', color: '#92400E' }}>
                      {aiSummary.lowlights.map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {aiSummary.recommendations?.length > 0 && (
                  <div style={{ backgroundColor: '#EEF2FF', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid #C7D2FE' }}>
                    <strong style={{ fontSize: '0.775rem', textTransform: 'uppercase', color: '#3730A3', display: 'block', marginBottom: '0.25rem' }}>
                      Recommendations for Next Sprint
                    </strong>
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.825rem', color: '#312E81' }}>
                      {aiSummary.recommendations.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-slate-600)' }}
                  >
                    {copied ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied to Clipboard!' : 'Copy Summary'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Unfinished items destination choice */}
          {incompleteIssues.length > 0 ? (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.65rem' }}>
                Move {incompleteIssues.length} unfinished {incompleteIssues.length === 1 ? 'issue' : 'issues'} to:
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.75rem 1rem',
                    border: destination === 'backlog' ? '2px solid var(--color-primary)' : '1px solid var(--color-slate-200)',
                    borderRadius: 'var(--radius)',
                    backgroundColor: destination === 'backlog' ? 'var(--color-primary-light)' : '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="destination"
                    value="backlog"
                    checked={destination === 'backlog'}
                    onChange={() => setDestination('backlog')}
                  />
                  <div>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--color-slate-900)' }}>Product Backlog</strong>
                    <p style={{ margin: 0, fontSize: '0.775rem', color: 'var(--color-slate-500)' }}>
                      Return items to the unassigned backlog for future prioritization
                    </p>
                  </div>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    padding: '0.75rem 1rem',
                    border: destination === 'sprint' ? '2px solid var(--color-primary)' : '1px solid var(--color-slate-200)',
                    borderRadius: 'var(--radius)',
                    backgroundColor: destination === 'sprint' ? 'var(--color-primary-light)' : '#FFFFFF',
                    cursor: plannedSprints.length > 0 ? 'pointer' : 'not-allowed',
                    opacity: plannedSprints.length > 0 ? 1 : 0.6,
                  }}
                >
                  <input
                    type="radio"
                    name="destination"
                    value="sprint"
                    checked={destination === 'sprint'}
                    disabled={plannedSprints.length === 0}
                    onChange={() => setDestination('sprint')}
                  />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--color-slate-900)' }}>Next Planned Sprint</strong>
                    {plannedSprints.length > 0 ? (
                      <select
                        value={targetSprintId}
                        onChange={(e) => setTargetSprintId(e.target.value)}
                        disabled={destination !== 'sprint'}
                        className="input"
                        style={{ marginTop: '0.4rem', fontSize: '0.85rem', padding: '0.35rem 0.65rem' }}
                      >
                        {plannedSprints.map((ps) => (
                          <option key={ps.id} value={ps.id}>
                            {ps.name} {ps.goal ? `(${ps.goal})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.775rem', color: 'var(--color-slate-500)' }}>
                        No planned sprints exist. Create one first or roll over to backlog.
                      </p>
                    )}
                  </div>
                </label>
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: 'var(--color-light-gray)',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius)',
                marginBottom: '1.5rem',
                fontSize: '0.875rem',
                color: 'var(--color-slate-600)',
                textAlign: 'center',
              }}
            >
              🎉 Outstanding! All issues in this sprint were completed!
            </div>
          )}

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
              {loading ? 'Completing...' : 'Complete Sprint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

