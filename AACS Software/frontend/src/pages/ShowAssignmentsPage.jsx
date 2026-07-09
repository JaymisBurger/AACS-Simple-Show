import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { VendorMapPreview } from '../components/VendorMapPreview.jsx';
import { VendorAvatar } from '../components/VendorAvatar.jsx';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import {
  createAdminAssignmentRequest,
  getAdminShowAssignmentsRequest,
  listEligibleVendorsRequest,
  moveAdminAssignmentRequest,
  releaseAdminAssignmentRequest
} from '../services/assignmentService.js';
import { getFloorMapImageBlobUrlRequest } from '../services/mapService.js';
import { formatDateTime } from '../utils/dateFormat.js';
import './FloorMap.css';
import './Shows.css';

export function ShowAssignmentsPage() {
  const { showId } = useParams();
  const [data, setData] = useState(null);
  const [eligibleVendors, setEligibleVendors] = useState([]);
  const [imageUrl, setImageUrl] = useState('');
  const [form, setForm] = useState({ boothId: '', vendorProfileId: '', notes: '' });
  const [activeMetric, setActiveMetric] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { loadAll(); }, [showId]);

  async function loadAll() {
    setError('');
    try {
      const nextData = await getAdminShowAssignmentsRequest(showId);
      setData(nextData);
      setEligibleVendors((await listEligibleVendorsRequest(showId)).vendors);
      if (nextData.map) setImageUrl(await getFloorMapImageBlobUrlRequest(showId));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load assignments.');
    }
  }

  async function runAction(action, success) {
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(success);
      await loadAll();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update assignment.');
    }
  }

  async function updateTableAssignment(assignment, value) {
    if (String(value) === String(assignment.boothId)) return;
    if (value === 'unassign') {
      if (window.confirm('Release this assignment?')) {
        await runAction(() => releaseAdminAssignmentRequest(assignment.id, { notes: 'Released by admin.' }), 'Assignment released.');
      }
      return;
    }
    await runAction(
      () => moveAdminAssignmentRequest(assignment.id, { newBoothId: value, notes: 'Moved by admin.' }),
      'Assignment moved.'
    );
  }

  const activeAssignments = useMemo(
    () => (data?.assignments || [])
      .filter((item) => item.status === 'active')
      .sort((a, b) => Number(a.booth?.boothNumber || 0) - Number(b.booth?.boothNumber || 0)),
    [data]
  );
  const availableBooths = useMemo(() => (data?.booths || []).filter((booth) => booth.status === 'available'), [data]);
  const selectedVendor = eligibleVendors.find((vendor) => String(vendor.id) === String(form.vendorProfileId));
  const mapAssignments = activeAssignments.map((assignment) => ({
    boothId: assignment.boothId,
    companyName: assignment.vendor.companyName,
    logoUrl: assignment.vendor.logoUrl
  }));

  return (
    <AdminLayout>
      <section className="page-heading">
        <div><p className="app-kicker">Assignments</p><h2>{data?.show?.name || 'Show Assignments'}</h2></div>
        <div className="page-actions"><Link className="button secondary link-button" to="/admin/booth-assignments">All Assignments</Link><Link className="button secondary link-button" to={`/admin/shows/${showId}/event-day`}>Vendor Activity</Link><Link className="button secondary link-button" to={`/admin/shows/${showId}`}>Event Details</Link></div>
      </section>
      {message ? <div className="success-message">{message}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}
      {data?.stats ? (
        <section className="booth-stats">
          {Object.entries(data.stats).map(([key, value]) => (
            <StatButton
              key={key}
              label={labelize(key)}
              metricKey={key}
              onSelect={setActiveMetric}
              selected={activeMetric}
              value={value}
            />
          ))}
        </section>
      ) : null}
      {activeMetric ? (
        <MetricDetailsModal
          activeMetric={activeMetric}
          items={assignmentMetricItems(activeMetric, { activeAssignments, booths: data?.booths || [], eligibleVendors })}
          onClose={() => setActiveMetric(null)}
          showId={showId}
        />
      ) : null}
      <section className="details-grid">
        <article className="details-panel">
          <h3>Map view</h3>
          {imageUrl ? <VendorMapPreview imageUrl={imageUrl} objects={data.objects || []} assignments={mapAssignments} readonly /> : <p className="muted">No floor map uploaded.</p>}
        </article>
        <article className="details-panel vendor-form">
          <h3>Assign vendor</h3>
          <label>Vendor<select value={form.vendorProfileId} onChange={(event) => setForm((current) => ({ ...current, vendorProfileId: event.target.value }))}><option value="">{eligibleVendors.length ? 'Choose vendor' : 'No eligible vendors'}</option>{eligibleVendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.companyName || vendor.email}{vendor.boothNumber ? ` - Booth ${vendor.boothNumber}` : ''}</option>)}</select></label>
          <label>Booth<select value={form.boothId} onChange={(event) => setForm((current) => ({ ...current, boothId: event.target.value }))}><option value="">Choose booth</option>{availableBooths.map((booth) => <option key={booth.id} value={booth.id}>Booth {booth.boothNumber}</option>)}</select></label>
          {selectedVendor && !selectedVendor.isProfileComplete ? <p className="warning-text">Warning: this vendor profile is incomplete.</p> : null}
          {selectedVendor?.effectiveOpensAt && Date.now() < new Date(selectedVendor.effectiveOpensAt).getTime() ? <p className="warning-text">Warning: this vendor's tier window has not opened yet.</p> : null}
          {selectedVendor?.specialAccessOpensAt ? <p className="warning-text">This vendor has special access timing.</p> : null}
          <label>Notes<textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></label>
          <button className="button primary" disabled={!form.vendorProfileId || !form.boothId} type="button" onClick={() => runAction(() => createAdminAssignmentRequest(showId, form), 'Assignment created.')}>Assign Booth</button>
        </article>
      </section>
      <section className="details-panel">
        <h3>Table view</h3>
        <div className="table-wrap">
          <table className="shows-table assignment-table">
            <thead><tr><th>Vendor</th><th>Tier</th><th>Source</th><th>Date</th><th>Assigned booth</th></tr></thead>
            <tbody>{activeAssignments.map((assignment) => (
              <tr key={assignment.id}>
                <td><div className="vendor-cell"><VendorAvatar logoUrl={assignment.vendor.logoUrl} companyName={assignment.vendor.companyName} /><Link to={`/admin/vendors/${assignment.vendorProfileId}`}>{assignment.vendor.companyName}</Link></div></td>
                <td>{assignment.vendor.tier}</td>
                <td>{assignment.assignmentSource}</td>
                <td>{formatDateTime(assignment.confirmedAt, assignment.timezone)}</td>
                <td>
                  <select
                    aria-label={`Assigned booth for ${assignment.vendor.companyName}`}
                    className="booth-assignment-select"
                    value={assignment.boothId}
                    onChange={(event) => updateTableAssignment(assignment, event.target.value)}
                  >
                    <option value={assignment.boothId}>Booth {assignment.booth.boothNumber}</option>
                    {availableBooths.map((booth) => <option key={booth.id} value={booth.id}>Booth {booth.boothNumber}</option>)}
                    <option value="unassign">Unassign</option>
                  </select>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
      <section className="details-panel">
        <h3>Assignment history</h3>
        {data?.history?.length ? (
          <div className="table-wrap">
            <table className="shows-table">
              <thead><tr><th>Date/time</th><th>Action</th><th>Booth</th><th>Previous</th><th>New</th><th>Vendor</th><th>Performed by</th><th>Notes</th></tr></thead>
              <tbody>{data.history.map((item) => <tr key={item.id}><td>{formatDateTime(item.createdAt, data.show?.timezone)}</td><td>{item.action}</td><td>{item.boothNumber || '-'}</td><td>{item.previousBoothId || '-'}</td><td>{item.newBoothId || '-'}</td><td>{item.companyName}</td><td>{item.performedByUserId}</td><td>{item.notes || ''}</td></tr>)}</tbody>
            </table>
          </div>
        ) : <p className="muted">No assignment history yet.</p>}
      </section>
    </AdminLayout>
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
  const title = labelize(activeMetric);

  return (
    <div className="metric-modal" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close metric details" className="metric-modal-backdrop" onClick={onClose} type="button" />
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
          <Link className="metric-details-link" onClick={onClose} to={`/admin/shows/${showId}/assignments`}>
            Open assignments
          </Link>
        </div>
      </div>
    </div>
  );
}

function assignmentMetricItems(metricKey, { activeAssignments, booths, eligibleVendors }) {
  if (metricKey === 'totalBooths') {
    return booths.map((booth) => boothMetricItem(booth));
  }

  if (['availableBooths', 'assignedBooths', 'reservedBooths', 'unavailableBooths'].includes(metricKey)) {
    const status = metricKey.replace('Booths', '').replace(/^[A-Z]/, (letter) => letter.toLowerCase());
    return booths
      .filter((booth) => booth.status === status)
      .map((booth) => boothMetricItem(booth, activeAssignments));
  }

  if (metricKey === 'eligibleVendors') {
    return eligibleVendors.map((vendor) => vendorMetricItem(vendor));
  }

  if (metricKey === 'excludedVendors') {
    return [];
  }

  if (metricKey === 'vendorsWithBooths') {
    return eligibleVendors
      .filter((vendor) => vendor.currentAssignmentId)
      .map((vendor) => vendorMetricItem(vendor));
  }

  if (metricKey === 'vendorsWithoutBooths') {
    return eligibleVendors
      .filter((vendor) => !vendor.currentAssignmentId)
      .map((vendor) => vendorMetricItem(vendor));
  }

  return [];
}

function boothMetricItem(booth, assignments = []) {
  const assignment = assignments.find((item) => Number(item.boothId) === Number(booth.id));
  return {
    key: `booth-${booth.id}`,
    name: booth.boothNumber ? `Booth ${booth.boothNumber}` : 'Unnumbered booth',
    detail: assignment?.vendor?.companyName || labelize(booth.status || 'available'),
    to: `/admin/shows/${booth.showId}/booths`
  };
}

function vendorMetricItem(vendor) {
  return {
    key: `vendor-${vendor.id}`,
    name: vendor.companyName || vendor.email || 'Unnamed vendor',
    detail: vendor.boothNumber ? `Booth ${vendor.boothNumber}` : 'No booth',
    to: `/admin/vendors/${vendor.id}`
  };
}

function labelize(value) { return value.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()); }
