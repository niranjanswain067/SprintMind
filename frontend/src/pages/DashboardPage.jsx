import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderGit2,
  Zap,
  Layers,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Calendar,
  User,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { getProjectDashboard } from '../api/reports';
import IssueDetailModal from '../components/IssueDetailModal';

export default function DashboardPage() {
  const { activeWorkspace, activeProject } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  const fetchDashboard = useCallback(async () => {
    if (!activeProject?.id) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getProjectDashboard(activeProject.id);
      setData(res);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (!activeProject) {
    return (
      <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="card" style={{ padding: '3.5rem 2rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius)',
              background: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <FolderGit2 size={28} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>No Active Project Selected</h2>
          <p style={{ color: 'var(--color-slate-600)', fontSize: '0.95rem' }}>
            Please select an active project in the top navigation bar to view its live metrics.
          </p>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    total_issues: 0,
    in_progress: 0,
    done: 0,
    overdue: 0,
    completion_percentage: 0,
  };

  const activeSprint = data?.active_sprint;

  // Prepare chart data for status
  const statusChartData = [
    { name: 'To Do', count: data?.issues_by_status?.todo || 0, color: '#64748B' },
    { name: 'In Progress', count: data?.issues_by_status?.in_progress || 0, color: '#2563EB' },
    { name: 'In Review', count: data?.issues_by_status?.in_review || 0, color: '#D97706' },
    { name: 'Done', count: data?.issues_by_status?.done || 0, color: '#16A34A' },
  ];

  // Prepare chart data for priority
  const priorityChartData = [
    { name: 'Low', count: data?.issues_by_priority?.low || 0, color: '#64748B' },
    { name: 'Medium', count: data?.issues_by_priority?.medium || 0, color: '#2563EB' },
    { name: 'High', count: data?.issues_by_priority?.high || 0, color: '#D97706' },
    { name: 'Critical', count: data?.issues_by_priority?.critical || 0, color: '#DC2626' },
  ];

  const priorityColors = {
    low: { bg: '#F1F5F9', color: '#475569' },
    medium: { bg: '#EFF6FF', color: '#2563EB' },
    high: { bg: '#FEF3C7', color: '#D97706' },
    critical: { bg: '#FEE2E2', color: '#DC2626' },
  };

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              Project Dashboard
            </h1>
            <span className="badge badge-primary" style={{ fontSize: '0.8rem' }}>
              {activeProject.key}
            </span>
            <span className="badge" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>
              {activeProject.methodology}
            </span>
          </div>
          <p style={{ color: 'var(--color-slate-600)', fontSize: '0.95rem', margin: 0 }}>
            Live SQL-computed metrics, sprint velocity progress, and health analytics.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={() => navigate('/board')}
            className="btn btn-secondary"
          >
            Go to Board <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-slate-500)' }}>
          Computing metrics...
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
          <AlertCircle size={24} style={{ margin: '0 auto 0.5rem' }} />
          <p>{error}</p>
        </div>
      ) : (
        <>
          {/* 4 Primary KPI Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1.25rem',
              marginBottom: '1.75rem',
            }}
          >
            {/* Total Issues */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-slate-500)' }}>
                  Total Issues
                </span>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius)',
                    backgroundColor: 'var(--color-light-gray)',
                    color: 'var(--color-slate-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Layers size={18} />
                </div>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
                {metrics.total_issues}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
                Across all methodology stages
              </span>
            </div>

            {/* In Progress */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: '#2563EB' }}>
                  In Progress
                </span>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius)',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Clock size={18} />
                </div>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1D4ED8' }}>
                {metrics.in_progress}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#3B82F6' }}>
                Active developmental items
              </span>
            </div>

            {/* Completed */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: '#16A34A' }}>
                  Completed
                </span>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius)',
                    backgroundColor: '#F0FDF4',
                    color: '#16A34A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#15803D' }}>
                {metrics.done}
              </div>
              <span style={{ fontSize: '0.8rem', color: '#16A34A', fontWeight: 600 }}>
                {metrics.completion_percentage}% completion rate
              </span>
            </div>

            {/* Overdue */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: metrics.overdue > 0 ? '#DC2626' : 'var(--color-slate-500)',
                  }}
                >
                  Overdue
                </span>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius)',
                    backgroundColor: metrics.overdue > 0 ? '#FEE2E2' : 'var(--color-light-gray)',
                    color: metrics.overdue > 0 ? '#DC2626' : 'var(--color-slate-500)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertTriangle size={18} />
                </div>
              </div>
              <div
                style={{
                  fontSize: '1.85rem',
                  fontWeight: 800,
                  color: metrics.overdue > 0 ? '#B91C1C' : 'var(--color-slate-800)',
                }}
              >
                {metrics.overdue}
              </div>
              <span style={{ fontSize: '0.8rem', color: metrics.overdue > 0 ? '#DC2626' : 'var(--color-slate-500)' }}>
                {metrics.overdue > 0 ? 'Requires team attention' : 'All items on track'}
              </span>
            </div>
          </div>

          {/* Active Sprint Section (if Scrum or active sprint exists) */}
          {activeSprint && (
            <div
              className="card"
              style={{
                padding: '1.5rem',
                marginBottom: '1.75rem',
                backgroundColor: '#FAFCFF',
                border: '1.5px solid var(--color-primary)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1rem',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius)',
                      backgroundColor: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Zap size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>
                        {activeSprint.name}
                      </h3>
                      <span className="badge badge-primary">ACTIVE</span>
                    </div>
                    {activeSprint.goal && (
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-slate-600)' }}>
                        Goal: {activeSprint.goal}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                    {activeSprint.done_points} / {activeSprint.total_points} pts
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
                    {activeSprint.start_date || 'Start'} to {activeSprint.end_date || 'End'}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', backgroundColor: 'var(--color-slate-200)', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(activeSprint.progress_percentage || 0, 100)}%`,
                    backgroundColor: 'var(--color-primary)',
                    height: '100%',
                    borderRadius: '5px',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.775rem', color: 'var(--color-slate-500)' }}>
                <span>Sprint Velocity Progress</span>
                <strong>{activeSprint.progress_percentage}% completed</strong>
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem',
              marginBottom: '1.75rem',
            }}
          >
            {/* Chart 1: Issues by Status */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
                Issues by Status
              </h3>
              <div style={{ height: '240px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Issues by Priority */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
                Issues by Priority
              </h3>
              <div style={{ height: '240px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {priorityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Overdue Issues List */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                  Overdue Issues
                </h3>
                {metrics.overdue > 0 && (
                  <span className="badge" style={{ backgroundColor: '#FEE2E2', color: '#DC2626', fontWeight: 700 }}>
                    {metrics.overdue}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-400)' }}>
                Click any row to open issue details
              </span>
            </div>

            {data?.overdue_issues && data.overdue_issues.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}
              >
                {data.overdue_issues.map((item) => {
                  const pColor = priorityColors[item.priority] || priorityColors.medium;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedIssueId(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.75rem 1rem',
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FCA5A5',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#B91C1C' }}>
                          {item.key}
                        </span>
                        <span
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 500,
                            color: 'var(--color-slate-900)',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.title}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.45rem',
                            borderRadius: 'var(--radius)',
                            backgroundColor: pColor.bg,
                            color: pColor.color,
                            textTransform: 'capitalize',
                          }}
                        >
                          {item.priority}
                        </span>

                        <span style={{ fontSize: '0.8rem', color: '#B91C1C', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={14} /> Due: {item.due_date}
                        </span>

                        {item.assignee_name ? (
                          <div
                            title={item.assignee_name}
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--color-primary)',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            {item.assignee_initials || item.assignee_name[0]}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>
                            Unassigned
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-slate-500)', fontSize: '0.9rem' }}>
                <CheckCircle2 size={32} style={{ color: '#16A34A', margin: '0 auto 0.5rem' }} />
                <p style={{ margin: 0, fontWeight: 600 }}>All issues are on track!</p>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-400)' }}>
                  No overdue items in this project.
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Issue Detail Modal */}
      {selectedIssueId && (
        <IssueDetailModal
          isOpen={Boolean(selectedIssueId)}
          onClose={() => setSelectedIssueId(null)}
          issueId={selectedIssueId}
          onIssueUpdated={() => fetchDashboard()}
          onIssueDeleted={() => {
            setSelectedIssueId(null);
            fetchDashboard();
          }}
        />
      )}
    </div>
  );
}

