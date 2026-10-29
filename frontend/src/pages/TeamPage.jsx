import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, Shield, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listWorkspaceMembers, updateMemberRole, removeMember } from '../api/workspaces';
import InviteMemberModal from '../components/InviteMemberModal';

export default function TeamPage() {
  const { activeWorkspace, user } = useAuth();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const currentRole = activeWorkspace?.current_user_role || 'member';
  const isAdmin = currentRole === 'admin';

  const loadMembers = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listWorkspaceMembers(activeWorkspace.id);
      setMembers(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch team members.');
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateMemberRole(activeWorkspace.id, userId, newRole);
      await loadMembers();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to update member role.');
    }
  };

  const handleRemove = async (userId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this workspace?`)) return;
    try {
      await removeMember(activeWorkspace.id, userId);
      await loadMembers();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to remove member.');
    }
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return 'badge-ai';
      case 'manager':
        return 'badge-success';
      case 'developer':
        return 'badge';
      case 'viewer':
      default:
        return 'badge';
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Workspace Members
          </h1>
          <p style={{ color: 'var(--color-slate-600)', fontSize: '0.95rem' }}>
            Manage team roles and permissions for <strong>{activeWorkspace?.name}</strong>
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn btn-primary"
            style={{ padding: '0.6rem 1.1rem' }}
          >
            <UserPlus size={18} /> Invite Member
          </button>
        )}
      </div>

      {error && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          background: 'var(--color-danger-bg)',
          color: 'var(--color-danger)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius)',
          marginBottom: '1.5rem'
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-slate-500)' }}>
            Loading members...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-light-gray)', borderBottom: '1px solid var(--color-slate-200)', color: 'var(--color-slate-600)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>User</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Role</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Joined Date</th>
                {isAdmin && <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isSelf = m.user_id === user?.id;
                const isOwner = m.user_id === activeWorkspace?.owner_id;

                return (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--color-slate-100)' }}>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: 'var(--color-slate-800)',
                          color: '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: '0.85rem'
                        }}>
                          {m.name ? m.name[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>
                            {m.name} {isSelf && <span style={{ color: 'var(--color-slate-400)', fontWeight: 400 }}>(You)</span>}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
                            {m.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1.25rem' }}>
                      {isAdmin && !isOwner && !isSelf ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                          style={{
                            padding: '0.35rem 0.6rem',
                            borderRadius: 'var(--radius)',
                            border: '1px solid var(--color-slate-300)',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            backgroundColor: '#FFFFFF'
                          }}
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Project Manager</option>
                          <option value="developer">Developer</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <span className={`badge ${getRoleBadgeClass(m.role)}`} style={{ textTransform: 'capitalize' }}>
                          <Shield size={12} /> {m.role}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '1rem 1.25rem', color: 'var(--color-slate-500)', fontSize: '0.85rem' }}>
                      {new Date(m.joined_at).toLocaleDateString()}
                    </td>

                    {isAdmin && (
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        {!isOwner && !isSelf && (
                          <button
                            onClick={() => handleRemove(m.user_id, m.name)}
                            className="btn btn-secondary"
                            title="Remove from Workspace"
                            style={{ padding: '0.35rem 0.6rem', color: 'var(--color-danger)' }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <InviteMemberModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        workspaceId={activeWorkspace?.id}
        onMemberInvited={() => loadMembers()}
      />
    </div>
  );
}
