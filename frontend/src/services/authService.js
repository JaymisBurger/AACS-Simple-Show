import { apiClient } from './apiClient.js';

export async function loginRequest({ email, password }) {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data;
}

export async function getCurrentUserRequest() {
  const { data } = await apiClient.get('/auth/me');
  return data;
}

export async function changePasswordRequest(password) {
  const { data } = await apiClient.post('/auth/change-password', { password });
  return data;
}

export async function activateVendorRequest({ token, password }) {
  const { data } = await apiClient.post('/auth/activate-vendor', { token, password });
  return data;
}

export async function resetPasswordRequest({ token, password }) {
  const { data } = await apiClient.post('/auth/reset-password', { token, password });
  return data;
}
