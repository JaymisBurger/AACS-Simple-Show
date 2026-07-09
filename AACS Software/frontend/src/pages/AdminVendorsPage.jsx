import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TierBadge } from '../components/TierBadge.jsx';
import { VendorAvatar } from '../components/VendorAvatar.jsx';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import {
  listAdminVendorsRequest,
  resetAdminVendorPasswordRequest,
  updateAdminVendorStatusRequest
} from '../services/vendorService.js';
import { listShowsRequest } from '../services/showService.js';
import { formatDate } from '../utils/dateFormat.js';
import './Shows.css';

const tiers = ['all', 'platinum', 'gold', 'silver', 'bronze'];

export function AdminVendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [shows, setShows] = useState([]);
  const [filters, setFilters] = useState({ search: '', tier: 'all', active: 'all', complete: 'all', showId: 'all', sort: 'company' });
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    listShowsRequest({ status: 'all' }).then((data) => setShows(data.shows)).catch(() => setShows([]));
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(loadVendors, 150);
    return () => window.clearTimeout(timeout);
  }, [filters]);

  async function loadVendors() {
    setStatus('loading');
    setError('');
    try {
      const data = await listAdminVendorsRequest(filters);
      setVendors(data.vendors);
      setStatus('ready');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load vendors.');
      setStatus('error');
    }
  }

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  async function runAction(action, success) {
    setError('');
    setMessage('');
    try {
      const data = await action();
      setMessage(data?.resetUrl || success);
      await loadVendors();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update vendor.');
    }
  }

  return (
    <AdminLayout>
      <section className="page-heading">
        <div>
          <p className="app-kicker">Vendors</p>
          <h2>Vendor List</h2>
        </div>
        <Link className="button primary link-button" to="/admin/vendors/new">Create Vendor</Link>
      </section>

      <section className="show-toolbar booth-toolbar">
        <input aria-label="Search vendors" onChange={(event) => updateFilter('search', event.target.value)} placeholder="Search company, contact, or email" value={filters.search} />
        <select aria-label="Tier filter" onChange={(event) => updateFilter('tier', event.target.value)} value={filters.tier}>{tiers.map((tier) => <option key={tier} value={tier}>{titleize(tier)}</option>)}</select>
        <select aria-label="Active filter" onChange={(event) => updateFilter('active', event.target.value)} value={filters.active}><option value="all">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        <select aria-label="Completion filter" onChange={(event) => updateFilter('complete', event.target.value)} value={filters.complete}><option value="all">All Profiles</option><option value="complete">Complete</option><option value="incomplete">Incomplete</option></select>
        <select aria-label="Show filter" onChange={(event) => updateFilter('showId', event.target.value)} value={filters.showId}><option value="all">All Shows</option>{shows.map((show) => <option key={show.id} value={show.id}>{show.name}</option>)}</select>
        <select aria-label="Sort vendors" onChange={(event) => updateFilter('sort', event.target.value)} value={filters.sort}><option value="company">Company</option><option value="tier">Tier</option><option value="created_at">Created date</option></select>
      </section>

      {message ? <div className="success-message">{message}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}
      {status === 'loading' ? <p className="muted">Loading vendors...</p> : null}
      {status === 'ready' && vendors.length === 0 ? <section className="empty-state"><h3>No vendors found</h3><p>Create a vendor or adjust the filters.</p></section> : null}

      {vendors.length > 0 ? (
        <div className="table-wrap">
          <table className="shows-table vendor-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Tier</th>
                <th>Account</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr key={vendor.id}>
                  <td><div className="vendor-cell"><VendorAvatar logoUrl={vendor.logoUrl} companyName={vendor.companyName} /><Link to={`/admin/vendors/${vendor.id}`}>{vendor.companyName || 'Untitled vendor'}</Link></div></td>
                  <td><TierBadge tier={vendor.tier} /></td>
                  <td>{vendor.isActive ? 'Active' : 'Inactive'}</td>
                  <td>{formatDate(vendor.createdAt)}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" onClick={() => runAction(() => updateAdminVendorStatusRequest(vendor.id, !vendor.isActive), vendor.isActive ? 'Vendor deactivated.' : 'Vendor activated.')}>{vendor.isActive ? 'Deactivate' : 'Activate'}</button>
                      <button type="button" onClick={() => runAction(() => resetAdminVendorPasswordRequest(vendor.id, { mode: 'link' }), 'Reset link generated.')}>Reset</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </AdminLayout>
  );
}

function titleize(value) {
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
