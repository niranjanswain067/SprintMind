import apiClient from './client';

export const listIssues = async (projectId, params = {}) => {
  const response = await apiClient.get(`/projects/${projectId}/issues/`, { params });
  return response.data;
};

export const createIssue = async (projectId, issueData) => {
  const response = await apiClient.post(`/projects/${projectId}/issues/`, issueData);
  return response.data;
};

export const getIssueDetail = async (issueId) => {
  const response = await apiClient.get(`/issues/${issueId}/`);
  return response.data;
};

export const updateIssue = async (issueId, issueData) => {
  const response = await apiClient.patch(`/issues/${issueId}/`, issueData);
  return response.data;
};

export const deleteIssue = async (issueId) => {
  const response = await apiClient.delete(`/issues/${issueId}/`);
  return response.data;
};

export const moveIssue = async (issueId, { status, rank }) => {
  const response = await apiClient.patch(`/issues/${issueId}/move/`, { status, rank });
  return response.data;
};

export const listBacklog = async (projectId, params = {}) => {
  const response = await apiClient.get(`/projects/${projectId}/backlog/`, { params });
  return response.data;
};

export const reorderBacklog = async (projectId, { issue_id, prev_issue_id, next_issue_id }) => {
  const response = await apiClient.patch(`/projects/${projectId}/backlog/reorder/`, {
    issue_id,
    prev_issue_id,
    next_issue_id,
  });
  return response.data;
};

export const listIssueComments = async (issueId) => {
  const response = await apiClient.get(`/issues/${issueId}/comments/`);
  return response.data;
};

export const createIssueComment = async (issueId, body) => {
  const response = await apiClient.post(`/issues/${issueId}/comments/`, { body });
  return response.data;
};

export const listIssueActivity = async (issueId) => {
  const response = await apiClient.get(`/issues/${issueId}/activity/`);
  return response.data;
};

export const bulkCreateIssues = async (projectId, issues) => {
  const response = await apiClient.post(`/projects/${projectId}/issues/bulk-create/`, { issues });
  return response.data;
};

