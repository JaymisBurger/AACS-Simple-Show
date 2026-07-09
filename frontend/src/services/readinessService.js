import { apiClient } from './apiClient.js';

export async function getShowReadinessRequest(showId) {
  const { data } = await apiClient.get(`/admin/shows/${showId}/readiness`);
  return data;
}

export async function getVendorReadinessRequest(showId) {
  const { data } = await apiClient.get(`/admin/shows/${showId}/readiness/vendors`);
  return data;
}

export async function previewCommunicationRequest(showId, payload) {
  const { data } = await apiClient.post(`/admin/shows/${showId}/communications/preview`, payload);
  return data;
}

export async function saveCommunicationRequest(showId, payload) {
  const { data } = await apiClient.post(`/admin/shows/${showId}/communications`, payload);
  return data;
}

export async function listCommunicationsRequest(showId, params = {}) {
  const { data } = await apiClient.get(`/admin/shows/${showId}/communications`, { params });
  return data;
}

export async function markCommunicationCopiedRequest(communicationId) {
  const { data } = await apiClient.patch(`/admin/communications/${communicationId}/copied`);
  return data;
}

export async function markCommunicationSentRequest(communicationId) {
  const { data } = await apiClient.patch(`/admin/communications/${communicationId}/sent-externally`);
  return data;
}
