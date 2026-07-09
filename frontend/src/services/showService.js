import { apiClient } from './apiClient.js';

export async function listShowsRequest({ status = 'all', search = '' } = {}) {
  const { data } = await apiClient.get('/admin/shows', {
    params: { status, search }
  });
  return data;
}

export async function getShowRequest(id) {
  const { data } = await apiClient.get(`/admin/shows/${id}`);
  return data;
}

export async function createShowRequest(payload) {
  const { data } = await apiClient.post('/admin/shows', payload);
  return data;
}

export async function updateShowRequest(id, payload) {
  const { data } = await apiClient.patch(`/admin/shows/${id}`, payload);
  return data;
}

export async function publishShowRequest(id) {
  const { data } = await apiClient.post(`/admin/shows/${id}/publish`);
  return data;
}

export async function closeShowRequest(id) {
  const { data } = await apiClient.post(`/admin/shows/${id}/close`);
  return data;
}

export async function archiveShowRequest(id, payload = {}) {
  const { data } = await apiClient.post(`/admin/shows/${id}/archive`, payload);
  return data;
}

export async function restoreShowRequest(id) {
  const { data } = await apiClient.post(`/admin/shows/${id}/restore`);
  return data;
}
