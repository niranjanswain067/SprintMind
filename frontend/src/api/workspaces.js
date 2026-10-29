import apiClient from './client';

export const listWorkspaces = async () => {
  const response = await apiClient.get('/workspaces/');
  return response.data;
};

export const createWorkspace = async (name) => {
  const response = await apiClient.post('/workspaces/', { name });
  return response.data;
};

export const getWorkspace = async (id) => {
  const response = await apiClient.get(`/workspaces/${id}/`);
  return response.data;
};

export const listWorkspaceMembers = async (workspaceId) => {
  const response = await apiClient.get(`/workspaces/${workspaceId}/members/`);
  return response.data;
};

export const inviteWorkspaceMember = async (workspaceId, email, role) => {
  const response = await apiClient.post(`/workspaces/${workspaceId}/members/`, { email, role });
  return response.data;
};

export const updateMemberRole = async (workspaceId, userId, role) => {
  const response = await apiClient.patch(`/workspaces/${workspaceId}/members/${userId}/`, { role });
  return response.data;
};

export const removeMember = async (workspaceId, userId) => {
  const response = await apiClient.delete(`/workspaces/${workspaceId}/members/${userId}/`);
  return response.data;
};
