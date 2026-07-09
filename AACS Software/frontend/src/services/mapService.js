import { apiClient } from './apiClient.js';

export function floorMapImageUrl(showId) {
  const baseUrl = apiClient.defaults.baseURL.replace(/\/api$/, '');
  return `${baseUrl}/api/admin/shows/${showId}/floor-map/image`;
}

export async function getFloorMapImageBlobUrlRequest(showId) {
  const { data } = await apiClient.get(`/admin/shows/${showId}/floor-map/image`, {
    responseType: 'blob'
  });

  return URL.createObjectURL(data);
}

export async function getFloorMapRequest(showId) {
  const { data } = await apiClient.get(`/admin/shows/${showId}/floor-map`);
  return data;
}

export async function uploadFloorMapRequest(showId, { file, keepObjects }, onUploadProgress) {
  const formData = new FormData();
  formData.append('floorMap', file);
  formData.append('keepObjects', keepObjects ? 'true' : 'false');

  const { data } = await apiClient.post(`/admin/shows/${showId}/floor-map`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress
  });

  return data;
}

export async function deleteFloorMapRequest(showId) {
  await apiClient.delete(`/admin/shows/${showId}/floor-map`);
}

export async function listMapObjectsRequest(showId) {
  const { data } = await apiClient.get(`/admin/shows/${showId}/floor-map/objects`);
  return data;
}

export async function createMapObjectRequest(showId, object) {
  const { data } = await apiClient.post(`/admin/shows/${showId}/floor-map/objects`, object);
  return data;
}

export async function updateMapObjectRequest(showId, object) {
  const { data } = await apiClient.patch(
    `/admin/shows/${showId}/floor-map/objects/${object.id}`,
    object
  );
  return data;
}

export async function deleteMapObjectRequest(showId, objectId) {
  await apiClient.delete(`/admin/shows/${showId}/floor-map/objects/${objectId}`);
}

export async function duplicateMapObjectRequest(showId, objectId) {
  const { data } = await apiClient.post(
    `/admin/shows/${showId}/floor-map/objects/${objectId}/duplicate`
  );
  return data;
}

export async function bulkSaveMapObjectsRequest(showId, objects) {
  const { data } = await apiClient.put(`/admin/shows/${showId}/floor-map/objects/bulk`, {
    objects
  });
  return data;
}
