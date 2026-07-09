import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SelectionStatusBadge } from '../components/SelectionStatusBadge.jsx';
import { TierBadge } from '../components/TierBadge.jsx';
import { VendorMapPreview } from '../components/VendorMapPreview.jsx';
import { VendorAvatar } from '../components/VendorAvatar.jsx';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import {
  createAdminAssignmentRequest,
  getAdminShowAssignmentsRequest,
  moveAdminAssignmentRequest,
  releaseAdminAssignmentRequest
} from '../services/assignmentService.js';
import { getEventDayRequest } from '../services/eventDayService.js';
import { getFloorMapImageBlobUrlRequest } from '../services/mapService.js';
import './FloorMap.css';
import './Shows.css';

export function AdminEventDayPage() {
  const { showId } = useParams();
  const [data, setData] = useState(null);
  const [mapData, setMapData] = useState(null);
  const [mapImageUrl, setMapImageUrl] = useState('');
  const [showMapOpen, setShowMapOpen] = useState(false);
  const [filters, setFilters] = useState({ search: '', quick: 'all', assignment: 'all', tier: 'all', boothType: 'all' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { load(); }, [showId]);
  useEffect(() => () => {
    if (mapImageUrl) URL.revokeObjectURL(mapImageUrl);
  }, [mapImageUrl]);

  async function load() {
    setError('');
    try {
      const [eventData, assignmentData] = await Promise.all([
        getEventDayRequest(showId),
        getAdminShowAssignmentsRequest(showId)
      ]);
      setData(eventData);
      setMapData(assignmentData);
      if (assignmentData.map) {
        setMapImageUrl(await getFloorMapImageBlobUrlRequest(showId));
      } else {
        setMapImageUrl('');
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load vendor activity.');
    }
  }

  async function assignBooth(vendor, boothId) {
    if (!boothId) {
      setError('Choose a booth number before assigning.');
      return;
    }
    setError('');
    setMessage('');
    try {
      await createAdminAssignmentRequest(showId, {
        boothId,
        vendorProfileId: vendor.vendor.id,
        notes: 'Assigned from Vendor Activity.'
      });
      setMessage(`Booth assigned to ${vendor.vendor.companyName || vendor.vendor.email}.`);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to assign booth.');
    }
  }

  async function updateAssignedBooth(vendor, value) {
    if (!vendor.assignment || String(value) === String(vendor.assignment.boothId)) return;
    setError('');
    setMessage('');
    try {
      if (value === 'unassign') {
        await releaseAdminAssignmentRequest(vendor.assignment.id, { notes: 'Unassigned from Vendor Activity.' });
        setMessage(`Booth unassigned from ${vendor.vendor.companyName || vendor.vendor.email}.`);
      } else {
        await moveAdminAssignmentRequest(vendor.assignment.id, {
          newBoothId: value,
          notes: 'Changed from Vendor Activity.'
        });
        setMessage(`Booth updated for ${vendor.vendor.companyName || vendor.vendor.email}.`);
      }
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update booth assignment.');
    }
  }

  const boothTypes = useMemo(() => Array.from(new Set((data?.booths || []).map((booth) => booth.boothType))), [data]);
  const availableBooths = useMemo(() => {
    const assignedBoothIds = new Set((data?.assignments || []).map((assignment) => Number(assignment.boothId)));
    return (data?.booths || [])
      .filter((booth) => booth.status === 'available' && !assignedBoothIds.has(Number(booth.id)))
      .sort((a, b) => Number(a.boothNumber) - Number(b.boothNumber));
  }, [data]);
  const mapAssignments = useMemo(() => (data?.assignments || [])
    .filter((assignment) => assignment.status === 'active')
    .map((assignment) => ({
      boothId: assignment.boothId,
      companyName: assignment.vendor?.companyName,
      logoUrl: assignment.vendor?.logoUrl
    })), [data]);
  const vendors = useMemo(() => (data?.vendors || []).filter((item) => {
    const text = `${item.vendor.companyName || ''} ${item.vendor.contactName || ''} ${item.assignment?.boothNumber || ''}`.toLowerCase();
    const quick = filters.quick === 'all'
      || (filters.quick === 'incomplete' && !item.vendor.isProfileComplete)
      || (filters.quick === 'excluded' && item.excluded);
    const assignment = filters.assignment === 'all'
      || (filters.assignment === 'assigned' && item.assignment)
      || (filters.assignment === 'unassigned' && !item.assignment);
    const tier = filters.tier === 'all' || item.vendor.tier === filters.tier;
    const boothType = filters.boothType === 'all' || item.assignment?.boothType === filters.boothType;
    return quick && assignment && tier && boothType && text.includes(filters.search.toLowerCase());
  }), [data, filters]);

  return (
    <AdminLayout>
      <section className="page-heading">
        <div><p className="app-kicker">Vendor Activity</p><h2>{data?.show?.name || 'Vendor Activity'}</h2></div>
        <div className="page-actions no-print">
          <button className="button primary" disabled={!mapData?.map || !mapImageUrl} type="button" onClick={() => setShowMapOpen(true)}>Show Map</button>
          <Link className="button secondary link-button" to={`/admin/shows/${showId}`}>Event Details</Link>
          <button className="button secondary" type="button" onClick={() => window.print()}>Print Vendor List</button>
        </div>
      </section>
      {message ? <div className="success-message">{message}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}
      <section className="show-toolbar booth-toolbar no-print">
        <input placeholder="Search vendor or booth" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
        <select value={filters.assignment} onChange={(event) => setFilters((current) => ({ ...current, assignment: event.target.value }))}><option value="all">All assignments</option><option value="assigned">Assigned booths</option><option value="unassigned">Unassigned vendors</option></select>
        <select value={filters.quick} onChange={(event) => setFilters((current) => ({ ...current, quick: event.target.value }))}><option value="all">All vendors</option><option value="incomplete">Incomplete profiles</option><option value="excluded">Excluded vendors</option></select>
        <select value={filters.tier} onChange={(event) => setFilters((current) => ({ ...current, tier: event.target.value }))}><option value="all">All tiers</option><option value="platinum">Platinum</option><option value="gold">Gold</option><option value="silver">Silver</option><option value="bronze">Bronze</option></select>
        <select value={filters.boothType} onChange={(event) => setFilters((current) => ({ ...current, boothType: event.target.value }))}><option value="all">All booth types</option>{boothTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
      </section>
      {data ? (
        <div className="table-wrap">
          <table className="shows-table vendor-activity-table">
            <thead><tr><th>Vendor</th><th>Contact</th><th>Phone</th><th>Tier</th><th>Booth</th><th>Type</th><th>Status</th></tr></thead>
            <tbody>
              {vendors.map((item) => (
                <tr key={item.vendor.id}>
                  <td>
	                    <div className="vendor-cell vendor-activity-cell">
	                      <VendorAvatar logoUrl={item.vendor.logoUrl} companyName={item.vendor.companyName} />
	                      <Link to={`/admin/vendors/${item.vendor.id}`}>{item.vendor.companyName || item.vendor.email}</Link>
	                    </div>
                  </td>
                  <td>{item.vendor.contactName || 'Not set'}</td>
                  <td>{item.vendor.phone || 'Not set'}</td>
                  <td><TierBadge tier={item.vendor.tier} /></td>
                  <td>
                    <span className="print-only">{item.assignment ? `Booth ${item.assignment.boothNumber}` : 'Unassigned'}</span>
                    {item.assignment ? (
                      <select
                        aria-label={`Change booth for ${item.vendor.companyName || item.vendor.email}`}
                        className="booth-assignment-select no-print"
                        value={item.assignment.boothId}
                        onChange={(event) => updateAssignedBooth(item, event.target.value)}
                      >
                        <option value={item.assignment.boothId}>Booth {item.assignment.boothNumber}</option>
                        {availableBooths.map((booth) => <option key={booth.id} value={booth.id}>Booth {booth.boothNumber}</option>)}
                        <option value="unassign">Unassign</option>
                      </select>
	                    ) : (
	                      <select
	                        aria-label={`Booth number for ${item.vendor.companyName || item.vendor.email}`}
	                        className="booth-assignment-select no-print"
	                        defaultValue=""
	                        onChange={(event) => assignBooth(item, event.target.value)}
	                      >
	                        <option value="">{availableBooths.length ? 'Choose booth' : 'No booths available'}</option>
	                        {availableBooths.map((booth) => <option key={booth.id} value={booth.id}>Booth {booth.boothNumber}</option>)}
	                      </select>
	                    )}
                  </td>
                  <td>{item.assignment?.boothType || 'Not set'}</td>
	                  <td><SelectionStatusBadge status={item.selectionStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !error ? <p className="muted">Loading vendor activity...</p> : null}
      {showMapOpen ? (
        <MapModal
          assignments={mapAssignments}
          imageUrl={mapImageUrl}
          objects={mapData?.objects || []}
          onClose={() => setShowMapOpen(false)}
          title={data?.show?.name || 'Show map'}
        />
      ) : null}
    </AdminLayout>
  );
}

function MapModal({ assignments, imageUrl, objects, onClose, title }) {
  return (
    <div className="metric-modal no-print" role="dialog" aria-modal="true" aria-label="Show map">
      <button className="metric-modal-backdrop" onClick={onClose} type="button" aria-label="Close show map" />
      <div className="metric-modal-panel map-modal-panel">
        <div className="panel-heading">
          <div>
            <p className="app-kicker">Show Map</p>
            <h3>{title}</h3>
          </div>
          <button aria-label="Close show map" className="panel-close" onClick={onClose} title="Close" type="button" />
        </div>
        {imageUrl ? (
          <VendorMapPreview imageUrl={imageUrl} objects={objects} assignments={assignments} readonly />
        ) : (
          <p className="muted">No floor map uploaded.</p>
        )}
      </div>
    </div>
  );
}
