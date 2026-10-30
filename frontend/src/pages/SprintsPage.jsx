import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Plus,
  Play,
  Check,
  Edit2,
  Trash2,
  Calendar,
  AlertCircle,
  FolderGit2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  listProjectSprints,
  getSprintDetail,
  deleteSprint,
} from '../api/sprints';
import SprintFormModal from '../components/SprintFormModal';
import StartSprintModal from '../components/StartSprintModal';
import CompleteSprintModal from '../components/CompleteSprintModal';
import IssueDetailModal from '../components/IssueDetailModal';

export default function SprintsPage() {
  const { activeWorkspace, activeProject } = useAuth();
  const navigate = useNavigate();

  const [sprints, setSprints] = useState([]);
  const [sprintIssuesMap, setSprintIssuesMap] = useState({});
  const [collapsedMap, setCollapsedMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSprint, setEditingSprint] = useState(null);
  const [startingSprint, setStartingSprint] = useState(null);
  const [completingSprint, setCompletingSprint] = useState(null);
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  const currentRole = activeWorkspace?.current_user_role || 'member';
  const canManage = ['admin', 'manager'].includes(currentRole);

  const fetchSprints = useCallback(async () => {
    if (!activeProject?.id) {
      setSprints([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listProjectSprints(activeProject.id);
      setSprints(data);

      const map = {};
      await Promise.all(
        data.map(async (s) => {
          try {
            const detail = await getSprintDetail(s.id);
            map[s.id] = detail.issues || [];
          } catch {
            map[s.id] = [];
          }
        })
      );
      setSprintIssuesMap(map);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load sprints.');
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    fetchSprints();
  }, [fetchSprints]);

  const handleDelete = async (sprint) => {
    if (!window.confirm(`Delete ${sprint.name}? Issues in this sprint will return to the backlog.`)) {
      return;
    }
    try {
      await deleteSprint(sprint.id);
      fetchSprints();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete sprint.');
    }
  };

  const toggleCollapse = (id) => {
    setCollapsedMap((prev) => ({ ...prev, [id]: !prev[id] }));
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
            Please select an active project to view and manage its sprints.
          </p>
        </div>
      </div>
    );
  }

  const activeSprint = sprints.find((s) => s.status === 'active');
  const plannedSprints = sprints.filter((s) => s.status === 'planned');
  const completedSprints = sprints.filter((s) => s.status === 'completed');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
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
              Sprint Management
            </h1>
            <span className="badge badge-primary" style={{ fontSize: '0.8rem' }}>
              {activeProject.key}
            </span>
          </div>
          <p style={{ color: 'var(--color-slate-600)', fontSize: '0.95rem', margin: 0 }}>
            Oversee active, planned, and completed sprints across the project lifecycle.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {canManage && (
            <button
              onClick={() => {
                setEditingSprint(null);
                setShowCreateModal(true);
              }}
              className="btn btn-primary"
            >
              <Plus size={18} /> Create Sprint
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-slate-500)' }}>
          Loading sprints...
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
          <AlertCircle size={24} style={{ margin: '0 auto 0.5rem' }} />
          <p>{error}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Active Sprint Banner */}
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.85rem' }}>
              Active Sprint
            </h2>
            {activeSprint ? (
              <div
                className="card"
                style={{
                  border: '1.5px solid var(--color-primary)',
                  backgroundColor: '#FAFCFF',
                  padding: '1.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="badge badge-primary" style={{ fontWeight: 700 }}>
                      ACTIVE
                    </span>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                      {activeSprint.name}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    {canManage && (
                      <>
                        <button
                          onClick={() => {
                            setEditingSprint(activeSprint);
                            setShowCreateModal(true);
                          }}
                          className="btn btn-ghost"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                        >
                          <Edit2 size={15} /> Edit
                        </button>
                        <button
                          onClick={() => {
                            setCompletingSprint({
                              ...activeSprint,
                              issues: sprintIssuesMap[activeSprint.id] || [],
                            });
                          }}
                          className="btn btn-primary"
                          style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                        >
                          <Check size={16} /> Complete Sprint
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {activeSprint.goal && (
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--color-slate-600)' }}>
                    Goal: <em>"{activeSprint.goal}"</em>
                  </p>
                )}

                {/* Metrics Bar */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid var(--color-slate-200)',
                    borderRadius: 'var(--radius)',
                    padding: '1rem',
                    marginBottom: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    <span>
                      Dates: <strong>{activeSprint.start_date || 'TBD'}</strong> to <strong>{activeSprint.end_date || 'TBD'}</strong>
                    </span>
                    <span>
                      Story Points: <strong>{activeSprint.done_points || 0}</strong> of <strong>{activeSprint.total_points || 0} pts</strong> ({activeSprint.progress_percentage || 0}%)
                    </span>
                  </div>
                  <div style={{ width: '100%', backgroundColor: 'var(--color-slate-200)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(activeSprint.progress_percentage || 0, 100)}%`,
                        backgroundColor: 'var(--color-primary)',
                        height: '100%',
                      }}
                    />
                  </div>
                </div>

                {/* Issues in active sprint */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {(sprintIssuesMap[activeSprint.id] || []).map((issue) => (
                    <div
                      key={issue.id}
                      onClick={() => setSelectedIssueId(issue.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid var(--color-slate-200)',
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-primary)' }}>
                          {issue.key}
                        </span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--color-slate-800)' }}>
                          {issue.title}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        {issue.story_points != null && (
                          <span className="badge" style={{ fontSize: '0.75rem' }}>
                            {issue.story_points} pts
                          </span>
                        )}
                        <span className="badge" style={{ fontSize: '0.75rem' }}>
                          {issue.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-slate-500)' }}>
                <Zap size={32} style={{ margin: '0 auto 0.5rem', color: 'var(--color-slate-400)' }} />
                <p style={{ margin: 0, fontWeight: 600 }}>No Active Sprint</p>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-400)' }}>
                  Start one of your planned sprints below to initiate active workflow tracking.
                </span>
              </div>
            )}
          </div>

          {/* Planned Sprints */}
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.85rem' }}>
              Planned Sprints ({plannedSprints.length})
            </h2>

            {plannedSprints.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {plannedSprints.map((ps) => (
                  <div key={ps.id} className="card" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <button
                          onClick={() => toggleCollapse(ps.id)}
                          className="btn btn-ghost"
                          style={{ padding: '0.2rem' }}
                        >
                          {collapsedMap[ps.id] ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                        </button>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                          {ps.name}
                        </h3>
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>
                          • {ps.start_date || 'TBD'} to {ps.end_date || 'TBD'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span className="badge" style={{ fontWeight: 600 }}>
                          {ps.total_points || 0} story pts
                        </span>

                        {canManage && (
                          <>
                            <button
                              onClick={() => {
                                setEditingSprint(ps);
                                setShowCreateModal(true);
                              }}
                              className="btn btn-ghost"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                            <button
                              onClick={() => setStartingSprint(ps)}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem' }}
                            >
                              <Play size={14} /> Start Sprint
                            </button>
                            <button
                              onClick={() => handleDelete(ps)}
                              className="btn btn-ghost"
                              title="Delete sprint"
                              style={{ padding: '0.35rem', color: 'var(--color-danger)' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {ps.goal && (
                      <p style={{ margin: '0 0 0.75rem 2rem', fontSize: '0.85rem', color: 'var(--color-slate-600)' }}>
                        Goal: <em>"{ps.goal}"</em>
                      </p>
                    )}

                    {!collapsedMap[ps.id] && (
                      <div style={{ marginLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {(sprintIssuesMap[ps.id] || []).length > 0 ? (
                          (sprintIssuesMap[ps.id] || []).map((issue) => (
                            <div
                              key={issue.id}
                              onClick={() => setSelectedIssueId(issue.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '0.65rem 0.85rem',
                                backgroundColor: 'var(--color-light-gray)',
                                borderRadius: 'var(--radius)',
                                cursor: 'pointer',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-primary)' }}>
                                  {issue.key}
                                </span>
                                <span style={{ fontSize: '0.9rem', color: 'var(--color-slate-800)' }}>
                                  {issue.title}
                                </span>
                              </div>
                              <span className="badge" style={{ fontSize: '0.75rem' }}>
                                {issue.story_points != null ? `${issue.story_points} pts` : '-'}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-400)' }}>
                            No issues assigned to this sprint yet.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-slate-400)', fontSize: '0.9rem' }}>
                No planned sprints. Click "+ Create Sprint" above to set up future iterations.
              </div>
            )}
          </div>

          {/* Completed Sprints History */}
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.85rem' }}>
              Completed Sprints ({completedSprints.length})
            </h2>

            {completedSprints.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {completedSprints.map((cs) => (
                  <div
                    key={cs.id}
                    className="card"
                    style={{
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckCircle2 size={18} style={{ color: '#16A34A' }} />
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                          {cs.name}
                        </h4>
                        <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>
                          COMPLETED
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginLeft: '1.65rem' }}>
                        {cs.start_date || 'Start'} to {cs.end_date || 'End'}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-slate-800)' }}>
                        {cs.done_points || 0} pts delivered
                      </span>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                        {cs.issue_count || 0} issues closed
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-slate-400)', fontSize: '0.9rem' }}>
                No sprints completed yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sprint Form Modal (Create or Edit) */}
      {showCreateModal && (
        <SprintFormModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingSprint(null);
          }}
          onSuccess={() => fetchSprints()}
          projectId={activeProject.id}
          initialData={editingSprint}
        />
      )}

      {/* Start Sprint Modal */}
      {startingSprint && (
        <StartSprintModal
          isOpen={Boolean(startingSprint)}
          onClose={() => setStartingSprint(null)}
          onSuccess={() => fetchSprints()}
          sprint={startingSprint}
        />
      )}

      {/* Complete Sprint Modal */}
      {completingSprint && (
        <CompleteSprintModal
          isOpen={Boolean(completingSprint)}
          onClose={() => setCompletingSprint(null)}
          onSuccess={() => fetchSprints()}
          sprint={completingSprint}
          plannedSprints={plannedSprints}
        />
      )}

      {/* Issue Detail Modal */}
      {selectedIssueId && (
        <IssueDetailModal
          isOpen={Boolean(selectedIssueId)}
          onClose={() => setSelectedIssueId(null)}
          issueId={selectedIssueId}
          onIssueUpdated={() => fetchSprints()}
          onIssueDeleted={() => {
            setSelectedIssueId(null);
            fetchSprints();
          }}
        />
      )}
    </div>
  );
}

