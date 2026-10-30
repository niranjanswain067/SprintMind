import React, { useState } from 'react';
import { X, Play, AlertCircle, Calendar, Target } from 'lucide-react';
import { startSprint } from '../api/sprints';

export default function StartSprintModal({
  isOpen,
  onClose,
  onSuccess,
  sprint,
}) {
  const today = new Date().toISOString().split('T')[0];
  const defaultEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(sprint?.start_date || today);
  const [endDate, setEndDate] = useState(sprint?.end_date || defaultEnd);
  const [goal, setGoal] = useState(sprint?.goal || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !sprint) return null;

  const handleStart = async (e) => {
    e.preventDefault();
    if (startDate && endDate && endDate < startDate) {
      setError('End date cannot be earlier than start date.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await startSprint(sprint.id, {
        start_date: startDate,
        end_date: endDate,
        goal: goal.trim(),
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        'Failed to start sprint. Ensure no other sprint is currently active.'
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
          maxWidth: '500px',
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
              <Play size={18} />
            </div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Start: {sprint.name}
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

        {/* Form Content */}
        <form onSubmit={handleStart} style={{ padding: '1.5rem' }}>
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

          {/* Scope preview */}
          <div
            style={{
              backgroundColor: 'var(--color-light-gray)',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.875rem',
            }}
          >
            <span>
              Committed Issues: <strong>{sprint.issue_count || 0}</strong>
            </span>
            <span>
              Total Scope: <strong>{sprint.total_points || 0} story pts</strong>
            </span>
          </div>

          {/* Duration / Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input"
                required
              />
            </div>
          </div>

          {/* Sprint Goal */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
              Sprint Goal
            </label>
            <textarea
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What is the definition of success for this sprint?"
              className="input"
              style={{ resize: 'vertical' }}
            />
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
              {loading ? 'Starting...' : 'Start Sprint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

