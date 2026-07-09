import { apiClient } from './apiClient.js';

export async function listVendorShowsRequest() {
  const { data } = await apiClient.get('/vendor/shows');
  return data;
}

export async function getVendorShowRequest(showId) {
  const { data } = await apiClient.get(`/vendor/shows/${showId}`);
  return data;
}

export async function getVendorFloorMapRequest(showId) {
  const { data } = await apiClient.get(`/vendor/shows/${showId}/floor-map`, {
    params: { _: Date.now() }
  });
  return data;
}

export async function getVendorFloorMapImageBlobUrlRequest(showId) {
  const { data } = await apiClient.get(`/vendor/shows/${showId}/floor-map/image`, {
    params: { _: Date.now() },
    responseType: 'blob'
  });
  return URL.createObjectURL(data);
}

export async function selectVendorBoothRequest(showId, boothId) {
  const { data } = await apiClient.post(`/vendor/shows/${showId}/booths/${boothId}/select`);
  return data;
}

export async function getVendorMyBoothRequest(showId) {
  const { data } = await apiClient.get(`/vendor/shows/${showId}/my-booth`);
  return data;
}

export async function listVendorChangeRequestsRequest(showId) {
  const { data } = await apiClient.get(`/vendor/shows/${showId}/change-requests`);
  return data;
}

export async function createVendorChangeRequestRequest(showId, payload) {
  const { data } = await apiClient.post(`/vendor/shows/${showId}/change-requests`, payload);
  return data;
}

export async function listAdminAssignmentsRequest(params = {}) {
  const { data } = await apiClient.get('/admin/booth-assignments', { params });
  return data;
}

export async function getAdminShowAssignmentsRequest(showId) {
  const { data } = await apiClient.get(`/admin/shows/${showId}/assignments`);
  return data;
}

export async function listAdminChangeRequestsRequest(showId, params = {}) {
  const { data } = await apiClient.get(`/admin/shows/${showId}/change-requests`, { params });
  return data;
}

export async function approveAdminChangeRequestRequest(requestId) {
  const { data } = await apiClient.post(`/admin/change-requests/${requestId}/approve`);
  return data;
}

export async function denyAdminChangeRequestRequest(requestId, reason) {
  const { data } = await apiClient.post(`/admin/change-requests/${requestId}/deny`, { reason });
  return data;
}

export async function listEligibleVendorsRequest(showId) {
  const { data } = await apiClient.get(`/admin/shows/${showId}/assignments/eligible-vendors`);
  return data;
}

export async function createAdminAssignmentRequest(showId, payload) {
  const { data } = await apiClient.post(`/admin/shows/${showId}/assignments`, payload);
  return data;
}

export async function moveAdminAssignmentRequest(assignmentId, payload) {
  const { data } = await apiClient.post(`/admin/assignments/${assignmentId}/move`, payload);
  return data;
}

export async function releaseAdminAssignmentRequest(assignmentId, payload = {}) {
  const { data } = await apiClient.post(`/admin/assignments/${assignmentId}/release`, payload);
  return data;
}

export async function swapAdminAssignmentsRequest(payload) {
  const { data } = await apiClient.post('/admin/assignments/swap', payload);
  return data;
}
