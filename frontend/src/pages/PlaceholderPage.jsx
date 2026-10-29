import React from 'react';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PlaceholderPage({ title, phase, description }) {
  const { activeProject, activeWorkspace } = useAuth();

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', textAlign: 'center' }}>
      <div className="card" style={{ padding: '3.5rem 2rem' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          borderRadius: 'var(--radius)',
          background: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
          marginBottom: '1.25rem'
        }}>
          <Sparkles size={28} />
        </div>

        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>{title}</h1>

        <div style={{ marginBottom: '1.5rem' }}>
          <span className="badge badge-ai" style={{ fontSize: '0.8rem' }}>
            Scheduled for {phase}
          </span>
        </div>

        <p style={{ color: 'var(--color-slate-600)', fontSize: '1rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
          {description}
        </p>

        {activeProject ? (
          <div style={{
            background: 'var(--color-light-gray)',
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '1rem',
            fontSize: '0.875rem'
          }}>
            <span>Workspace: <strong>{activeWorkspace?.name}</strong></span>
            <span>·</span>
            <span>Project: <strong>{activeProject.key} · {activeProject.name}</strong></span>
          </div>
        ) : (
          <div style={{ color: 'var(--color-slate-400)', fontSize: '0.875rem' }}>
            Select an active project in the top bar to view scoped data.
          </div>
        )}
      </div>
    </div>
  );
}
