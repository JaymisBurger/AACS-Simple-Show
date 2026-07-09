import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoutButton } from '../components/LogoutButton.jsx';
import { SelectionStatusBadge } from '../components/SelectionStatusBadge.jsx';
import { TierBadge } from '../components/TierBadge.jsx';
import { VendorAvatar } from '../components/VendorAvatar.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { listVendorShowsRequest } from '../services/assignmentService.js';
import { formatDateRange, formatDateTime } from '../utils/dateFormat.js';
import './Dashboard.css';
import './Shows.css';

export function VendorDashboard() {
  const { user, vendorProfile } = useAuth();
  const [dashboardProfile, setDashboardProfile] = useState(vendorProfile);
  const [shows, setShows] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    listVendorShowsRequest()
      .then((data) => {
        setShows(data.shows || []);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));
  }, []);

  const companyName = dashboardProfile?.companyName || 'Vendor Company';
  const tier = dashboardProfile?.tier || 'bronze';

  return (
    <main className="vendor-shell">
      <header className="vendor-header">
        <div>
          <p className="app-kicker">Vendor Portal</p>
          <h1>Vendor Dashboard</h1>
          <p className="muted">{user.email}</p>
        </div>
        <div className="page-actions">
          <Link className="button secondary link-button" to="/vendor/profile">My Profile</Link>
          <Link className="button secondary link-button" to="/vendor/help">Help</Link>
          <LogoutButton />
        </div>
      </header>

      <section className="vendor-summary">
        <VendorAvatar logoUrl={dashboardProfile?.logoUrl} companyName={companyName} size="large" />
        <div>
          <span className="summary-label">Company</span>
          <h2>{companyName}</h2>
          <p className={dashboardProfile?.isProfileComplete ? 'success-text' : 'muted'}>
            Profile {dashboardProfile?.isProfileComplete ? 'complete' : 'incomplete'}
          </p>
        </div>
        <TierBadge tier={tier} />
      </section>

      {status === 'loading' ? <p className="muted">Loading dashboard...</p> : null}
      {status === 'error' ? <p className="form-error">Unable to load dashboard data. Please try again.</p> : null}

      <section className="details-panel">
        <h3>Available shows</h3>
        {shows.length ? (
          <div className="table-wrap">
            <table className="shows-table">
              <thead><tr><th>Show</th><th>Venue</th><th>Dates</th><th>Tier</th><th>Selection opens</th><th>Deadline</th><th>Status</th><th>Booth</th><th>Actions</th></tr></thead>
              <tbody>{shows.map((show) => (
                <tr key={show.id}>
                  <td>{show.name}</td>
                  <td>{show.venueName || 'Not set'}</td>
                  <td>{formatDateRange(show.startDate, show.endDate)}</td>
                  <td><TierBadge tier={tier} /></td>
                  <td>{formatDateTime(show.effectiveOpensAt, show.timezone)}</td>
                  <td>{formatDateTime(show.vendorSelectionDeadline, show.timezone)}</td>
                  <td><SelectionStatusBadge status={show.selectionStatus || selectionState(show)} /></td>
                  <td>{show.assignment ? `Booth ${show.assignment.booth.boothNumber}` : 'None'}</td>
                  <td><div className="row-actions">
                    {!dashboardProfile?.isProfileComplete ? <Link to="/vendor/profile">Complete Profile</Link> : null}
                    <Link to={`/vendor/shows/${show.id}`}>View Show</Link>
                    {show.selectionStatus?.canSelect && !show.assignment ? <Link to={`/vendor/shows/${show.id}/floor-map`}>Select Booth</Link> : null}
                    {show.assignment ? <Link to={`/vendor/shows/${show.id}/my-booth`}>View My Booth</Link> : null}
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="muted">No available shows yet.</p>}
      </section>

      <section className="placeholder-grid">
        <article>
          <h3>My Booth</h3>
          <p>Your selected booth will appear here after confirmation.</p>
        </article>
      </section>
    </main>
  );
}

function selectionState(assignment) {
  if (assignment.selectionPaused) return 'Paused';
  if (['closed', 'archived'].includes(assignment.showStatus)) return 'Closed';
  if (assignment.vendorSelectionDeadline && Date.now() > new Date(assignment.vendorSelectionDeadline).getTime()) return 'Closed';
  if (!assignment.effectiveOpensAt || Date.now() < new Date(assignment.effectiveOpensAt).getTime()) return 'Not open';
  return 'Open';
}
