import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { VendorAvatar } from '../components/VendorAvatar.jsx';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import { listAdminAssignmentsRequest } from '../services/assignmentService.js';
import { listShowsRequest } from '../services/showService.js';
import { formatDateTime } from '../utils/dateFormat.js';
import './Shows.css';

export function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [shows, setShows] = useState([]);
  const [filters, setFilters] = useState({ search: '', showId: 'all', tier: 'all', source: 'all', status: 'active' });
  const [error, setError] = useState('');

  useEffect(() => {
    listShowsRequest({ status: 'all' }).then((data) => setShows(data.shows)).catch(() => setShows([]));
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(loadAssignments, 150);
    return () => window.clearTimeout(timeout);
  }, [filters]);

  async function loadAssignments() {
    setError('');
    try {
      const data = await listAdminAssignmentsRequest(filters);
      setAssignments(data.assignments);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load assignments.');
    }
  }

  return (
    <AdminLayout>
      <section className="page-heading">
        <div><p className="app-kicker">Booth Assignments</p><h2>All Assignments</h2></div>
      </section>
      <section className="show-toolbar booth-toolbar">
        <input placeholder="Search vendor, booth, or show" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
        <select value={filters.showId} onChange={(event) => setFilters((current) => ({ ...current, showId: event.target.value }))}><option value="all">All Shows</option>{shows.map((show) => <option key={show.id} value={show.id}>{show.name}</option>)}</select>
        <select value={filters.tier} onChange={(event) => setFilters((current) => ({ ...current, tier: event.target.value }))}><option value="all">All Tiers</option><option value="platinum">Platinum</option><option value="gold">Gold</option><option value="silver">Silver</option><option value="bronze">Bronze</option></select>
        <select value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))}><option value="all">All Sources</option><option value="vendor_selection">Vendor Selection</option><option value="admin_assignment">Admin Assignment</option><option value="admin_move">Admin Move</option></select>
        <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="active">Active</option><option value="released">Released</option><option value="cancelled">Cancelled</option><option value="all">All History</option></select>
      </section>
      {error ? <div className="form-error">{error}</div> : null}
      <div className="table-wrap">
        <table className="shows-table">
          <thead><tr><th>Show</th><th>Booth</th><th>Vendor</th><th>Tier</th><th>Source</th><th>Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{assignments.map((assignment) => (
            <tr key={assignment.id}>
              <td>{assignment.showName}</td>
              <td>{assignment.booth.boothNumber}</td>
              <td><div className="vendor-cell"><VendorAvatar logoUrl={assignment.vendor.logoUrl} companyName={assignment.vendor.companyName} /><span>{assignment.vendor.companyName}</span></div></td>
              <td>{assignment.vendor.tier}</td>
              <td>{assignment.assignmentSource}</td>
              <td>{formatDateTime(assignment.confirmedAt, assignment.timezone)}</td>
              <td>{assignment.status}</td>
              <td><Link to={`/admin/shows/${assignment.showId}/assignments`}>Manage Show</Link></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
