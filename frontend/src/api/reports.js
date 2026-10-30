import apiClient from './client';

export const getProjectBoard = async (projectId, params = {}) => {
  const response = await apiClient.get(`/projects/${projectId}/board/`, { params });
  return response.data;
};

export const getProjectDashboard = async (projectId) => {
  const response = await apiClient.get(`/projects/${projectId}/dashboard/`);
  return response.data;
};

