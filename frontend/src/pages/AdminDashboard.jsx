import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import { listBoothsRequest } from '../services/boothService.js';
import { listShowsRequest } from '../services/showService.js';
import { listAdminVendorsRequest } from '../services/vendorService.js';
import { formatDateRange } from '../utils/dateFormat.js';
import './Dashboard.css';

export function AdminDashboard() {
  const [status, setStatus] = useState('loading');
  const [summary, setSummary] = useState({ nextShow: null, lastShow: null, vendorStats: null });

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setStatus('loading');
    try {
      const [{ shows }, vendorData] = await Promise.all([
        listShowsRequest({ status: 'all' }),
        listAdminVendorsRequest({ active: 'all', tier: 'all', complete: 'all', showId: 'all', sort: 'company' })
      ]);
      const today = startOfToday();
      const nextShow = shows
        .filter((show) => show.startDate && new Date(show.startDate).getTime() >= today)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0] || null;
      const lastShow = shows
        .filter((show) => (show.endDate || show.startDate) && new Date(show.endDate || show.startDate).getTime() < today)
        .sort((a, b) => new Date(b.endDate || b.startDate).getTime() - new Date(a.endDate || a.startDate).getTime())[0] || null;
      const [nextStats, lastStats] = await Promise.all([
        nextShow ? listBoothsRequest(nextShow.id).then((data) => data.stats).catch(() => null) : null,
        lastShow ? listBoothsRequest(lastShow.id).then((data) => data.stats).catch(() => null) : null
      ]);

      setSummary({
        nextShow: nextShow ? { ...nextShow, boothStats: nextStats } : null,
        lastShow: lastShow ? { ...lastShow, boothStats: lastStats } : null,
        vendorStats: {
          active: (vendorData.vendors || []).filter((vendor) => vendor.isActive).length,
          total: (vendorData.vendors || []).length
        }
      });
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }

  return (
    <AdminLayout>
      <section className="dashboard-header">
        <div>
          <p className="app-kicker">Control Center</p>
          <h2>Admin Dashboard</h2>
        </div>
        <Link className="button primary link-button" to="/admin/shows/new">New Event</Link>
      </section>

      {status === 'loading' ? <p className="muted">Loading dashboard...</p> : null}
      {status === 'error' ? (
        <p className="form-error">Unable to load dashboard data. Please try again.</p>
      ) : null}

      {status === 'ready' ? (
        <>
          <section className="dashboard-vendor-summary">
            <Metric label="Active vendors" value={summary.vendorStats?.active ?? 0} />
            <Metric label="Total vendors" value={summary.vendorStats?.total ?? 0} />
            <Link className="button secondary link-button" to="/admin/vendors">View Vendors</Link>
          </section>
          <section className="dashboard-show-grid">
            <ShowSummaryCard fallback="No upcoming shows scheduled." kicker="Next Upcoming Show" show={summary.nextShow} />
            <ShowSummaryCard fallback="No previous shows found." kicker="Last Show" show={summary.lastShow} />
          </section>
        </>
      ) : null}
    </AdminLayout>
  );
}

function ShowSummaryCard({ fallback, kicker, show }) {
  const stats = show?.boothStats;

  return (
    <article className="dashboard-show-card">
      <p className="app-kicker">{kicker}</p>
      {show ? (
        <>
          <h3>{show.name || 'Untitled show'}</h3>
          <p className="dashboard-show-date">{formatDateRange(show.startDate, show.endDate)}</p>
          <div className="dashboard-metrics">
            <Metric label="Booths available" value={stats?.available ?? 0} />
            <Metric label="Total booths" value={stats?.total ?? 0} />
            <Metric label="Assigned" value={stats?.assigned ?? 0} />
          </div>
          <div className="dashboard-card-actions">
            <Link className="button primary link-button" to={`/admin/shows/${show.id}`}>Event Details</Link>
            <Link className="button secondary link-button" to={`/admin/shows/${show.id}/assignments`}>Assignments</Link>
          </div>
        </>
      ) : (
        <>
          <h3>{fallback}</h3>
          <Link className="button primary link-button" to="/admin/shows">Manage Shows</Link>
        </>
      )}
    </article>
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}
