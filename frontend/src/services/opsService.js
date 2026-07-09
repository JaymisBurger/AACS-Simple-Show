import { apiClient } from './apiClient.js';

export async function getQaChecklistRequest() {
  const { data } = await apiClient.get('/admin/qa-checklist');
  return data;
}

export async function updateQaItemRequest(itemKey, payload) {
  const { data } = await apiClient.patch(`/admin/qa-checklist/${itemKey}`, payload);
  return data;
}

export async function resetQaChecklistRequest() {
  const { data } = await apiClient.post('/admin/qa-checklist/reset');
  return data;
}

export async function downloadQaChecklistRequest() {
  const response = await apiClient.get('/admin/qa-checklist/export.csv', { responseType: 'blob' });
  downloadBlob(response.data, 'qa-checklist.csv');
}

export async function getSetupStatusRequest() {
  const { data } = await apiClient.get('/admin/setup-status');
  return data;
}

export async function getMigrationStatusRequest() {
  const { data } = await apiClient.get('/admin/migration-status');
  return data;
}

export async function getReleaseNotesRequest() {
  const { data } = await apiClient.get('/admin/release-notes');
  return data;
}

export async function adminSearchRequest(query) {
  const { data } = await apiClient.get('/admin/search', { params: { q: query } });
  return data;
}

export async function getNotificationsRequest() {
  const { data } = await apiClient.get('/admin/notifications');
  return data;
}

export async function getAdminHelpRequest() {
  const { data } = await apiClient.get('/admin/help');
  return data;
}

export async function getVendorHelpRequest() {
  const { data } = await apiClient.get('/vendor/help');
  return data;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
