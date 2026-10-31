import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Kanban,
  Plus,
  Search,
  Filter,
  User,
  AlertCircle,
  FolderGit2,
  Zap,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { DragDropContext, Draggable } from '@hello-pangea/dnd';
import StrictModeDroppable from '../components/StrictModeDroppable';
import { useAuth } from '../context/AuthContext';
import { getProjectBoard } from '../api/reports';
import { moveIssue } from '../api/issues';
import IssueFormModal from '../components/IssueFormModal';
import IssueDetailModal from '../components/IssueDetailModal';

export default function BoardPage() {
  const { user, activeWorkspace, activeProject } = useAuth();
  const navigate = useNavigate();

  const [boardData, setBoardData] = useState(null);
  const [columns, setColumns] = useState({
    todo: [],
    in_progress: [],
    in_review: [],
    done: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyMyIssues, setOnlyMyIssues] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDefaultStatus, setCreateDefaultStatus] = useState('todo');
  const [selectedIssueId, setSelectedIssueId] = useState(null);

  const currentRole = activeWorkspace?.current_user_role || 'member';
  const canEdit = ['admin', 'manager', 'developer'].includes(currentRole);

  const columnConfig = [
    { id: 'todo', title: 'To Do', color: '#64748B', bg: '#F8FAFC' },
    { id: 'in_progress', title: 'In Progress', color: '#2563EB', bg: '#EFF6FF' },
    { id: 'in_review', title: 'In Review', color: '#D97706', bg: '#FFFBEB' },
    { id: 'done', title: 'Done', color: '#16A34A', bg: '#F0FDF4' },
  ];

  const fetchBoard = useCallback(async () => {
    if (!activeProject?.id) {
      setBoardData(null);
      setColumns({ todo: [], in_progress: [], in_review: [], done: [] });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchTerm.trim()) params.q = searchTerm.trim();
      if (typeFilter) params.type = typeFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (onlyMyIssues && user?.id) params.assignee = user.id;

      const data = await getProjectBoard(activeProject.id, params);
      setBoardData(data);
      setColumns(data.columns || { todo: [], in_progress: [], in_review: [], done: [] });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load board issues.');
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id, searchTerm, typeFilter, priorityFilter, onlyMyIssues, user?.id]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || !canEdit) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;

    const sourceItems = Array.from(columns[sourceColId]);
    const destItems = sourceColId === destColId ? sourceItems : Array.from(columns[destColId]);

    const [movedItem] = sourceItems.splice(source.index, 1);
    const updatedMovedItem = { ...movedItem, status: destColId };
    destItems.splice(destination.index, 0, updatedMovedItem);

    // Compute optimistic new rank
    let newRank;
    const prevItem = destination.index > 0 ? destItems[destination.index - 1] : null;
    const nextItem = destination.index < destItems.length - 1 ? destItems[destination.index + 1] : null;

    if (prevItem && nextItem) {
      newRank = (parseFloat(prevItem.rank) + parseFloat(nextItem.rank)) / 2.0;
    } else if (prevItem) {
      newRank = parseFloat(prevItem.rank) + 1000.0;
    } else if (nextItem) {
      newRank = parseFloat(nextItem.rank) / 2.0;
    } else {
      newRank = 1000.0;
    }

    updatedMovedItem.rank = newRank;

    // Optimistically update columns
    const nextColumns = {
      ...columns,
      [sourceColId]: sourceItems,
      [destColId]: destItems,
    };
    setColumns(nextColumns);

    // Send update to backend
    try {
      await moveIssue(movedItem.id, {
        status: destColId,
        rank: newRank,
      });
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to move issue.');
      fetchBoard();
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
            Please select an active project in the top navigation bar to access its Kanban board.
          </p>
        </div>
      </div>
    );
  }

  const isScrum = activeProject.methodology === 'scrum';
  const activeSprint = boardData?.active_sprint;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Board Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              Kanban Board
            </h1>
            <span className="badge badge-primary" style={{ fontSize: '0.8rem' }}>
              {activeProject.key}
            </span>
            <span className="badge" style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>
              {activeProject.methodology}
            </span>
            {isScrum && activeSprint && (
              <span className="badge badge-ai" style={{ fontSize: '0.8rem' }}>
                <Zap size={12} style={{ marginRight: '0.25rem' }} />
                {activeSprint.name} ({activeSprint.done_points || 0}/{activeSprint.total_points || 0} pts)
              </span>
            )}
          </div>
          <p style={{ color: 'var(--color-slate-600)', fontSize: '0.9rem', margin: 0 }}>
            {isScrum
              ? activeSprint
                ? `Active sprint workflow: ${activeSprint.name}. Drag cards to transition workflow statuses.`
                : 'Scrum sprint workflow.'
              : 'Continuous Kanban flow. Drag cards across statuses to update progress in real time.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {canEdit && (
            <button
              onClick={() => {
                setCreateDefaultStatus('todo');
                setShowCreateModal(true);
              }}
              className="btn btn-primary"
            >
              <Plus size={18} /> Create Issue
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        className="card"
        style={{
          padding: '0.75rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '320px' }}>
          <Search
            size={16}
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
            placeholder="Search board cards..."
            className="input"
            style={{ paddingLeft: '2.3rem', fontSize: '0.875rem' }}
          />
        </div>

        {/* My Issues Toggle */}
        <button
          type="button"
          onClick={() => setOnlyMyIssues(!onlyMyIssues)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.85rem',
            borderRadius: 'var(--radius)',
            border: onlyMyIssues ? '2px solid var(--color-primary)' : '1px solid var(--color-slate-200)',
            backgroundColor: onlyMyIssues ? 'var(--color-primary-light)' : '#FFFFFF',
            color: onlyMyIssues ? 'var(--color-primary)' : 'var(--color-slate-700)',
            fontWeight: onlyMyIssues ? 700 : 500,
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          <User size={15} />
          <span>My Issues</span>
        </button>

        {/* Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="input"
          style={{ width: 'auto', fontSize: '0.85rem' }}
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
          style={{ width: 'auto', fontSize: '0.85rem' }}
        >
          <option value="">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {(searchTerm || onlyMyIssues || typeFilter || priorityFilter) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setOnlyMyIssues(false);
              setTypeFilter('');
              setPriorityFilter('');
            }}
            className="btn btn-ghost"
            style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Scrum without active sprint Notice */}
      {isScrum && !activeSprint && !loading && (
        <div
          className="card"
          style={{
            padding: '3rem 2rem',
            textAlign: 'center',
            backgroundColor: '#FAFCFF',
            border: '1.5px dashed var(--color-primary)',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: 'var(--radius)',
              backgroundColor: 'var(--color-primary-light)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <Zap size={26} />
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            No Active Sprint
          </h2>
          <p style={{ color: 'var(--color-slate-600)', fontSize: '0.95rem', maxWidth: '480px', margin: '0 auto 1.5rem' }}>
            In Scrum methodology, the board displays issues belonging to the currently active sprint. Go to the Backlog to plan and start a sprint.
          </p>
          <button
            onClick={() => navigate('/backlog')}
            className="btn btn-primary"
            style={{ margin: '0 auto' }}
          >
            Go to Backlog & Plan Sprint <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Kanban Board Columns Area */}
      {loading ? (
        <div className="card" style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-slate-500)' }}>
          Loading Kanban board...
        </div>
      ) : error ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-danger)' }}>
          <AlertCircle size={24} style={{ margin: '0 auto 0.5rem' }} />
          <p>{error}</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1rem',
              alignItems: 'start',
              minHeight: '600px',
            }}
          >
            {columnConfig.map((col) => {
              const colItems = columns[col.id] || [];
              const totalPoints = colItems.reduce((acc, curr) => acc + (curr.story_points || 0), 0);

              return (
                <div
                  key={col.id}
                  style={{
                    backgroundColor: 'var(--color-light-gray)',
                    borderRadius: 'var(--radius)',
                    padding: '0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    maxHeight: 'calc(100vh - 220px)',
                  }}
                >
                  {/* Column Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '0.85rem',
                      padding: '0 0.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: col.color,
                        }}
                      />
                      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: 'var(--color-slate-800)' }}>
                        {col.title}
                      </h3>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: 'var(--color-slate-200)',
                          color: 'var(--color-slate-600)',
                          borderRadius: '10px',
                          padding: '0.1rem 0.45rem',
                        }}
                      >
                        {colItems.length}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      {totalPoints > 0 && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', fontWeight: 600 }}>
                          {totalPoints} pts
                        </span>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => {
                            setCreateDefaultStatus(col.id);
                            setShowCreateModal(true);
                          }}
                          className="btn btn-ghost"
                          title={`Add issue to ${col.title}`}
                          style={{ padding: '0.2rem', color: 'var(--color-slate-500)' }}
                        >
                          <Plus size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Droppable Column Items */}
                  <StrictModeDroppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.65rem',
                          flex: 1,
                          overflowY: 'auto',
                          minHeight: '120px',
                          padding: '0.25rem',
                          backgroundColor: snapshot.isDraggingOver ? `${col.color}0D` : 'transparent',
                          borderRadius: 'var(--radius)',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        {colItems.map((item, index) => {
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
                                  {...provided.dragHandleProps}
                                  onClick={() => setSelectedIssueId(item.id)}
                                  style={{
                                    ...provided.draggableProps.style,
                                    backgroundColor: snapshot.isDragging ? '#FFFFFF' : '#FFFFFF',
                                    borderRadius: 'var(--radius)',
                                    padding: '0.85rem',
                                    border: snapshot.isDragging
                                      ? `2px solid ${col.color}`
                                      : '1px solid var(--color-slate-200)',
                                    boxShadow: snapshot.isDragging
                                      ? 'var(--shadow-lg)'
                                      : '0 1px 3px rgba(0,0,0,0.05)',
                                    cursor: 'pointer',
                                    transition: 'border 0.15s ease, box-shadow 0.15s ease',
                                  }}
                                >
                                  {/* Card Top: Type & Key */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      marginBottom: '0.4rem',
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <span style={{ fontSize: '0.9rem' }}>
                                        {typeConfig[item.type]?.icon || '🔵'}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: '0.775rem',
                                          fontWeight: 700,
                                          color: 'var(--color-primary)',
                                        }}
                                      >
                                        {item.key}
                                      </span>
                                    </div>

                                    {/* Story points pill */}
                                    {item.story_points != null && (
                                      <span
                                        className="badge"
                                        style={{
                                          fontSize: '0.725rem',
                                          fontWeight: 600,
                                          padding: '0.1rem 0.4rem',
                                        }}
                                      >
                                        {item.story_points} pts
                                      </span>
                                    )}
                                  </div>

                                  {/* Card Title */}
                                  <div
                                    style={{
                                      fontSize: '0.875rem',
                                      fontWeight: 600,
                                      color: 'var(--color-slate-900)',
                                      lineHeight: 1.4,
                                      marginBottom: '0.75rem',
                                      wordBreak: 'break-word',
                                    }}
                                  >
                                    {item.title}
                                  </div>

                                  {/* Card Bottom: Priority & Assignee */}
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      fontSize: '0.75rem',
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        textTransform: 'capitalize',
                                        padding: '0.15rem 0.45rem',
                                        borderRadius: 'var(--radius)',
                                        backgroundColor: pColor.bg,
                                        color: pColor.color,
                                      }}
                                    >
                                      {item.priority}
                                    </span>

                                    {item.assignee ? (
                                      <div
                                        title={item.assignee.name}
                                        style={{
                                          width: '24px',
                                          height: '24px',
                                          borderRadius: '50%',
                                          backgroundColor: 'var(--color-primary)',
                                          color: '#FFFFFF',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '0.7rem',
                                          fontWeight: 700,
                                        }}
                                      >
                                        {item.assignee.initials || item.assignee.name?.[0] || 'U'}
                                      </div>
                                    ) : (
                                      <div
                                        title="Unassigned"
                                        style={{
                                          width: '24px',
                                          height: '24px',
                                          borderRadius: '50%',
                                          border: '1px dashed var(--color-slate-300)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          color: 'var(--color-slate-400)',
                                          fontSize: '0.7rem',
                                        }}
                                      >
                                        -
                                      </div>
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
                  </StrictModeDroppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* Issue Creation Modal */}
      {showCreateModal && (
        <IssueFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => fetchBoard()}
          projectId={activeProject.id}
          initialData={{ status: createDefaultStatus }}
        />
      )}

      {/* Issue Detail Modal */}
      {selectedIssueId && (
        <IssueDetailModal
          isOpen={Boolean(selectedIssueId)}
          onClose={() => setSelectedIssueId(null)}
          issueId={selectedIssueId}
          onIssueUpdated={() => fetchBoard()}
          onIssueDeleted={() => {
            setSelectedIssueId(null);
            fetchBoard();
          }}
        />
      )}
    </div>
  );
}

