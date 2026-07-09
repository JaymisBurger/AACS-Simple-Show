import { apiClient } from './apiClient.js';

export async function getPublicSettingsRequest(showId) {
  const { data } = await apiClient.get(`/admin/shows/${showId}/public-settings`);
  return data;
}

export async function updatePublicSettingsRequest(showId, payload) {
  const { data } = await apiClient.patch(`/admin/shows/${showId}/public-settings`, payload);
  return data;
}

export async function regeneratePublicTokenRequest(showId) {
  const { data } = await apiClient.post(`/admin/shows/${showId}/public-settings/regenerate-token`);
  return data;
}

export async function disablePublicAccessRequest(showId) {
  const { data } = await apiClient.post(`/admin/shows/${showId}/public-settings/disable`);
  return data;
}

export async function getEventDayRequest(showId) {
  const { data } = await apiClient.get(`/admin/shows/${showId}/event-day`);
  return data;
}

export async function updateCheckInRequest(showId, vendorProfileId, checkedIn) {
  const { data } = await apiClient.patch(`/admin/shows/${showId}/event-day/vendors/${vendorProfileId}/check-in`, { checkedIn });
  return data;
}

export function exportUrl(showId, type) {
  return `${apiClient.defaults.baseURL}/admin/shows/${showId}/exports/${type}.csv`;
}

export async function downloadExportRequest(showId, type) {
  const response = await apiClient.get(`/admin/shows/${showId}/exports/${type}.csv`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${type}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function getPublicMapRequest(token) {
  const { data } = await apiClient.get(`/public/shows/${token}/map`);
  return data;
}

export async function getPublicMapImageBlobUrlRequest(token) {
  const { data } = await apiClient.get(`/public/shows/${token}/map/image`, { responseType: 'blob' });
  return URL.createObjectURL(data);
}

export async function getPublicDirectoryRequest(token) {
  const { data } = await apiClient.get(`/public/shows/${token}/vendors`);
  return data;
}
