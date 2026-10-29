import apiClient from './client';

export const listProjects = async (workspaceId, isArchived = false) => {
  const params = {};
  if (workspaceId) params.workspace_id = workspaceId;
  if (isArchived !== undefined) params.is_archived = isArchived;
  const response = await apiClient.get('/projects/', { params });
  return response.data;
};

export const createProject = async ({ workspaceId, name, key, description, methodology }) => {
  const response = await apiClient.post('/projects/', {
    workspace_id: workspaceId,
    name,
    key,
    description,
    methodology,
  });
  return response.data;
};

export const getProject = async (id) => {
  const response = await apiClient.get(`/projects/${id}/`);
  return response.data;
};

export const archiveProject = async (id) => {
  const response = await apiClient.post(`/projects/${id}/archive/`);
  return response.data;
};
