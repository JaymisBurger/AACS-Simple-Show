import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TierBadge } from '../components/TierBadge.jsx';
import { getVendorShowRequest } from '../services/assignmentService.js';
import { formatDateRange, formatDateTime } from '../utils/dateFormat.js';
import './Dashboard.css';
import './Shows.css';

export function VendorShowDetailsPage() {
  const { showId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getVendorShowRequest(showId)
      .then(setData)
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load show.'));
  }, [showId]);

  const show = data?.show;
  const readiness = data?.readiness;

  return (
    <main className="vendor-shell">
      <header className="vendor-header">
        <div>
          <p className="app-kicker">Vendor Portal</p>
          <h1>{show?.name || 'Event Details'}</h1>
        </div>
        <div className="page-actions"><Link className="button secondary link-button" to="/vendor">Dashboard</Link><Link className="button secondary link-button" to="/vendor/help">Help</Link></div>
      </header>
      {error ? <div className="form-error">{error}</div> : null}
      {!show && !error ? <p className="muted">Loading show...</p> : null}
      {show ? (
        <>
          <section className="details-panel">
            <dl>
              <Info label="Venue" value={show.venueName || 'Not set'} />
              <Info label="Address" value={show.venueAddress || 'Not set'} />
              <Info label="Dates" value={formatDateRange(show.startDate, show.endDate)} />
              <dt>Vendor tier</dt><dd><TierBadge tier={show.vendorTier} /></dd>
              <Info label="Tier opens" value={formatDateTime(show.tierOpensAt, show.timezone)} />
              <Info label="Special access" value={formatDateTime(show.specialAccessOpensAt, show.timezone)} />
              <Info label="Effective opens" value={formatDateTime(show.effectiveOpensAt, show.timezone)} />
              <Info label="Deadline" value={formatDateTime(show.vendorSelectionDeadline, show.timezone)} />
              <Info label="Selection paused" value={show.selectionPaused ? 'Yes' : 'No'} />
            </dl>
          </section>
          {show.assignment ? (
            <div className="success-message">You have booth {show.assignment.booth.boothNumber} for this show.</div>
          ) : null}
          {readiness && !readiness.canSelect ? (
            <div className="form-error">
              {readiness.reasons[0]} <Link to="/vendor/profile">Complete profile</Link>
            </div>
          ) : null}
          <div className="page-actions">
            <Link className="button primary link-button" to={`/vendor/shows/${show.id}/floor-map`}>View Floor Map</Link>
            {show.assignment ? <Link className="button secondary link-button" to={`/vendor/shows/${show.id}/my-booth`}>My Booth</Link> : null}
          </div>
        </>
      ) : null}
    </main>
  );
}

function Info({ label, value }) {
  return <><dt>{label}</dt><dd>{value}</dd></>;
}
