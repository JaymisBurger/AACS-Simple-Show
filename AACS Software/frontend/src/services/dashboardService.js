import { apiClient } from './apiClient.js';

export async function getAdminDashboardRequest() {
  const { data } = await apiClient.get('/dashboard/admin');
  return data;
}

export async function getVendorDashboardRequest() {
  const { data } = await apiClient.get('/vendor/dashboard');
  return data;
}
