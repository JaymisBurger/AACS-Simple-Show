import { apiClient } from './apiClient.js';

export async function listBoothsRequest(showId, params = {}) {
  const { data } = await apiClient.get(`/admin/shows/${showId}/booths`, { params });
  return data;
}

export async function getBoothRequest(showId, boothId) {
  const { data } = await apiClient.get(`/admin/shows/${showId}/booths/${boothId}`);
  return data;
}

export async function updateBoothRequest(showId, boothId, booth) {
  const { data } = await apiClient.patch(`/admin/shows/${showId}/booths/${boothId}`, booth);
  return data;
}

export async function updateBoothStatusRequest(showId, boothId, status) {
  const { data } = await apiClient.patch(`/admin/shows/${showId}/booths/${boothId}/status`, { status });
  return data;
}

export async function duplicateBoothRequest(showId, boothId) {
  const { data } = await apiClient.post(`/admin/shows/${showId}/booths/${boothId}/duplicate`);
  return data;
}

export async function deleteBoothRequest(showId, boothId) {
  await apiClient.delete(`/admin/shows/${showId}/booths/${boothId}`);
}

export async function bulkUpdateBoothsRequest(showId, payload) {
  const { data } = await apiClient.post(`/admin/shows/${showId}/booths/bulk-update`, payload);
  return data;
}

export async function bulkDeleteBoothsRequest(showId, boothIds) {
  await apiClient.post(`/admin/shows/${showId}/booths/bulk-delete`, { boothIds });
}

export async function renumberBoothsRequest(showId, payload) {
  const { data } = await apiClient.post(`/admin/shows/${showId}/booths/renumber`, payload);
  return data;
}
