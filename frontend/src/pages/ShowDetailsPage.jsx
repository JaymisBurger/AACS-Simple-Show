import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { TierBadge } from '../components/TierBadge.jsx';
import { VendorMapPreview } from '../components/VendorMapPreview.jsx';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import { listBoothsRequest } from '../services/boothService.js';
import {
  approveAdminChangeRequestRequest,
  denyAdminChangeRequestRequest,
  getAdminShowAssignmentsRequest,
  listAdminChangeRequestsRequest
} from '../services/assignmentService.js';
import { getFloorMapImageBlobUrlRequest, getFloorMapRequest, listMapObjectsRequest } from '../services/mapService.js';
import { getShowReadinessRequest } from '../services/readinessService.js';
import { getShowRequest } from '../services/showService.js';
import { listShowVendorsRequest } from '../services/vendorService.js';
import { formatDateRange, formatDateTime } from '../utils/dateFormat.js';
import './FloorMap.css';
import './Shows.css';

const tiers = ['platinum', 'gold', 'silver', 'bronze'];

export function ShowDetailsPage() {
  const { id } = useParams();
  const [show, setShow] = useState(null);
  const [mapChecklist, setMapChecklist] = useState({ floorMapUploaded: false, boothsCreated: false });
  const [floorMap, setFloorMap] = useState(null);
  const [floorMapImageUrl, setFloorMapImageUrl] = useState('');
  const [mapObjects, setMapObjects] = useState([]);
  const [boothStats, setBoothStats] = useState(null);
  const [booths, setBooths] = useState([]);
  const [vendorStats, setVendorStats] = useState(null);
  const [assignmentStats, setAssignmentStats] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [readinessVendors, setReadinessVendors] = useState([]);
  const [readinessChecklist, setReadinessChecklist] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [denialRequest, setDenialRequest] = useState(null);
  const [denialReason, setDenialReason] = useState('');
  const [reviewMessage, setReviewMessage] = useState('');
  const [activeMetric, setActiveMetric] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    getShowRequest(id)
      .then((data) => {
        setShow(data.show);
        setStatus('ready');
      })
      .catch((requestError) => {
        setError(requestError.response?.data?.message || 'Unable to load show.');
        setStatus('error');
      });
  }, [id]);

  useEffect(() => {
    let objectUrl = '';
    getFloorMapRequest(id)
      .then(async (data) => {
        setFloorMap(data.map || null);
        setMapChecklist({
          floorMapUploaded: Boolean(data.map),
          boothsCreated: Number(data.boothCount || 0) > 0
        });
        if (!data.map) {
          setFloorMapImageUrl('');
          setMapObjects([]);
          return;
        }
        const [imageUrl, objectsData] = await Promise.all([
          getFloorMapImageBlobUrlRequest(id),
          listMapObjectsRequest(id)
        ]);
        objectUrl = imageUrl;
        setFloorMapImageUrl(imageUrl);
        setMapObjects(objectsData.objects || []);
      })
      .catch(() => {
        setFloorMap(null);
        setFloorMapImageUrl('');
        setMapObjects([]);
        setMapChecklist({ floorMapUploaded: false, boothsCreated: false });
      });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  async function loadBoothData() {
    try {
      const data = await listBoothsRequest(id);
      setBooths(data.booths || []);
      setBoothStats(data.stats);
      setMapChecklist((current) => ({
        ...current,
        boothsCreated: Number(data.stats?.total || 0) > 0
      }));
    } catch {
      setBooths([]);
      setBoothStats(null);
    }
  }

  async function loadAssignmentData() {
    try {
      const data = await getAdminShowAssignmentsRequest(id);
      setAssignmentStats(data.stats);
      setAssignments(data.assignments || []);
    } catch {
      setAssignmentStats(null);
      setAssignments([]);
    }
  }

  async function loadChangeRequests() {
    try {
      const data = await listAdminChangeRequestsRequest(id);
      setChangeRequests(data.requests || []);
    } catch {
      setChangeRequests([]);
    }
  }

  useEffect(() => {
    listBoothsRequest(id)
      .then((data) => {
        setBooths(data.booths || []);
        setBoothStats(data.stats);
        setMapChecklist((current) => ({
          ...current,
          boothsCreated: Number(data.stats?.total || 0) > 0
        }));
      })
      .catch(() => {
        setBooths([]);
        setBoothStats(null);
      });
  }, [id]);

  useEffect(() => {
    listShowVendorsRequest(id)
      .then((data) => setVendorStats(data.stats))
      .catch(() => setVendorStats(null));
  }, [id]);

  useEffect(() => {
    loadAssignmentData();
  }, [id]);

  useEffect(() => {
    loadChangeRequests();
  }, [id]);

  useEffect(() => {
    getShowReadinessRequest(id)
      .then((data) => {
        setReadinessChecklist(data.readiness?.checklist || []);
        setReadinessVendors(data.readiness?.vendors || []);
      })
      .catch(() => {
        setReadinessChecklist([]);
        setReadinessVendors([]);
      });
  }, [id]);

  const mapAssignments = assignments
    .filter((assignment) => assignment.status === 'active')
    .map((assignment) => ({
      boothId: assignment.boothId,
      companyName: assignment.vendor?.companyName,
      logoUrl: assignment.vendor?.logoUrl
    }));
  const boothsLeft = assignmentStats?.availableBooths ?? boothStats?.available;

  async function approveRequest(requestId) {
    setReviewMessage('');
    try {
      await approveAdminChangeRequestRequest(requestId);
      setReviewMessage('Change request approved.');
      await Promise.all([loadChangeRequests(), loadAssignmentData(), loadBoothData()]);
    } catch (requestError) {
      setReviewMessage(requestError.response?.data?.message || 'Unable to approve change request.');
    }
  }

  async function denyRequest(event) {
    event.preventDefault();
    if (!denialReason.trim()) {
      setReviewMessage('A denial reason is required.');
      return;
    }
    setReviewMessage('');
    try {
      await denyAdminChangeRequestRequest(denialRequest.id, denialReason);
      setDenialRequest(null);
      setDenialReason('');
      setReviewMessage('Change request denied.');
      await loadChangeRequests();
    } catch (requestError) {
      setReviewMessage(requestError.response?.data?.message || 'Unable to deny change request.');
    }
  }

  return (
    <AdminLayout>
      {status === 'loading' ? <p className="muted">Loading show...</p> : null}
      {error ? <div className="form-error">{error}</div> : null}
      {show ? (
        <>
          <section className="page-heading">
            <div>
              <p className="app-kicker">Event Details</p>
              <h2>{show.name || 'Untitled show'}</h2>
            </div>
            <div className="page-actions">
              <StatusBadge status={show.status} />
              {show.status !== 'archived' ? (
                <Link className="button secondary link-button" to={`/admin/shows/${show.id}/edit`}>
                  Edit Show
                </Link>
              ) : null}
              <Link className="button secondary link-button" to={`/admin/shows/${show.id}/event-day`}>
                Vendor Activity
              </Link>
              <Link className="button secondary link-button" to={`/admin/shows/${show.id}/assignments`}>
                Booth Assignments
              </Link>
            </div>
          </section>

          <section className="details-grid">
            <article className="details-panel">
              <h3>Show information</h3>
              <dl>
                <Info label="Venue" value={show.venueName || 'Not set'} />
                <Info label="Venue address" value={show.venueAddress || 'Not set'} />
                <Info label="Event dates" value={formatDateRange(show.startDate, show.endDate)} />
                <Info label="Vendor selection deadline" value={formatDateTime(show.vendorSelectionDeadline, show.timezone)} />
                <Info label="Booths Left" value={boothsLeft ?? 'Loading...'} />
                <Info label="Timezone" value={show.timezone || 'Not set'} />
                <Info label="Selection paused" value={show.selectionPaused ? 'Yes' : 'No'} />
                <Info label="Created date" value={formatDateTime(show.createdAt, show.timezone)} />
                <Info label="Last updated date" value={formatDateTime(show.updatedAt, show.timezone)} />
              </dl>
            </article>
            <article className="details-panel">
              <h3>Setup checklist</h3>
              <ul className="checklist">
                {(readinessChecklist.length ? readinessChecklist : fallbackChecklist(show, mapChecklist, boothStats, vendorStats, assignmentStats)).map((item) => (
                  <ChecklistItem
                    complete={item.complete}
                    key={item.key || item.label}
                    label={item.label}
                    to={checklistItemPath(show.id, item)}
                  />
                ))}
              </ul>
            </article>
          </section>

          <section className="details-panel">
            <div className="panel-heading">
              <div>
                <h3>Booth Change Requests</h3>
                <p className="muted">Review booth change requests submitted by vendors.</p>
              </div>
            </div>
            {reviewMessage ? <div className={reviewMessage.includes('Unable') || reviewMessage.includes('required') ? 'form-error' : 'success-message'}>{reviewMessage}</div> : null}
            {changeRequests.length ? (
              <div className="table-wrap">
                <table className="shows-table compact-table">
                  <thead>
                    <tr>
                      <th>Vendor</th>
                      <th>Current booth</th>
                      <th>Requested booth</th>
                      <th>Status</th>
                      <th>Reason</th>
                      <th>Admin response</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changeRequests.map((request) => (
                      <tr key={request.id}>
                        <td>
                          <Link to={`/admin/vendors/${request.vendor.id}`}>
                            {request.vendor.companyName || request.vendor.email || 'Unnamed vendor'}
                          </Link>
                        </td>
                        <td>{request.currentBooth ? `Booth ${request.currentBooth.boothNumber}` : 'None'}</td>
                        <td>{request.requestedBooth ? `Booth ${request.requestedBooth.boothNumber}` : 'None'}</td>
                        <td><span className={`request-status ${request.status}`}>{titleize(request.status)}</span></td>
                        <td>{request.message || 'None'}</td>
                        <td>{request.adminResponse || 'None'}</td>
                        <td>
                          {request.status === 'pending' ? (
                            <div className="row-actions">
                              <button className="button primary" type="button" onClick={() => approveRequest(request.id)}>Accept</button>
                              <button type="button" onClick={() => setDenialRequest(request)}>Deny</button>
                            </div>
                          ) : (
                            <span className="muted">Reviewed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">No booth change requests yet.</p>
            )}
          </section>

          <section className="details-panel show-map-preview-panel">
            <h3>Floor map preview</h3>
            {floorMap ? (
              <>
                {floorMapImageUrl ? (
                  <VendorMapPreview imageUrl={floorMapImageUrl} objects={mapObjects} assignments={mapAssignments} readonly />
                ) : (
                  <p className="muted">Loading floor map preview...</p>
                )}
                <div className="page-actions map-preview-actions">
                  <Link className="button primary link-button" to={`/admin/shows/${show.id}/floor-map`}>
                    Manage Floor Map
                  </Link>
                  <Link className="button secondary link-button" to={`/admin/shows/${show.id}/booths`}>
                    Manage Booths
                  </Link>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <h3>No floor map uploaded</h3>
                <p>Upload a floor map to preview placed booths and map objects here.</p>
                <div className="page-actions map-preview-actions">
                  <Link className="button primary link-button" to={`/admin/shows/${show.id}/floor-map`}>
                    Manage Floor Map
                  </Link>
                  <Link className="button secondary link-button" to={`/admin/shows/${show.id}/booths`}>
                    Manage Booths
                  </Link>
                </div>
              </div>
            )}
          </section>

          <section className="details-panel">
            <h3>Tier opening schedule</h3>
            <div className="tier-schedule">
              {tiers.map((tier) => (
                <div className="tier-row" key={tier}>
                  <TierBadge tier={tier} />
                  <span>{formatDateTime(show.tierWindows?.[tier]?.opensAt, show.timezone)}</span>
                  <span className={`window-state ${tierWindowStatus(show, tier).replace(' ', '-')}`}>
                    {tierWindowStatus(show, tier)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {boothStats ? (
            <section className="details-panel">
              <h3>Booth totals</h3>
              <div className="booth-stats">
                <StatButton label="Total" metricKey="booths:total" onSelect={setActiveMetric} selected={activeMetric} value={boothStats.total} />
                <StatButton label="Available" metricKey="booths:available" onSelect={setActiveMetric} selected={activeMetric} value={boothStats.available} />
                <StatButton label="Reserved" metricKey="booths:reserved" onSelect={setActiveMetric} selected={activeMetric} value={boothStats.reserved} />
                <StatButton label="Unavailable" metricKey="booths:unavailable" onSelect={setActiveMetric} selected={activeMetric} value={boothStats.unavailable} />
                <StatButton label="Assigned" metricKey="booths:assigned" onSelect={setActiveMetric} selected={activeMetric} value={boothStats.assigned} />
                <StatButton label="Featured" metricKey="booths:featured" onSelect={setActiveMetric} selected={activeMetric} value={boothStats.featured} />
              </div>
            </section>
          ) : null}

          {vendorStats ? (
            <section className="details-panel">
              <h3>Vendor totals</h3>
              <div className="booth-stats">
                <StatButton label="Total" metricKey="vendors:total" onSelect={setActiveMetric} selected={activeMetric} value={vendorStats.total} />
                <StatButton label="Platinum" metricKey="vendors:platinum" onSelect={setActiveMetric} selected={activeMetric} value={vendorStats.platinum} />
                <StatButton label="Gold" metricKey="vendors:gold" onSelect={setActiveMetric} selected={activeMetric} value={vendorStats.gold} />
                <StatButton label="Silver" metricKey="vendors:silver" onSelect={setActiveMetric} selected={activeMetric} value={vendorStats.silver} />
                <StatButton label="Bronze" metricKey="vendors:bronze" onSelect={setActiveMetric} selected={activeMetric} value={vendorStats.bronze} />
                <StatButton label="Excluded" metricKey="vendors:excluded" onSelect={setActiveMetric} selected={activeMetric} value={vendorStats.excluded} />
                <StatButton label="Profile incomplete" metricKey="vendors:profileIncomplete" onSelect={setActiveMetric} selected={activeMetric} value={vendorStats.profileIncomplete} />
              </div>
            </section>
          ) : null}

          {assignmentStats ? (
            <section className="details-panel">
              <h3>Assignment totals</h3>
              <div className="booth-stats">
                <StatButton label="Eligible vendors" metricKey="assignments:eligibleVendors" onSelect={setActiveMetric} selected={activeMetric} value={assignmentStats.eligibleVendors} />
                <StatButton label="Excluded vendors" metricKey="assignments:excludedVendors" onSelect={setActiveMetric} selected={activeMetric} value={assignmentStats.excludedVendors} />
                <StatButton label="Vendors with booths" metricKey="assignments:vendorsWithBooths" onSelect={setActiveMetric} selected={activeMetric} value={assignmentStats.vendorsWithBooths} />
                <StatButton label="Vendors without booths" metricKey="assignments:vendorsWithoutBooths" onSelect={setActiveMetric} selected={activeMetric} value={assignmentStats.vendorsWithoutBooths} />
                <StatButton label="Available booths" metricKey="assignments:availableBooths" onSelect={setActiveMetric} selected={activeMetric} value={assignmentStats.availableBooths} />
                <StatButton label="Assigned booths" metricKey="assignments:assignedBooths" onSelect={setActiveMetric} selected={activeMetric} value={assignmentStats.assignedBooths} />
              </div>
            </section>
          ) : null}

          {activeMetric ? (
            <MetricDetailsModal
              activeMetric={activeMetric}
              items={metricItems(activeMetric, { assignments, booths, readinessVendors })}
              onClose={() => setActiveMetric(null)}
              showId={show.id}
            />
          ) : null}
          {denialRequest ? (
            <DenyRequestModal
              onClose={() => {
                setDenialRequest(null);
                setDenialReason('');
              }}
              onSubmit={denyRequest}
              reason={denialReason}
              request={denialRequest}
              setReason={setDenialReason}
            />
          ) : null}
        </>
      ) : null}
    </AdminLayout>
  );
}

function DenyRequestModal({ onClose, onSubmit, reason, request, setReason }) {
  return (
    <div className="metric-modal" role="dialog" aria-modal="true" aria-label="Deny booth change request">
      <button className="metric-modal-backdrop" onClick={onClose} type="button" aria-label="Close denial form" />
      <div className="metric-modal-panel">
        <div className="panel-heading">
          <div>
            <p className="app-kicker">Booth Change</p>
            <h3>Deny Request</h3>
          </div>
          <button aria-label="Close denial form" className="panel-close" onClick={onClose} title="Close" type="button" />
        </div>
        <p className="muted">
          {request.vendor.companyName || 'Vendor'} requested Booth {request.requestedBooth?.boothNumber || 'unknown'}.
        </p>
        <form className="vendor-form inline-vendor-form" onSubmit={onSubmit}>
          <label>
            Reason for denial
            <textarea
              autoFocus
              required
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <div className="row-actions">
            <button className="button primary" type="submit">Deny Request</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function ChecklistItem({ complete, label, to }) {
  return (
    <li className={complete ? 'complete' : 'incomplete'}>
      <Link className="checklist-link" to={to}>{label}</Link>
    </li>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function StatButton({ label, metricKey, onSelect, selected, value }) {
  return (
    <button
      className={selected === metricKey ? 'metric-card active' : 'metric-card'}
      onClick={() => onSelect(metricKey)}
      type="button"
    >
      <strong>{value}</strong>
      <span>{label}</span>
    </button>
  );
}

function MetricDetailsModal({ activeMetric, items, onClose, showId }) {
  const title = metricTitle(activeMetric);
  const section = String(activeMetric || '').split(':')[0];

  return (
    <div className="metric-modal" role="dialog" aria-modal="true" aria-label={title}>
      <button className="metric-modal-backdrop" onClick={onClose} type="button" aria-label="Close metric details" />
      <div className="metric-modal-panel">
        <div className="panel-heading">
          <div>
            <p className="app-kicker">Metric Details</p>
            <h3>{title}</h3>
          </div>
          <button aria-label="Close metric details" className="panel-close" onClick={onClose} title="Close" type="button" />
        </div>
        <div className="metric-details">
          {items.length ? (
            <ul>
              {items.map((item) => (
                <li key={item.key}>
                  {item.to ? <Link onClick={onClose} to={item.to}>{item.name}</Link> : <span>{item.name}</span>}
                  {item.detail ? <small>{item.detail}</small> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No records for this total.</p>
          )}
          <Link className="metric-details-link" onClick={onClose} to={section === 'booths' ? `/admin/shows/${showId}/booths` : section === 'vendors' ? '/admin/vendors' : `/admin/shows/${showId}/assignments`}>
            Open related screen
          </Link>
        </div>
      </div>
    </div>
  );
}

function metricItems(activeMetric, { assignments, booths, readinessVendors }) {
  const [section, key] = String(activeMetric || '').split(':');

  if (section === 'booths') {
    return booths
      .filter((booth) => {
        if (key === 'total') return true;
        if (key === 'featured') return Boolean(booth.isFeatured);
        return booth.status === key;
      })
      .map((booth) => ({
        key: `booth-${booth.id}`,
        name: boothName(booth),
        detail: [titleize(booth.status || 'available'), booth.boothType ? titleize(booth.boothType) : null].filter(Boolean).join(' · '),
        to: `/admin/shows/${booth.showId}/booths`
      }));
  }

  if (section === 'vendors') {
    return readinessVendors
      .filter((item) => {
        if (key === 'total') return true;
        if (key === 'excluded') return item.excluded;
        if (key === 'profileIncomplete') return !item.vendor?.isProfileComplete;
        return item.vendor?.tier === key;
      })
      .map((item) => vendorMetricItem(item));
  }

  if (section === 'assignments') {
    if (key === 'availableBooths' || key === 'assignedBooths') {
      const boothStatus = key === 'availableBooths' ? 'available' : 'assigned';
      return booths
        .filter((booth) => booth.status === boothStatus)
        .map((booth) => ({
          key: `assignment-booth-${booth.id}`,
          name: boothName(booth),
          detail: key === 'assignedBooths' ? assignedVendorNameForBooth(booth.id, assignments) : titleize(booth.status),
          to: `/admin/shows/${booth.showId}/assignments`
        }));
    }

    return readinessVendors
      .filter((item) => {
        if (key === 'eligibleVendors') return item.vendor?.isActive && !item.excluded;
        if (key === 'excludedVendors') return item.excluded;
        if (key === 'vendorsWithBooths') return item.vendor?.isActive && !item.excluded && item.assignment;
        if (key === 'vendorsWithoutBooths') return item.vendor?.isActive && !item.excluded && !item.assignment;
        return false;
      })
      .map((item) => vendorMetricItem(item, { includeAssignment: true }));
  }

  return [];
}

function vendorMetricItem(item, options = {}) {
  const vendor = item.vendor || {};
  const assignmentDetail = item.assignment
    ? `Booth ${item.assignment.boothNumber || item.assignment.boothId}`
    : 'No booth';
  const detail = options.includeAssignment
    ? assignmentDetail
    : [titleize(vendor.tier || ''), item.excluded ? 'Excluded' : null, vendor.isProfileComplete ? null : 'Profile incomplete']
      .filter(Boolean)
      .join(' · ');

  return {
    key: `vendor-${vendor.id}`,
    name: vendor.companyName || vendor.email || 'Unnamed vendor',
    detail,
    to: `/admin/vendors/${vendor.id}`
  };
}

function assignedVendorNameForBooth(boothId, assignments) {
  const assignment = assignments.find((item) => Number(item.boothId) === Number(boothId));
  return assignment?.vendor?.companyName || assignment?.companyName || 'Assigned';
}

function boothName(booth) {
  const number = booth.boothNumber ? `Booth ${booth.boothNumber}` : 'Unnumbered booth';
  return booth.boothName ? `${number} - ${booth.boothName}` : number;
}

function metricTitle(activeMetric) {
  const [, key] = String(activeMetric || '').split(':');
  const labels = {
    total: 'Total records',
    available: 'Available booths',
    reserved: 'Reserved booths',
    unavailable: 'Unavailable booths',
    assigned: 'Assigned booths',
    featured: 'Featured booths',
    platinum: 'Platinum vendors',
    gold: 'Gold vendors',
    silver: 'Silver vendors',
    bronze: 'Bronze vendors',
    excluded: 'Excluded vendors',
    profileIncomplete: 'Profile incomplete vendors',
    eligibleVendors: 'Eligible vendors',
    excludedVendors: 'Excluded vendors',
    vendorsWithBooths: 'Vendors with booths',
    vendorsWithoutBooths: 'Vendors without booths',
    availableBooths: 'Available booths',
    assignedBooths: 'Assigned booths'
  };
  return labels[key] || 'Metric details';
}

function titleize(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function showDetailsComplete(show) {
  return Boolean(show.name && show.venueName && show.startDate && show.endDate && show.timezone);
}

function tierScheduleComplete(show) {
  return tiers.every((tier) => show.tierWindows?.[tier]?.opensAt);
}

function boothSelectionReady(show, mapChecklist, boothStats) {
  return Boolean(
    mapChecklist.floorMapUploaded &&
    boothStats?.total > 0 &&
    boothStats?.allNumbered &&
    tierScheduleComplete(show) &&
    show.status === 'published'
  );
}

function fallbackChecklist(show, mapChecklist, boothStats, vendorStats, assignmentStats) {
  return [
    { key: 'show_details_completed', label: 'Event details completed', complete: showDetailsComplete(show) },
    { key: 'tier_schedule_completed', label: 'Tier schedule completed', complete: tierScheduleComplete(show) },
    { key: 'floor_map_uploaded', label: 'Floor map uploaded', complete: mapChecklist.floorMapUploaded },
    { key: 'booths_created', label: 'Booths created', complete: mapChecklist.boothsCreated },
    { key: 'all_booths_numbered', label: 'All booths numbered', complete: Boolean(boothStats?.allNumbered) },
    { key: 'vendors_available', label: 'Vendors available', complete: Boolean(assignmentStats?.eligibleVendors) },
    { key: 'vendor_profiles_ready', label: 'Vendor profiles ready', complete: Boolean(assignmentStats?.eligibleVendors) && Number(vendorStats?.profileIncomplete || 0) === 0 },
    { key: 'booth_selection_ready', label: 'Booth selection ready', complete: boothSelectionReady(show, mapChecklist, boothStats) },
    { key: 'communication_prepared', label: 'Communication prepared', complete: false },
    { key: 'show_published', label: 'Show published', complete: show.status === 'published' }
  ];
}

function checklistItemPath(showId, item) {
  const paths = {
    show_details_completed: `/admin/shows/${showId}/edit`,
    tier_schedule_completed: `/admin/shows/${showId}/edit`,
    floor_map_uploaded: `/admin/shows/${showId}/floor-map`,
    booths_created: `/admin/shows/${showId}/booths`,
    all_booths_numbered: `/admin/shows/${showId}/booths`,
    vendors_available: '/admin/vendors',
    vendor_profiles_ready: '/admin/vendors',
    booth_selection_ready: `/admin/shows/${showId}/edit`,
    communication_prepared: `/admin/shows/${showId}/edit`,
    show_published: `/admin/shows/${showId}/edit`
  };

  if (item.key && paths[item.key]) return paths[item.key];

  const label = item.label?.toLowerCase() || '';
  if (label.includes('tier') || label.includes('published') || label.includes('event details') || label.includes('show details')) return `/admin/shows/${showId}/edit`;
  if (label.includes('floor map')) return `/admin/shows/${showId}/floor-map`;
  if (label.includes('booth')) return `/admin/shows/${showId}/booths`;
  if (label.includes('vendor')) return '/admin/vendors';
  if (label.includes('communication') || label.includes('selection')) return `/admin/shows/${showId}/edit`;
  return `/admin/shows/${showId}/edit`;
}

function tierWindowStatus(show, tier) {
  const window = show.tierWindows?.[tier];

  if (!window?.opensAt) return 'not scheduled';
  if (show.selectionPaused || ['closed', 'archived'].includes(show.status)) return 'closed';

  const now = Date.now();
  const opensAt = new Date(window.opensAt).getTime();
  const deadline = show.vendorSelectionDeadline
    ? new Date(show.vendorSelectionDeadline).getTime()
    : null;

  if (deadline && now > deadline) return 'closed';
  if (now < opensAt) return 'upcoming';
  return 'open';
}
