import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FolderGit2,
  Zap,
  Layers,
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
import { listProjectSprints, getSprintReport } from '../api/sprints';
import { getProjectDashboard } from '../api/reports';

export default function ReportsPage() {
  const { activeProject } = useAuth();

  const [sprints, setSprints] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState('');
  const [sprintReport, setSprintReport] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchInitialData = useCallback(async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [spData, dash] = await Promise.all([
        listProjectSprints(activeProject.id),
        getProjectDashboard(activeProject.id),
      ]);
      setSprints(spData);
      setDashboardData(dash);

      // Default to active sprint, or most recently completed sprint
      const active = spData.find((s) => s.status === 'active');
      const completed = spData.filter((s) => s.status === 'completed');
      const defaultId = active ? active.id : completed.length > 0 ? completed[0].id : spData[0]?.id;

      if (defaultId) {
        setSelectedSprintId(String(defaultId));
        const rep = await getSprintReport(defaultId);
        setSprintReport(rep);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleSprintSelect = async (sprintId) => {
    setSelectedSprintId(sprintId);
    if (!sprintId) {
      setSprintReport(null);
      return;
    }
    try {
      const rep = await getSprintReport(sprintId);
      setSprintReport(rep);
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to load sprint report.');
    }
  };

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
            Please select an active project to view agile velocity reports.
          </p>
        </div>
      </div>
    );
  }

  // Velocity data across completed sprints
  const velocityData = sprints
    .filter((s) => s.status === 'completed' || s.status === 'active')
    .slice(-6)
    .map((s) => ({
      name: s.name,
      delivered: s.done_points || 0,
      total: s.total_points || 0,
    }));

  const typeData = sprintReport?.issues_by_type
    ? [
        { name: 'Stories', count: sprintReport.issues_by_type.story || 0, color: '#16A34A' },
        { name: 'Tasks', count: sprintReport.issues_by_type.task || 0, color: '#2563EB' },
        { name: 'Bugs', count: sprintReport.issues_by_type.bug || 0, color: '#DC2626' },
        { name: 'Epics', count: sprintReport.issues_by_type.epic || 0, color: '#9333EA' },
      ]
    : [];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
            Reports & Agile Velocity
          </h1>
          <span className="badge badge-primary" style={{ fontSize: '0.8rem' }}>
            {activeProject.key}
          </span>
        </div>
        <p style={{ color: 'var(--color-slate-600)', fontSize: '0.95rem', margin: 0 }}>
          Track sprint burndown, team throughput velocity, and issue type breakdown.
        </p>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-slate-500)' }}>
          Computing agile reports...
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
          <AlertCircle size={24} style={{ margin: '0 auto 0.5rem' }} />
          <p>{error}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {/* Velocity Trend Chart */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                  Sprint Velocity Trend
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
                  Story points delivered across sprints
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-primary)', borderRadius: '2px' }} />
                  <span>Delivered Points</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-slate-300)', borderRadius: '2px' }} />
                  <span>Total Committed</span>
                </div>
              </div>
            </div>

            {velocityData.length > 0 ? (
              <div style={{ height: '260px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={velocityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="var(--color-slate-200)" radius={[4, 4, 0, 0]} name="Total Committed" />
                    <Bar dataKey="delivered" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Delivered Points" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-slate-400)', fontSize: '0.9rem' }}>
                No sprint velocity data recorded yet. Sprints appear here as they are worked on and completed.
              </div>
            )}
          </div>

          {/* Deep-dive Sprint Report Selector */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                  Sprint Detail Breakdown
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
                  Select an individual sprint to inspect metrics
                </span>
              </div>

              {sprints.length > 0 && (
                <select
                  value={selectedSprintId}
                  onChange={(e) => handleSprintSelect(e.target.value)}
                  className="input"
                  style={{ width: 'auto', minWidth: '200px' }}
                >
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.status})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {sprintReport ? (
              <div>
                {/* 4 Sprint Metrics */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                  }}
                >
                  <div style={{ backgroundColor: 'var(--color-light-gray)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>
                      Velocity Delivered
                    </span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
                      {sprintReport.metrics?.velocity_points || 0} pts
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--color-light-gray)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>
                      Completion Rate
                    </span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16A34A', marginTop: '0.2rem' }}>
                      {sprintReport.metrics?.completion_percentage || 0}%
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--color-light-gray)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>
                      Closed Issues
                    </span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-slate-800)', marginTop: '0.2rem' }}>
                      {sprintReport.metrics?.completed_issues || 0}
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'var(--color-light-gray)', padding: '1rem', borderRadius: 'var(--radius)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>
                      Incomplete Issues
                    </span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#D97706', marginTop: '0.2rem' }}>
                      {sprintReport.metrics?.incomplete_issues || 0}
                    </div>
                  </div>
                </div>

                {/* Issues by Type in Sprint */}
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                  Work Distribution by Type
                </h4>
                <div style={{ height: '200px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={typeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {typeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-slate-400)' }}>
                No sprints available to display.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

