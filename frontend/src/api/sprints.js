import apiClient from './client';

export const listProjectSprints = async (projectId, params = {}) => {
  const response = await apiClient.get(`/projects/${projectId}/sprints/`, { params });
  return response.data;
};

export const createProjectSprint = async (projectId, sprintData) => {
  const response = await apiClient.post(`/projects/${projectId}/sprints/`, sprintData);
  return response.data;
};

export const getSprintDetail = async (sprintId) => {
  const response = await apiClient.get(`/sprints/${sprintId}/`);
  return response.data;
};

export const updateSprint = async (sprintId, sprintData) => {
  const response = await apiClient.patch(`/sprints/${sprintId}/`, sprintData);
  return response.data;
};

export const deleteSprint = async (sprintId) => {
  const response = await apiClient.delete(`/sprints/${sprintId}/`);
  return response.data;
};

export const startSprint = async (sprintId, data = {}) => {
  const response = await apiClient.post(`/sprints/${sprintId}/start/`, data);
  return response.data;
};

export const completeSprint = async (sprintId, data) => {
  const response = await apiClient.post(`/sprints/${sprintId}/complete/`, data);
  return response.data;
};

export const addIssuesToSprint = async (sprintId, issueIds) => {
  const response = await apiClient.post(`/sprints/${sprintId}/issues/`, { issue_ids: issueIds });
  return response.data;
};

export const removeIssueFromSprint = async (sprintId, issueId) => {
  const response = await apiClient.delete(`/sprints/${sprintId}/issues/${issueId}/`);
  return response.data;
};

export const getSprintReport = async (sprintId) => {
  const response = await apiClient.get(`/sprints/${sprintId}/report/`);
  return response.data;
};

