import apiClient from './client';

export const generateAIStories = async (projectId, requirements) => {
  const response = await apiClient.post('/ai/stories/', {
    project_id: projectId,
    requirements,
  });
  return response.data;
};

export const generateAITasks = async (storyId, { title, description } = {}) => {
  const payload = storyId ? { story_id: storyId } : { title, description };
  const response = await apiClient.post('/ai/tasks/', payload);
  return response.data;
};

export const generateAICriteria = async ({ issue_id, title, description } = {}) => {
  const payload = issue_id ? { issue_id } : { title, description };
  const response = await apiClient.post('/ai/criteria/', payload);
  return response.data;
};

export const analyzeAIBug = async ({ issue_id, title, description } = {}) => {
  const payload = issue_id ? { issue_id } : { title, description };
  const response = await apiClient.post('/ai/bug-analysis/', payload);
  return response.data;
};

export const generateAISprintSummary = async (sprintId) => {
  const response = await apiClient.post('/ai/sprint-summary/', {
    sprint_id: sprintId,
  });
  return response.data;
};

