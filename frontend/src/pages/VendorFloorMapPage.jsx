import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SelectionStatusBadge } from '../components/SelectionStatusBadge.jsx';
import { VendorMapPreview } from '../components/VendorMapPreview.jsx';
import {
  createVendorChangeRequestRequest,
  getVendorFloorMapImageBlobUrlRequest,
  getVendorFloorMapRequest,
  listVendorChangeRequestsRequest,
  selectVendorBoothRequest
} from '../services/assignmentService.js';
import { formatDateTime } from '../utils/dateFormat.js';
import './Dashboard.css';
import './FloorMap.css';
import './Shows.css';

export function VendorFloorMapPage() {
  const { showId } = useParams();
  const [data, setData] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(null);
  const [changeRequests, setChangeRequests] = useState([]);
  const [isRequestingChange, setIsRequestingChange] = useState(false);
  const [requestForm, setRequestForm] = useState({ requestedBoothId: '', message: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadMap();
    function refreshOnFocus() {
      loadMap();
    }
    window.addEventListener('focus', refreshOnFocus);
    return () => window.removeEventListener('focus', refreshOnFocus);
  }, [showId]);

  async function loadMap() {
    setError('');
    try {
      const nextData = await getVendorFloorMapRequest(showId);
      setData(nextData);
      try {
        const requestData = await listVendorChangeRequestsRequest(showId);
        setChangeRequests(requestData.requests || []);
      } catch {
        setChangeRequests([]);
      }
      const url = await getVendorFloorMapImageBlobUrlRequest(showId);
      setImageUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return url;
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load floor map.');
    }
  }

  async function submitChangeRequest(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await createVendorChangeRequestRequest(showId, requestForm);
      setRequestForm({ requestedBoothId: '', message: '' });
      setIsRequestingChange(false);
      setMessage('Change request submitted.');
      await loadMap();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to submit change request.');
    }
  }

  async function confirmSelection() {
    if (!selected) return;
    setError('');
    setMessage('');
    try {
      const result = await selectVendorBoothRequest(showId, selected.booth.id);
      setConfirmed(result.assignment);
      setSelected(null);
      setMessage('Booth selection confirmed.');
      await loadMap();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to select booth.');
      await loadMap();
    }
  }

  const show = data?.show;
  const booths = data?.objects || [];
  const readiness = data?.readiness;
  const assignedBoothIds = new Set((data?.assignments || []).map((assignment) => Number(assignment.boothId)));
  const availableBooths = booths
    .filter((object) => object.objectType === 'booth' && object.booth?.status === 'available' && !assignedBoothIds.has(Number(object.booth.id)))
    .map((object) => object.booth)
    .sort((a, b) => Number(a.boothNumber) - Number(b.boothNumber));
  const hasPendingRequest = changeRequests.some((request) => request.status === 'pending');

  return (
    <main className="vendor-shell">
      <header className="vendor-header">
        <div>
          <p className="app-kicker">Floor Map</p>
          <h1>{show?.name || 'Floor Map'}</h1>
        </div>
        <div className="page-actions">
          <Link className="button secondary link-button" to="/vendor/profile">My Profile</Link>
          <Link className="button secondary link-button" to={`/vendor/shows/${showId}`}>Event Details</Link>
          <Link className="button secondary link-button" to="/vendor/help">Help</Link>
        </div>
      </header>
      {message ? <div className="success-message">{message}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}
      {show?.selectionStatus ? (
        <section className="details-panel selection-summary-panel">
          <div>
            <span className="summary-label">Selection status</span>
            <SelectionStatusBadge status={show.selectionStatus} />
          </div>
          {show.assignment ? <p className="muted">You already have Booth {show.assignment.booth.boothNumber}. You can still view the map.</p> : null}
          {readiness && !readiness.canSelect ? <p className="muted">{readiness.reasons[0]}</p> : null}
          {show.selectionStatus?.code === 'profile_incomplete' ? <Link className="button primary link-button" to="/vendor/profile">Complete Profile</Link> : null}
          {show.assignment ? (
            <button
              className="button primary"
              disabled={hasPendingRequest}
              type="button"
              onClick={() => setIsRequestingChange(true)}
            >
              Request Change
            </button>
          ) : null}
        </section>
      ) : null}
      {isRequestingChange ? (
        <ChangeRequestModal
          availableBooths={availableBooths}
          form={requestForm}
          onChange={setRequestForm}
          onClose={() => setIsRequestingChange(false)}
          onSubmit={submitChangeRequest}
        />
      ) : null}
      <section className="details-panel">
        <div className="legend-row">
          <span className="booth-status booth-status-available">Available</span>
          <span className="booth-status booth-status-reserved">Reserved</span>
          <span className="booth-status booth-status-unavailable">Unavailable</span>
          <span className="booth-status booth-status-assigned">Assigned</span>
        </div>
        {imageUrl ? (
          <VendorMapPreview
            assignments={data.assignments}
            imageUrl={imageUrl}
            objects={booths}
            onBoothClick={(detail) => setSelected(detail)}
            ownAssignment={show?.assignment}
            readonly={!readiness?.canSelect}
            selectedBoothId={selected?.booth?.id}
          />
        ) : <p className="muted">Loading map...</p>}
      </section>
      {selected ? (
        <section className="details-panel vendor-selection-panel">
          <h3>Booth {selected.booth.boothNumber}</h3>
          {selected.assignment ? <p className="muted">Assigned to {selected.assignment.companyName}</p> : null}
          <dl>
            <Info label="Name" value={selected.booth.boothName || 'Not set'} />
            <Info label="Type" value={selected.booth.boothType} />
            <Info label="Dimensions" value={[selected.booth.widthLabel, selected.booth.depthLabel].filter(Boolean).join(' x ') || 'Not set'} />
            <Info label="Price" value={selected.booth.price ? `$${selected.booth.price}` : 'Not set'} />
            <Info label="Notes" value={selected.booth.notes || 'None'} />
          </dl>
          {selected.selectable && readiness?.canSelect ? (
            <button className="button primary" type="button" onClick={confirmSelection}>Confirm Booth Selection</button>
          ) : null}
        </section>
      ) : null}
      {confirmed ? (
        <section className="details-panel">
          <h3>Selection confirmed</h3>
          <p>Booth {confirmed.booth.boothNumber} selected on {formatDateTime(confirmed.confirmedAt, confirmed.timezone)}.</p>
          <div className="page-actions">
            <Link className="button primary link-button" to={`/vendor/shows/${showId}/my-booth`}>View My Booth</Link>
            <Link className="button secondary link-button" to={`/vendor/shows/${showId}/floor-map`}>Return to Floor Map</Link>
          </div>
        </section>
      ) : null}
      <section className="details-panel">
        <h3>Change Requests</h3>
        {changeRequests.length ? (
          <div className="table-wrap">
            <table className="shows-table compact-table">
              <thead><tr><th>Date</th><th>Current booth</th><th>Requested booth</th><th>Status</th><th>Response</th></tr></thead>
              <tbody>{changeRequests.map((request) => (
                <tr key={request.id}>
                  <td>{formatDateTime(request.createdAt, show?.timezone)}</td>
                  <td>Booth {request.currentBooth.boothNumber}</td>
                  <td>Booth {request.requestedBooth.boothNumber}</td>
                  <td>{titleize(request.status)}</td>
                  <td>{request.adminResponse || 'None'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No change requests yet.</p>
        )}
      </section>
    </main>
  );
}

function ChangeRequestModal({ availableBooths, form, onChange, onClose, onSubmit }) {
  return (
    <div className="metric-modal" role="dialog" aria-modal="true" aria-label="Request booth change">
      <button className="metric-modal-backdrop" onClick={onClose} type="button" aria-label="Close request change" />
      <div className="metric-modal-panel vendor-profile-modal">
        <div className="panel-heading">
          <div>
            <p className="app-kicker">Booth Change</p>
            <h3>Request Change</h3>
          </div>
          <button aria-label="Close request change" className="panel-close" onClick={onClose} title="Close" type="button" />
        </div>
        <form className="vendor-form inline-vendor-form" onSubmit={onSubmit}>
          <label>Requested booth<select value={form.requestedBoothId} onChange={(event) => onChange((current) => ({ ...current, requestedBoothId: event.target.value }))}>
            <option value="">{availableBooths.length ? 'Choose booth' : 'No booths available'}</option>
            {availableBooths.map((booth) => <option key={booth.id} value={booth.id}>Booth {booth.boothNumber}</option>)}
          </select></label>
          <label>Reason<textarea value={form.message} onChange={(event) => onChange((current) => ({ ...current, message: event.target.value }))} /></label>
          <div className="row-actions">
            <button className="button primary" disabled={!form.requestedBoothId} type="submit">Submit Request</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return <><dt>{label}</dt><dd>{value}</dd></>;
}

function titleize(value) {
  return String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
