import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProjectsPage from './pages/ProjectsPage';
import TeamPage from './pages/TeamPage';
import BacklogPage from './pages/BacklogPage';
import PlaceholderPage from './pages/PlaceholderPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--color-slate-500)',
        fontSize: '0.95rem'
      }}>
        Loading SprintMind session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user) {
    return <Navigate to="/projects" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />

      {/* Protected routes wrapped in AppLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/projects" replace />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route
          path="dashboard"
          element={
            <PlaceholderPage
              title="Project Dashboard"
              phase="Phase 3"
              description="Live SQL KPI cards, sprint velocity progress, and interactive status charts."
            />
          }
        />
        <Route path="backlog" element={<BacklogPage />} />
        <Route
          path="sprints"
          element={
            <PlaceholderPage
              title="Sprint Management"
              phase="Phase 3"
              description="Sprint creation, 1-active-sprint validation, start & complete sprint lifecycle."
            />
          }
        />
        <Route
          path="board"
          element={
            <PlaceholderPage
              title="Kanban Board"
              phase="Phase 3"
              description="Optimistic drag-and-drop issue cards across To Do, In Progress, In Review, Done."
            />
          }
        />
        <Route
          path="reports"
          element={
            <PlaceholderPage
              title="Reports & Analytics"
              phase="Phase 3"
              description="Sprint burndown metrics, issue distribution, and completed sprint summaries."
            />
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/projects" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
