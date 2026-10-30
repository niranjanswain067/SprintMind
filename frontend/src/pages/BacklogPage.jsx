import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  GripVertical,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpDown,
  Building2,
  FolderGit2,
  Zap,
  Play,
  Check,
  ChevronDown,
  ChevronRight,
  Trash2,
  Edit2,
  ArrowRight,
  MinusCircle,
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useAuth } from '../context/AuthContext';
import { listBacklog, reorderBacklog } from '../api/issues';
import {
  listProjectSprints,
  getSprintDetail,
  deleteSprint,
  addIssuesToSprint,
  removeIssueFromSprint,
} from '../api/sprints';
import { listWorkspaceMembers } from '../api/workspaces';
import IssueFormModal from '../components/IssueFormModal';
import IssueDetailModal from '../components/IssueDetailModal';
import SprintFormModal from '../components/SprintFormModal';
import StartSprintModal from '../components/StartSprintModal';
import CompleteSprintModal from '../components/CompleteSprintModal';
import AIStoriesModal from '../components/AIStoriesModal';

export default function BacklogPage() {
  const { activeWorkspace, activeProject } = useAuth();

  const [issues, setIssues] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [sprintIssuesMap, setSprintIssuesMap] = useState({});
  const [collapsedSprints, setCollapsedSprints] = useState({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  // Modals state
  const [showCreateIssueModal, setShowCreateIssueModal] = useState(false);
  const [showAIStoriesModal, setShowAIStoriesModal] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [members, setMembers] = useState([]);

  // Sprint modals
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [editingSprint, setEditingSprint] = useState(null);
  const [startingSprint, setStartingSprint] = useState(null);
  const [completingSprint, setCompletingSprint] = useState(null);

  const currentRole = activeWorkspace?.current_user_role || 'member';
  const canEdit = ['admin', 'manager', 'developer'].includes(currentRole);
  const canManage = ['admin', 'manager'].includes(currentRole);

  const fetchBacklogIssues = useCallback(async () => {
    if (!activeProject?.id) {
      setIssues([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchTerm.trim()) params.q = searchTerm.trim();
      if (typeFilter) params.type = typeFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (assigneeFilter) params.assignee = assigneeFilter;

      const data = await listBacklog(activeProject.id, params);
      setIssues(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load backlog issues.');
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id, searchTerm, typeFilter, priorityFilter, assigneeFilter]);

  const fetchSprintsData = useCallback(async () => {
    if (!activeProject?.id) {
      setSprints([]);
      return;
    }
    try {
      const spData = await listProjectSprints(activeProject.id);
      setSprints(spData);

      // Fetch issues for each active and planned sprint
      const map = {};
      await Promise.all(
        spData
          .filter((s) => s.status !== 'completed')
          .map(async (s) => {
            try {
              const detail = await getSprintDetail(s.id);
              map[s.id] = detail.issues || [];
            } catch {
              map[s.id] = [];
            }
          })
      );
      setSprintIssuesMap(map);
    } catch {
      setSprints([]);
    }
  }, [activeProject?.id]);

  const refreshAll = useCallback(() => {
    fetchBacklogIssues();
    fetchSprintsData();
  }, [fetchBacklogIssues, fetchSprintsData]);

  useEffect(() => {
    fetchBacklogIssues();
  }, [fetchBacklogIssues]);

  useEffect(() => {
    fetchSprintsData();
  }, [fetchSprintsData]);

  useEffect(() => {
    if (activeWorkspace?.id) {
      listWorkspaceMembers(activeWorkspace.id)
        .then(setMembers)
        .catch(() => {});
    }
  }, [activeWorkspace?.id]);

  const handleDragEnd = async (result) => {
    if (!result.destination || !canEdit) return;
    const { source, destination } = result;
    if (source.index === destination.index) return;

    // Reorder local state optimistically
    const reordered = Array.from(issues);
    const [movedItem] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, movedItem);
    setIssues(reordered);

    const prevIssue = destination.index > 0 ? reordered[destination.index - 1] : null;
    const nextIssue = destination.index < reordered.length - 1 ? reordered[destination.index + 1] : null;

    try {
      await reorderBacklog(activeProject.id, {
        issue_id: movedItem.id,
        prev_issue_id: prevIssue?.id || null,
        next_issue_id: nextIssue?.id || null,
      });
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to persist rank ordering.');
      fetchBacklogIssues();
    }
  };

  const handleAssignToSprint = async (issueId, sprintId) => {
    if (!canEdit) return;
    try {
      await addIssuesToSprint(sprintId, [issueId]);
      refreshAll();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to add issue to sprint.');
    }
  };

  const handleRemoveFromSprint = async (sprintId, issueId) => {
    if (!canEdit) return;
    try {
      await removeIssueFromSprint(sprintId, issueId);
      refreshAll();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to move issue to backlog.');
    }
  };

  const handleDeleteSprint = async (sprint) => {
    if (!window.confirm(`Are you sure you want to delete ${sprint.name}? Any assigned issues will return to the backlog.`)) {
      return;
    }
    try {
      await deleteSprint(sprint.id);
      refreshAll();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to delete sprint.');
    }
  };

  const toggleSprintCollapse = (sprintId) => {
    setCollapsedSprints((prev) => ({
      ...prev,
      [sprintId]: !prev[sprintId],
    }));
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

  const statusLabels = {
    todo: 'To Do',
    in_progress: 'In Progress',
    in_review: 'In Review',
    done: 'Done',
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
            Please select an active project in the top navigation bar to manage its backlog and sprints.
          </p>
        </div>
      </div>
    );
  }

  const activeSprint = sprints.find((s) => s.status === 'active');
  const plannedSprints = sprints.filter((s) => s.status === 'planned');

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              Backlog & Sprints
            </h1>
            <span className="badge badge-primary" style={{ fontSize: '0.8rem' }}>
              {activeProject.key}
            </span>
            <span className="badge" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>
              {activeProject.methodology}
            </span>
          </div>
          <p style={{ color: 'var(--color-slate-600)', fontSize: '0.95rem', margin: 0 }}>
            Plan sprints, assign deliverables, and prioritize backlog work items.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {canManage && activeProject.methodology === 'scrum' && (
            <button
              onClick={() => {
                setEditingSprint(null);
                setShowSprintModal(true);
              }}
              className="btn btn-secondary"
            >
              <Zap size={16} /> Create Sprint
            </button>
          )}

          {canEdit && (
            <>
              <button
                onClick={() => setShowAIStoriesModal(true)}
                className="btn btn-secondary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  borderColor: 'var(--color-primary)',
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                }}
              >
                <Sparkles size={16} /> AI: Create Stories
              </button>
              <button
                onClick={() => setShowCreateIssueModal(true)}
                className="btn btn-primary"
              >
                <Plus size={18} /> Create Issue
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-slate-400)',
            }}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search backlog issues..."
            className="input"
            style={{ paddingLeft: '2.4rem' }}
          />
        </div>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input"
          style={{ width: 'auto' }}
        >
          <option value="">All Types</option>
          <option value="epic">🟣 Epic</option>
          <option value="story">🟢 Story</option>
          <option value="task">🔵 Task</option>
          <option value="bug">🔴 Bug</option>
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="input"
          style={{ width: 'auto' }}
        >
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Assignee Filter */}
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="input"
          style={{ width: 'auto' }}
        >
          <option value="">All Assignees</option>
          {members.map((m) => (
            <option key={m.user.id} value={m.user.id}>
              {m.user.name}
            </option>
          ))}
        </select>

        {(searchTerm || typeFilter || priorityFilter || assigneeFilter) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setTypeFilter('');
              setPriorityFilter('');
              setAssigneeFilter('');
            }}
            className="btn btn-ghost"
            style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* SPRINT CONTAINERS (For Scrum projects) */}
      {activeProject.methodology === 'scrum' && (
        <div style={{ marginBottom: '2.5rem' }}>
          {/* Active Sprint Section */}
          {activeSprint && (
            <div
              className="card"
              style={{
                marginBottom: '1.25rem',
                border: '1.5px solid var(--color-primary)',
                backgroundColor: '#FAFCFF',
                padding: '1.25rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <button
                    onClick={() => toggleSprintCollapse(activeSprint.id)}
                    className="btn btn-ghost"
                    style={{ padding: '0.2rem' }}
                  >
                    {collapsedSprints[activeSprint.id] ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                  </button>
                  <span className="badge badge-primary" style={{ fontWeight: 700 }}>
                    ACTIVE SPRINT
                  </span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                    {activeSprint.name}
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>
                    • {activeSprint.start_date || 'No start'} to {activeSprint.end_date || 'No end'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="badge" style={{ fontWeight: 600 }}>
                    {activeSprint.done_points || 0} / {activeSprint.total_points || 0} pts ({activeSprint.progress_percentage || 0}%)
                  </span>

                  {canManage && (
                    <>
                      <button
                        onClick={() => {
                          setEditingSprint(activeSprint);
                          setShowSprintModal(true);
                        }}
                        className="btn btn-ghost"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                      <button
                        onClick={() => {
                          setCompletingSprint({
                            ...activeSprint,
                            issues: sprintIssuesMap[activeSprint.id] || [],
                          });
                        }}
                        className="btn btn-primary"
                        style={{ padding: '0.35rem 0.85rem', fontSize: '0.85rem' }}
                      >
                        <Check size={16} /> Complete Sprint
                      </button>
                    </>
                  )}
                </div>
              </div>

              {activeSprint.goal && (
                <p style={{ margin: '0 0 1rem 2rem', fontSize: '0.875rem', color: 'var(--color-slate-600)' }}>
                  Goal: <em>"{activeSprint.goal}"</em>
                </p>
              )}

              {/* Sprint Issue List */}
              {!collapsedSprints[activeSprint.id] && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginLeft: '2rem' }}>
                  {(sprintIssuesMap[activeSprint.id] || []).length > 0 ? (
                    (sprintIssuesMap[activeSprint.id] || []).map((issue) => (
                      <div
                        key={issue.id}
                        onClick={() => setSelectedIssueId(issue.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--color-slate-200)',
                          borderRadius: 'var(--radius)',
                          padding: '0.65rem 0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '1rem', marginRight: '0.65rem' }}>
                          {typeConfig[issue.type]?.icon || '🔵'}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-primary)', minWidth: '70px' }}>
                          {issue.key}
                        </span>
                        <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--color-slate-800)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {issue.title}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          {issue.story_points != null && (
                            <span className="badge" style={{ fontSize: '0.75rem' }}>
                              {issue.story_points} pts
                            </span>
                          )}
                          <span className="badge" style={{ fontSize: '0.75rem' }}>
                            {statusLabels[issue.status] || issue.status}
                          </span>
                          {canEdit && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFromSprint(activeSprint.id, issue.id);
                              }}
                              className="btn btn-ghost"
                              title="Move to Backlog"
                              style={{ padding: '0.2rem', color: 'var(--color-slate-400)' }}
                            >
                              <MinusCircle size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-slate-400)', fontSize: '0.875rem' }}>
                      No issues in this sprint. Move issues from the backlog below into this sprint.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Planned Sprints */}
          {plannedSprints.map((ps) => (
            <div
              key={ps.id}
              className="card"
              style={{
                marginBottom: '1rem',
                border: '1px solid var(--color-slate-200)',
                padding: '1.25rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <button
                    onClick={() => toggleSprintCollapse(ps.id)}
                    className="btn btn-ghost"
                    style={{ padding: '0.2rem' }}
                  >
                    {collapsedSprints[ps.id] ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                  </button>
                  <span className="badge" style={{ fontWeight: 600 }}>
                    PLANNED
                  </span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                    {ps.name}
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>
                    • {ps.start_date || 'TBD'} to {ps.end_date || 'TBD'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="badge" style={{ fontWeight: 600 }}>
                    {ps.total_points || 0} story pts
                  </span>

                  {canManage && (
                    <>
                      <button
                        onClick={() => {
                          setEditingSprint(ps);
                          setShowSprintModal(true);
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
                        <Play size={15} /> Start Sprint
                      </button>
                      <button
                        onClick={() => handleDeleteSprint(ps)}
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
                <p style={{ margin: '0 0 0.85rem 2rem', fontSize: '0.85rem', color: 'var(--color-slate-600)' }}>
                  Goal: <em>"{ps.goal}"</em>
                </p>
              )}

              {/* Planned Sprint Issues List */}
              {!collapsedSprints[ps.id] && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginLeft: '2rem' }}>
                  {(sprintIssuesMap[ps.id] || []).length > 0 ? (
                    (sprintIssuesMap[ps.id] || []).map((issue) => (
                      <div
                        key={issue.id}
                        onClick={() => setSelectedIssueId(issue.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--color-slate-200)',
                          borderRadius: 'var(--radius)',
                          padding: '0.65rem 0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '1rem', marginRight: '0.65rem' }}>
                          {typeConfig[issue.type]?.icon || '🔵'}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-primary)', minWidth: '70px' }}>
                          {issue.key}
                        </span>
                        <span style={{ flex: 1, fontSize: '0.9rem', color: 'var(--color-slate-800)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {issue.title}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          {issue.story_points != null && (
                            <span className="badge" style={{ fontSize: '0.75rem' }}>
                              {issue.story_points} pts
                            </span>
                          )}
                          <span className="badge" style={{ fontSize: '0.75rem' }}>
                            {statusLabels[issue.status] || issue.status}
                          </span>
                          {canEdit && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveFromSprint(ps.id, issue.id);
                              }}
                              className="btn btn-ghost"
                              title="Move to Backlog"
                              style={{ padding: '0.2rem', color: 'var(--color-slate-400)' }}
                            >
                              <MinusCircle size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-slate-400)', fontSize: '0.85rem' }}>
                      No issues planned for this sprint yet.
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* UNASSIGNED BACKLOG SECTION */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
          padding: '0 0.25rem',
        }}
      >
        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-slate-800)' }}>
          Backlog ({issues.length} {issues.length === 1 ? 'issue' : 'issues'})
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-400)' }}>
          Drag handles to prioritize order
        </span>
      </div>

      {/* Backlog List with Drag and Drop */}
      {loading ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-slate-500)' }}>
          Loading backlog...
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
          <AlertCircle size={24} style={{ margin: '0 auto 0.5rem' }} />
          <p>{error}</p>
        </div>
      ) : issues.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius)',
              background: 'var(--color-light-gray)',
              color: 'var(--color-slate-400)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <CheckCircle2 size={24} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.25rem' }}>Backlog is Empty</h3>
          <p style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            {searchTerm || typeFilter || priorityFilter || assigneeFilter
              ? 'No issues match the active filters.'
              : 'Add your first story, task, or bug to the backlog to begin planning.'}
          </p>
          {canEdit && (
            <button onClick={() => setShowCreateIssueModal(true)} className="btn btn-primary" style={{ margin: '0 auto' }}>
              <Plus size={16} /> Create Issue
            </button>
          )}
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="backlog-items">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                {issues.map((item, index) => {
                  const pColor = priorityColors[item.priority] || priorityColors.medium;
                  return (
                    <Draggable
                      key={item.id}
                      draggableId={String(item.id)}
                      index={index}
                      isDragDisabled={!canEdit}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          onClick={() => setSelectedIssueId(item.id)}
                          style={{
                            ...provided.draggableProps.style,
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: snapshot.isDragging ? '#F0F9FF' : '#FFFFFF',
                            borderRadius: 'var(--radius)',
                            border: snapshot.isDragging
                              ? '1px solid var(--color-primary)'
                              : '1px solid var(--color-slate-200)',
                            padding: '0.75rem 1rem',
                            cursor: 'pointer',
                            boxShadow: snapshot.isDragging ? 'var(--shadow-md)' : 'none',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {/* Drag handle */}
                          <div
                            {...provided.dragHandleProps}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              marginRight: '0.75rem',
                              color: 'var(--color-slate-400)',
                              cursor: canEdit ? 'grab' : 'default',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <GripVertical size={18} />
                          </div>

                          {/* Type icon */}
                          <span style={{ fontSize: '1rem', marginRight: '0.65rem' }}>
                            {typeConfig[item.type]?.icon || '🔵'}
                          </span>

                          {/* Issue Key */}
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              color: 'var(--color-primary)',
                              minWidth: '70px',
                            }}
                          >
                            {item.key}
                          </span>

                          {/* Issue Title */}
                          <div style={{ flex: 1, minWidth: 0, paddingRight: '1rem' }}>
                            <span
                              style={{
                                fontSize: '0.925rem',
                                fontWeight: 500,
                                color: 'var(--color-slate-900)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'block',
                              }}
                            >
                              {item.title}
                            </span>
                          </div>

                          {/* Meta items: priority, points, status, assignee */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {/* Priority Badge */}
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                textTransform: 'capitalize',
                                padding: '0.2rem 0.5rem',
                                borderRadius: 'var(--radius)',
                                backgroundColor: pColor.bg,
                                color: pColor.color,
                              }}
                            >
                              {item.priority}
                            </span>

                            {/* Story points */}
                            {item.story_points != null && (
                              <span
                                className="badge"
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                }}
                              >
                                {item.story_points} pts
                              </span>
                            )}

                            {/* Status */}
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'var(--color-slate-600)',
                                backgroundColor: 'var(--color-light-gray)',
                                padding: '0.2rem 0.55rem',
                                borderRadius: 'var(--radius)',
                              }}
                            >
                              {statusLabels[item.status] || item.status}
                            </span>

                            {/* Assignee Avatar */}
                            {item.assignee ? (
                              <div
                                title={item.assignee.name}
                                style={{
                                  width: '28px',
                                  height: '28px',
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
                                {item.assignee.initials || item.assignee.name[0]}
                              </div>
                            ) : (
                              <div
                                title="Unassigned"
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  border: '1px dashed var(--color-slate-300)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--color-slate-400)',
                                  fontSize: '0.75rem',
                                }}
                              >
                                -
                              </div>
                            )}

                            {/* Quick action: Send to sprint (if sprints exist) */}
                            {canEdit && sprints.filter((s) => s.status !== 'completed').length > 0 && (
                              <select
                                defaultValue=""
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  if (e.target.value) {
                                    handleAssignToSprint(item.id, parseInt(e.target.value, 10));
                                    e.target.value = '';
                                  }
                                }}
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '0.2rem 0.4rem',
                                  borderRadius: 'var(--radius)',
                                  border: '1px solid var(--color-slate-300)',
                                  backgroundColor: '#FFFFFF',
                                  cursor: 'pointer',
                                }}
                              >
                                <option value="" disabled>
                                  + Move to sprint
                                </option>
                                {sprints
                                  .filter((s) => s.status !== 'completed')
                                  .map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.name} ({s.status})
                                    </option>
                                  ))}
                              </select>
                            )}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Issue Creation Modal */}
      {showCreateIssueModal && (
        <IssueFormModal
          isOpen={showCreateIssueModal}
          onClose={() => setShowCreateIssueModal(false)}
          onSuccess={() => refreshAll()}
          projectId={activeProject.id}
        />
      )}

      {/* AI Stories Modal */}
      {showAIStoriesModal && (
        <AIStoriesModal
          isOpen={showAIStoriesModal}
          onClose={() => setShowAIStoriesModal(false)}
          onSuccess={() => refreshAll()}
          projectId={activeProject.id}
        />
      )}

      {/* Issue Detail Modal */}
      {selectedIssueId && (
        <IssueDetailModal
          isOpen={Boolean(selectedIssueId)}
          onClose={() => setSelectedIssueId(null)}
          issueId={selectedIssueId}
          onIssueUpdated={() => refreshAll()}
          onIssueDeleted={() => {
            setSelectedIssueId(null);
            refreshAll();
          }}
        />
      )}

      {/* Sprint Form Modal (Create or Edit) */}
      {showSprintModal && (
        <SprintFormModal
          isOpen={showSprintModal}
          onClose={() => {
            setShowSprintModal(false);
            setEditingSprint(null);
          }}
          onSuccess={() => refreshAll()}
          projectId={activeProject.id}
          initialData={editingSprint}
        />
      )}

      {/* Start Sprint Modal */}
      {startingSprint && (
        <StartSprintModal
          isOpen={Boolean(startingSprint)}
          onClose={() => setStartingSprint(null)}
          onSuccess={() => refreshAll()}
          sprint={startingSprint}
        />
      )}

      {/* Complete Sprint Modal */}
      {completingSprint && (
        <CompleteSprintModal
          isOpen={Boolean(completingSprint)}
          onClose={() => setCompletingSprint(null)}
          onSuccess={() => refreshAll()}
          sprint={completingSprint}
          plannedSprints={plannedSprints}
        />
      )}
    </div>
  );
}
