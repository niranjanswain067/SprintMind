import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, logoutUser, getProfile, refreshAccessToken } from '../api/auth';
import { listWorkspaces } from '../api/workspaces';
import { listProjects } from '../api/projects';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('sprintmind_access_token'));
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('sprintmind_refresh_token'));
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProjectState] = useState(null);
  const [loading, setLoading] = useState(true);

  const saveTokens = (access, refresh) => {
    if (access) {
      localStorage.setItem('sprintmind_access_token', access);
      setToken(access);
    }
    if (refresh) {
      localStorage.setItem('sprintmind_refresh_token', refresh);
      setRefreshToken(refresh);
    }
  };

  const clearAuth = useCallback(() => {
    localStorage.removeItem('sprintmind_access_token');
    localStorage.removeItem('sprintmind_refresh_token');
    localStorage.removeItem('sprintmind_active_ws');
    localStorage.removeItem('sprintmind_active_proj');
    setUser(null);
    setToken(null);
    setRefreshToken(null);
    setWorkspaces([]);
    setActiveWorkspaceState(null);
    setProjects([]);
    setActiveProjectState(null);
  }, []);

  const fetchProjectsForWorkspace = useCallback(async (wsId) => {
    if (!wsId) return [];
    try {
      const data = await listProjects(wsId);
      setProjects(data);

      const savedProjId = localStorage.getItem('sprintmind_active_proj');
      const match = data.find((p) => String(p.id) === String(savedProjId));
      if (match) {
        setActiveProjectState(match);
      } else if (data.length > 0) {
        setActiveProjectState(data[0]);
        localStorage.setItem('sprintmind_active_proj', data[0].id);
      } else {
        setActiveProjectState(null);
      }
      return data;
    } catch {
      setProjects([]);
      return [];
    }
  }, []);

  const setActiveWorkspace = (ws) => {
    setActiveWorkspaceState(ws);
    if (ws) {
      localStorage.setItem('sprintmind_active_ws', ws.id);
      fetchProjectsForWorkspace(ws.id);
    } else {
      localStorage.removeItem('sprintmind_active_ws');
      setProjects([]);
      setActiveProjectState(null);
    }
  };

  const setActiveProject = (proj) => {
    setActiveProjectState(proj);
    if (proj) {
      localStorage.setItem('sprintmind_active_proj', proj.id);
    } else {
      localStorage.removeItem('sprintmind_active_proj');
    }
  };

  const fetchWorkspaces = useCallback(async () => {
    try {
      const data = await listWorkspaces();
      setWorkspaces(data);
      const savedWsId = localStorage.getItem('sprintmind_active_ws');
      const match = data.find((w) => String(w.id) === String(savedWsId));
      if (match) {
        setActiveWorkspaceState(match);
        await fetchProjectsForWorkspace(match.id);
      } else if (data.length > 0) {
        setActiveWorkspaceState(data[0]);
        localStorage.setItem('sprintmind_active_ws', data[0].id);
        await fetchProjectsForWorkspace(data[0].id);
      }
      return data;
    } catch {
      return [];
    }
  }, [fetchProjectsForWorkspace]);

  const loadUserSession = useCallback(async () => {
    const currentToken = localStorage.getItem('sprintmind_access_token');
    if (!currentToken) {
      setLoading(false);
      return;
    }

    try {
      const profile = await getProfile();
      setUser(profile);
      await fetchWorkspaces();
    } catch {
      const currentRefresh = localStorage.getItem('sprintmind_refresh_token');
      if (currentRefresh) {
        try {
          const refreshed = await refreshAccessToken(currentRefresh);
          saveTokens(refreshed.access, null);
          const profile = await getProfile();
          setUser(profile);
          await fetchWorkspaces();
        } catch {
          clearAuth();
        }
      } else {
        clearAuth();
      }
    } finally {
      setLoading(false);
    }
  }, [clearAuth, fetchWorkspaces]);

  useEffect(() => {
    loadUserSession();

    const handleUnauthorized = () => {
      clearAuth();
    };

    window.addEventListener('sprintmind:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('sprintmind:unauthorized', handleUnauthorized);
    };
  }, [loadUserSession, clearAuth]);

  const login = async (email, password) => {
    const data = await loginUser(email, password);
    saveTokens(data.tokens.access, data.tokens.refresh);
    setUser(data.user);
    await fetchWorkspaces();
    return data;
  };

  const register = async (name, email, password) => {
    const data = await registerUser(name, email, password);
    saveTokens(data.tokens.access, data.tokens.refresh);
    setUser(data.user);
    await fetchWorkspaces();
    return data;
  };

  const logout = async () => {
    if (refreshToken) {
      try {
        await logoutUser(refreshToken);
      } catch {
        // Continue clearing client credentials
      }
    }
    clearAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        workspaces,
        activeWorkspace,
        projects,
        activeProject,
        loading,
        login,
        register,
        logout,
        setActiveWorkspace,
        setActiveProject,
        fetchWorkspaces,
        fetchProjects: fetchProjectsForWorkspace,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
