import React, { useState } from 'react';
import {
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2,
  Layers,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { generateAIStories } from '../api/ai';
import { bulkCreateIssues } from '../api/issues';

export default function AIStoriesModal({
  isOpen,
  onClose,
  onSuccess,
  projectId,
}) {
  const [requirements, setRequirements] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState({});

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!requirements.trim()) {
      setError('Please enter requirements to generate user stories.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await generateAIStories(projectId, requirements.trim());
      const returnedDrafts = res.drafts || [];
      setDrafts(returnedDrafts);

      // Select all by default
      const initialSelected = {};
      returnedDrafts.forEach((_, idx) => {
        initialSelected[idx] = true;
      });
      setSelectedIndices(initialSelected);
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        'Failed to generate stories. Please verify Groq API key configuration.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelect = (index) => {
    setSelectedIndices((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleFieldChange = (index, field, value) => {
    setDrafts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddSelected = async () => {
    const toSave = drafts.filter((_, idx) => selectedIndices[idx]);
    if (toSave.length === 0) {
      alert('Please select at least one story draft to add.');
      return;
    }

    setSaving(true);
    setError(null);

    const issuesPayload = toSave.map((d) => ({
      type: 'story',
      title: d.title,
      description: d.description,
      acceptance_criteria: Array.isArray(d.acceptance_criteria)
        ? d.acceptance_criteria.map((c) => `- ${c}`).join('\n')
        : String(d.acceptance_criteria || ''),
      story_points: d.story_points || 3,
      status: 'todo',
      priority: 'medium',
    }));

    try {
      await bulkCreateIssues(projectId, issuesPayload);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save selected stories.');
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = Object.values(selectedIndices).filter(Boolean).length;

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
          maxWidth: '750px',
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
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: 'var(--radius)',
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-ai-purple) 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                AI Requirements Assistant
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
                Powered by Groq LLaMA 3.3
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-ghost"
            style={{ padding: '0.35rem', color: 'var(--color-slate-500)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
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

          {drafts.length === 0 ? (
            /* Input Step */
            <form onSubmit={handleGenerate}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Paste product requirements, user feedback, or feature specs:
                </label>
                <textarea
                  rows={7}
                  maxLength={4000}
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  placeholder="e.g. As an admin, I want to invite teammates by entering their email address and assigning a role (Admin, Manager, Developer, Viewer). An invitation email should be sent with an accept link that expires in 48 hours."
                  className="input"
                  style={{ resize: 'vertical', lineHeight: 1.5 }}
                  required
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>
                  <span>Tip: Include user roles, expected behaviors, and edge cases for better story decomposition.</span>
                  <span>{requirements.length} / 4000 chars</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
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
                  disabled={loading || !requirements.trim()}
                  style={{
                    background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-ai-purple) 100%)',
                    border: 'none',
                  }}
                >
                  <Sparkles size={16} />
                  {loading ? 'Analyzing with AI...' : 'Generate Drafts'}
                </button>
              </div>
            </form>
          ) : (
            /* Review Step */
            <div>
              {/* Disclaimer header */}
              <div
                style={{
                  backgroundColor: '#FAF5FF',
                  border: '1px solid #E9D5FF',
                  borderRadius: 'var(--radius)',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.85rem',
                  color: '#6B21A8',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="badge badge-ai" style={{ fontSize: '0.75rem' }}>
                    ✨ AI Draft
                  </span>
                  <span>Human-in-the-loop: Review, edit, or deselect drafts before saving to database.</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDrafts([]);
                    setSelectedIndices({});
                  }}
                  className="btn btn-ghost"
                  style={{ fontSize: '0.8rem', color: '#6B21A8', padding: '0.2rem 0.5rem' }}
                >
                  <RotateCcw size={13} style={{ marginRight: '0.3rem' }} />
                  Start Over
                </button>
              </div>

              {/* Drafts Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                {drafts.map((draft, idx) => {
                  const isChecked = Boolean(selectedIndices[idx]);
                  return (
                    <div
                      key={idx}
                      style={{
                        border: isChecked ? '1.5px solid var(--color-ai-purple, #9333EA)' : '1px solid var(--color-slate-200)',
                        backgroundColor: isChecked ? '#FAF5FF' : '#FFFFFF',
                        borderRadius: 'var(--radius)',
                        padding: '1.25rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {/* Card Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(idx)}
                          style={{ width: '18px', height: '18px', marginTop: '0.25rem', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <input
                            type="text"
                            value={draft.title}
                            onChange={(e) => handleFieldChange(idx, 'title', e.target.value)}
                            className="input"
                            style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.5rem' }}
                          />

                          <textarea
                            rows={2}
                            value={draft.description}
                            onChange={(e) => handleFieldChange(idx, 'description', e.target.value)}
                            className="input"
                            style={{ fontSize: '0.875rem', resize: 'vertical', marginBottom: '0.5rem' }}
                          />

                          {/* Acceptance criteria */}
                          {Array.isArray(draft.acceptance_criteria) && (
                            <div style={{ fontSize: '0.825rem', color: 'var(--color-slate-700)', padding: '0.5rem', backgroundColor: '#FFFFFF', borderRadius: 'var(--radius)', border: '1px solid var(--color-slate-200)' }}>
                              <strong style={{ fontSize: '0.775rem', textTransform: 'uppercase', color: 'var(--color-slate-500)', display: 'block', marginBottom: '0.25rem' }}>
                                Acceptance Criteria:
                              </strong>
                              {draft.acceptance_criteria.map((c, cIdx) => (
                                <div key={cIdx} style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.2rem' }}>
                                  <span>•</span>
                                  <span>{c}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Points */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-slate-500)' }}>
                            Points
                          </label>
                          <select
                            value={draft.story_points || 3}
                            onChange={(e) => handleFieldChange(idx, 'story_points', parseInt(e.target.value, 10))}
                            className="input"
                            style={{ width: '70px', padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
                          >
                            <option value="1">1 pt</option>
                            <option value="2">2 pts</option>
                            <option value="3">3 pts</option>
                            <option value="5">5 pts</option>
                            <option value="8">8 pts</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Actions */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid var(--color-slate-200)',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setDrafts([]);
                    setSelectedIndices({});
                  }}
                  className="btn btn-ghost"
                  style={{ color: 'var(--color-danger)' }}
                >
                  <Trash2 size={16} /> Discard All
                </button>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn btn-secondary"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSelected}
                    className="btn btn-primary"
                    disabled={saving || selectedCount === 0}
                  >
                    {saving
                      ? 'Adding to Backlog...'
                      : `Add Selected (${selectedCount}) to Backlog`}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

