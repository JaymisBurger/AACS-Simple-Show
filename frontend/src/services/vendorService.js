import { apiClient } from './apiClient.js';

export function uploadedAssetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const baseUrl = apiClient.defaults.baseURL.replace(/\/api$/, '');
  return `${baseUrl}${path}`;
}

export async function listAdminVendorsRequest(params = {}) {
  const { data } = await apiClient.get('/admin/vendors', { params });
  return data;
}

export async function getAdminVendorRequest(vendorId) {
  const { data } = await apiClient.get(`/admin/vendors/${vendorId}`);
  return data;
}

export async function createAdminVendorRequest(vendor) {
  const { data } = await apiClient.post('/admin/vendors', vendor);
  return data;
}

export async function updateAdminVendorRequest(vendorId, vendor) {
  const { data } = await apiClient.patch(`/admin/vendors/${vendorId}`, vendor);
  return data;
}

export async function updateAdminVendorTierRequest(vendorId, tier) {
  const { data } = await apiClient.patch(`/admin/vendors/${vendorId}/tier`, { tier });
  return data;
}

export async function updateAdminVendorStatusRequest(vendorId, isActive) {
  const { data } = await apiClient.patch(`/admin/vendors/${vendorId}/status`, { isActive });
  return data;
}

export async function resetAdminVendorPasswordRequest(vendorId, payload) {
  const { data } = await apiClient.post(`/admin/vendors/${vendorId}/reset-password`, payload);
  return data;
}

export async function assignAdminVendorToShowRequest(vendorId, payload) {
  const { data } = await apiClient.post(`/admin/vendors/${vendorId}/assign-show`, payload);
  return data;
}

export async function uploadAdminVendorLogoRequest(vendorId, file, onUploadProgress) {
  const formData = new FormData();
  formData.append('logo', file);
  const { data } = await apiClient.post(`/admin/vendors/${vendorId}/logo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress
  });
  return data;
}

export async function removeAdminVendorLogoRequest(vendorId) {
  const { data } = await apiClient.delete(`/admin/vendors/${vendorId}/logo`);
  return data;
}

export async function listShowVendorsRequest(showId) {
  const { data } = await apiClient.get(`/admin/shows/${showId}/vendors`);
  return data;
}

export async function updateShowVendorRequest(showId, vendorId, payload) {
  const { data } = await apiClient.patch(`/admin/shows/${showId}/vendors/${vendorId}`, payload);
  return data;
}

export async function removeShowVendorRequest(showId, vendorId) {
  await apiClient.delete(`/admin/shows/${showId}/vendors/${vendorId}`);
}

export async function getVendorPortalDashboardRequest() {
  const { data } = await apiClient.get('/vendor/dashboard');
  return data;
}

export async function updateVendorProfileRequest(profile) {
  const { data } = await apiClient.patch('/vendor/profile', profile);
  return data;
}

export async function uploadVendorLogoRequest(file, onUploadProgress) {
  const formData = new FormData();
  formData.append('logo', file);
  const { data } = await apiClient.post('/vendor/profile/logo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress
  });
  return data;
}

export async function removeVendorLogoRequest() {
  const { data } = await apiClient.delete('/vendor/profile/logo');
  return data;
}
