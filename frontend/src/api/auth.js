import apiClient from './client';

export const loginUser = async (email, password) => {
  const response = await apiClient.post('/auth/login/', { email, password });
  return response.data;
};

export const registerUser = async (name, email, password) => {
  const response = await apiClient.post('/auth/register/', { name, email, password });
  return response.data;
};

export const logoutUser = async (refresh) => {
  const response = await apiClient.post('/auth/logout/', { refresh });
  return response.data;
};

export const getProfile = async () => {
  const response = await apiClient.get('/auth/me/');
  return response.data;
};

export const refreshAccessToken = async (refresh) => {
  const response = await apiClient.post('/auth/token/refresh/', { refresh });
  return response.data;
};
