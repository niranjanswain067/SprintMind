import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Layers,
  Sparkles,
  LayoutDashboard,
  ListTodo,
  Zap,
  Kanban,
  BarChart3,
  FolderGit2,
  Users,
  ChevronDown,
  Plus,
  LogOut,
  Building2,
  Folder,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import NewWorkspaceModal from '../components/NewWorkspaceModal';
import NewProjectModal from '../components/NewProjectModal';

export default function AppLayout() {
  const {
    user,
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    projects,
    activeProject,
    setActiveProject,
    logout,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [isWsOpen, setIsWsOpen] = useState(false);
  const [isProjOpen, setIsProjOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showNewWsModal, setShowNewWsModal] = useState(false);
  const [showNewProjModal, setShowNewProjModal] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Backlog', path: '/backlog', icon: ListTodo },
    { name: 'Sprints', path: '/sprints', icon: Zap },
    { name: 'Board', path: '/board', icon: Kanban },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Projects', path: '/projects', icon: FolderGit2 },
    { name: 'Team', path: '/team', icon: Users },
  ];

  const currentRole = activeWorkspace?.current_user_role || 'member';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Top Bar */}
      <header style={{
        height: '60px',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid var(--color-slate-200)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        zIndex: 20,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* Logo */}
          <div
            onClick={() => navigate('/projects')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}
          >
            <div style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-ai-purple) 100%)',
              color: '#FFFFFF',
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-xs)'
            }}>
              <Layers size={18} />
            </div>
            <span style={{ fontWeight: 800, fontSize: '1.2rem', letterSpacing: '-0.02em' }}>SprintMind</span>
            <span className="badge badge-ai" style={{ fontSize: '0.7rem' }}>
              <Sparkles size={11} /> AI
            </span>
          </div>

          <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--color-slate-200)' }} />

          {/* Workspace Switcher */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => { setIsWsOpen(!isWsOpen); setIsProjOpen(false); }}
              className="btn btn-secondary"
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.825rem',
                fontWeight: 600,
                color: 'var(--color-slate-800)',
                gap: '0.4rem',
              }}
            >
              <Building2 size={15} style={{ color: 'var(--color-primary)' }} />
              <span>{activeWorkspace ? activeWorkspace.name : 'Select Workspace'}</span>
              <ChevronDown size={14} style={{ color: 'var(--color-slate-400)' }} />
            </button>

            {isWsOpen && (
              <div
                className="card"
                style={{
                  position: 'absolute',
                  top: '110%',
                  left: 0,
                  width: '240px',
                  padding: '0.5rem',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 30,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                }}
              >
                <div style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem', color: 'var(--color-slate-400)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Workspaces
                </div>
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => { setActiveWorkspace(ws); setIsWsOpen(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.6rem',
                      borderRadius: 'var(--radius)',
                      border: 'none',
                      background: activeWorkspace?.id === ws.id ? 'var(--color-primary-light)' : 'transparent',
                      color: activeWorkspace?.id === ws.id ? 'var(--color-primary)' : 'var(--color-slate-800)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      textAlign: 'left',
                      fontWeight: activeWorkspace?.id === ws.id ? 600 : 400,
                    }}
                  >
                    <span>{ws.name}</span>
                    <span className="badge" style={{ fontSize: '0.65rem', backgroundColor: 'var(--color-slate-100)' }}>
                      {ws.current_user_role || 'member'}
                    </span>
                  </button>
                ))}
                <div style={{ borderTop: '1px solid var(--color-slate-100)', marginTop: '0.25rem', paddingTop: '0.25rem' }}>
                  <button
                    onClick={() => { setIsWsOpen(false); setShowNewWsModal(true); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.6rem',
                      width: '100%',
                      borderRadius: 'var(--radius)',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--color-primary)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                    }}
                  >
                    <Plus size={15} /> Create Workspace
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Active Project Switcher */}
          {activeWorkspace && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => { setIsProjOpen(!isProjOpen); setIsWsOpen(false); }}
                className="btn btn-secondary"
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  color: 'var(--color-slate-800)',
                  gap: '0.4rem',
                }}
              >
                <Folder size={15} style={{ color: 'var(--color-ai-purple)' }} />
                <span>{activeProject ? `${activeProject.key} · ${activeProject.name}` : 'Select Project'}</span>
                <ChevronDown size={14} style={{ color: 'var(--color-slate-400)' }} />
              </button>

              {isProjOpen && (
                <div
                  className="card"
                  style={{
                    position: 'absolute',
                    top: '110%',
                    left: 0,
                    width: '260px',
                    padding: '0.5rem',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 30,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                  }}
                >
                  <div style={{ padding: '0.35rem 0.5rem', fontSize: '0.7rem', color: 'var(--color-slate-400)', textTransform: 'uppercase', fontWeight: 600 }}>
                    Projects in {activeWorkspace.name}
                  </div>
                  {projects.length === 0 ? (
                    <div style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--color-slate-500)', textAlign: 'center' }}>
                      No projects created yet.
                    </div>
                  ) : (
                    projects.map((proj) => (
                      <button
                        key={proj.id}
                        onClick={() => { setActiveProject(proj); setIsProjOpen(false); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.5rem 0.6rem',
                          borderRadius: 'var(--radius)',
                          border: 'none',
                          background: activeProject?.id === proj.id ? 'var(--color-ai-purple-light)' : 'transparent',
                          color: activeProject?.id === proj.id ? 'var(--color-ai-purple)' : 'var(--color-slate-800)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          textAlign: 'left',
                          fontWeight: activeProject?.id === proj.id ? 600 : 400,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{proj.key}</span>
                          <span>{proj.name}</span>
                        </div>
                        <span className="badge" style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>
                          {proj.methodology}
                        </span>
                      </button>
                    ))
                  )}

                  {['admin', 'manager'].includes(currentRole) && (
                    <div style={{ borderTop: '1px solid var(--color-slate-100)', marginTop: '0.25rem', paddingTop: '0.25rem' }}>
                      <button
                        onClick={() => { setIsProjOpen(false); setShowNewProjModal(true); }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 0.6rem',
                          width: '100%',
                          borderRadius: 'var(--radius)',
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--color-ai-purple)',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 500,
                        }}
                      >
                        <Plus size={15} /> Create Project
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile & Logout Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              borderRadius: 'var(--radius)',
            }}
          >
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-slate-900)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}>
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-800)', lineHeight: 1.2 }}>
                {user?.name || 'User'}
              </span>
              <span style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)' }}>
                {user?.email}
              </span>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--color-slate-400)' }} />
          </button>

          {isUserMenuOpen && (
            <div
              className="card"
              style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                width: '200px',
                padding: '0.5rem',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 30,
              }}
            >
              <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--color-slate-100)', marginBottom: '0.25rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{user?.name}</div>
                <div style={{ fontSize: '0.725rem', color: 'var(--color-slate-500)' }}>{user?.email}</div>
                <div style={{ marginTop: '0.4rem' }}>
                  <span className="badge badge-ai" style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>
                    Role: {currentRole}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem',
                  width: '100%',
                  borderRadius: 'var(--radius)',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--color-danger)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside style={{
          width: '220px',
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid var(--color-slate-200)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem 0.75rem',
          flexShrink: 0,
          gap: '0.25rem'
        }}>
          <div style={{ padding: '0 0.5rem 0.5rem', fontSize: '0.7rem', color: 'var(--color-slate-400)', textTransform: 'uppercase', fontWeight: 600 }}>
            Planning &amp; Execution
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path === '/projects' && location.pathname === '/');
            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 'var(--radius)',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-slate-600)',
                  backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <Icon size={18} style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-slate-400)' }} />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </aside>

        {/* Content View Area */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: 'var(--color-light-gray)',
          padding: '2rem',
        }}>
          <Outlet />
        </main>
      </div>

      {/* Modals */}
      <NewWorkspaceModal isOpen={showNewWsModal} onClose={() => setShowNewWsModal(false)} />
      <NewProjectModal isOpen={showNewProjModal} onClose={() => setShowNewProjModal(false)} />
    </div>
  );
}
