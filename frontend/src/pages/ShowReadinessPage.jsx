import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { TierBadge } from '../components/TierBadge.jsx';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import { getAdminShowAssignmentsRequest } from '../services/assignmentService.js';
import {
  getShowReadinessRequest,
  listCommunicationsRequest,
  markCommunicationCopiedRequest,
  markCommunicationSentRequest,
  previewCommunicationRequest,
  saveCommunicationRequest
} from '../services/readinessService.js';
import { closeShowRequest, publishShowRequest, updateShowRequest } from '../services/showService.js';
import {
  disablePublicAccessRequest,
  downloadExportRequest,
  getPublicSettingsRequest,
  regeneratePublicTokenRequest,
  updatePublicSettingsRequest
} from '../services/eventDayService.js';
import { formatDateRange, formatDateTime } from '../utils/dateFormat.js';
import './Shows.css';

const communicationTypes = [
  ['booth_selection_coming_soon', 'Booth selection coming soon'],
  ['booth_selection_now_open', 'Booth selection now open'],
  ['complete_vendor_profile', 'Complete vendor profile'],
  ['booth_selection_reminder', 'Booth selection reminder'],
  ['booth_confirmation', 'Booth confirmation'],
  ['admin_manual_assignment_notice', 'Admin manual assignment notice']
];

const targets = [
  ['eligible', 'All eligible vendors'],
  ['tier', 'Vendors by tier'],
  ['incomplete_profiles', 'Incomplete profiles'],
  ['selection_open', 'Selection window open'],
  ['without_booths', 'No booth selected'],
  ['confirmed_booths', 'Confirmed booths'],
  ['excluded', 'Excluded vendors']
];

export function ShowReadinessPage() {
  const { showId } = useParams();
  return (
    <AdminLayout>
      <ShowReadinessContent showId={showId} />
    </AdminLayout>
  );
}

export function ShowReadinessContent({ embedded = false, showId }) {
  const [readiness, setReadiness] = useState(null);
  const [communications, setCommunications] = useState([]);
  const [publicSettings, setPublicSettings] = useState(null);
  const [history, setHistory] = useState([]);
  const [assignmentFilters, setAssignmentFilters] = useState({ action: 'all', vendor: '', booth: '' });
  const [communicationForm, setCommunicationForm] = useState({
    communicationType: 'booth_selection_coming_soon',
    target: 'eligible',
    tier: 'platinum'
  });
  const [preview, setPreview] = useState(null);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { loadReadiness(); }, [showId]);

  async function loadReadiness() {
    setStatus('loading');
    setError('');
    try {
      const [readinessData, communicationData, assignmentData, publicSettingsData] = await Promise.all([
        getShowReadinessRequest(showId),
        listCommunicationsRequest(showId),
        getAdminShowAssignmentsRequest(showId),
        getPublicSettingsRequest(showId)
      ]);
      setReadiness(readinessData.readiness);
      setCommunications(communicationData.communications || []);
      setHistory(assignmentData.history || []);
      setPublicSettings(publicSettingsData.settings);
      setStatus('ready');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load readiness.');
      setStatus('error');
    }
  }

  async function runShowAction(action, success) {
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(success);
      await loadReadiness();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update show.');
    }
  }

  async function generatePreview(vendor = null) {
    setError('');
    setMessage('');
    try {
      const payload = vendor
        ? { communicationType: communicationForm.communicationType, target: 'vendor', vendorProfileId: vendor.vendor.id }
        : communicationForm;
      const data = await previewCommunicationRequest(showId, payload);
      setPreview(data);
      setSelectedPreviewIndex(0);
      if (!data.previews.length) setMessage('No vendors matched that communication target.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to generate communication preview.');
    }
  }

  async function copyPreview() {
    const item = preview?.previews?.[selectedPreviewIndex];
    if (!item) return;
    await navigator.clipboard.writeText(`${item.subject}\n\n${item.message}`);
    setMessage('Message copied.');
  }

  async function savePreviewDraft() {
    const item = preview?.previews?.[selectedPreviewIndex];
    if (!item) return;
    try {
      await saveCommunicationRequest(showId, {
        communicationType: item.communicationType,
        subject: item.subject,
        message: item.message
      });
      setMessage('Communication draft saved.');
      await loadReadiness();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save draft.');
    }
  }

  async function updateCommunication(communicationId, action) {
    await action(communicationId);
    setMessage('Communication updated.');
    await loadReadiness();
  }

  async function savePublicSettings(nextSettings) {
    const data = await updatePublicSettingsRequest(showId, nextSettings);
    setPublicSettings(data.settings);
    setMessage('Public settings saved.');
  }

  async function regenerateToken() {
    const data = await regeneratePublicTokenRequest(showId);
    setPublicSettings(data.settings);
    setMessage('Public link regenerated.');
  }

  async function disablePublic() {
    const data = await disablePublicAccessRequest(showId);
    setPublicSettings(data.settings);
    setMessage('Public access disabled.');
  }

  async function copyText(text, success = 'Copied.') {
    await navigator.clipboard.writeText(text);
    setMessage(success);
  }

  async function downloadExport(type) {
    try {
      await downloadExportRequest(showId, type);
      setMessage('Export downloaded.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to download export.');
    }
  }

  const vendors = readiness?.vendorStats ? readiness?.vendors || [] : [];
  const vendorRows = readiness?.vendors || [];
  const filteredHistory = useMemo(() => history.filter((item) => {
    const matchesAction = assignmentFilters.action === 'all' || item.action === assignmentFilters.action;
    const matchesVendor = !assignmentFilters.vendor || String(item.companyName || '').toLowerCase().includes(assignmentFilters.vendor.toLowerCase());
    const matchesBooth = !assignmentFilters.booth || String(item.boothNumber || item.previousBoothId || item.newBoothId || '').includes(assignmentFilters.booth);
    return matchesAction && matchesVendor && matchesBooth;
  }), [history, assignmentFilters]);

  const show = readiness?.show;

  return (
    <>
      {status === 'loading' ? <p className="muted">Loading show readiness...</p> : null}
      {error ? <div className="form-error">{error}</div> : null}
      {message ? <div className="success-message">{message}</div> : null}
      {show ? (
        <>
          {!embedded ? <section className="page-heading">
            <div>
              <p className="app-kicker">Show Readiness</p>
              <h2>{show.name || 'Untitled show'}</h2>
            </div>
            <div className="page-actions">
              <StatusBadge status={show.status} />
              <Link className="button secondary link-button" to={`/admin/shows/${show.id}/edit`}>Edit Show</Link>
              <Link className="button secondary link-button" to={`/admin/shows/${show.id}/event-day`}>Vendor Activity</Link>
              {show.status === 'draft' ? <button className="button primary" type="button" onClick={() => runShowAction(() => publishShowRequest(show.id), 'Show published.')}>Publish Show</button> : null}
              {show.status === 'published' ? (
                <>
                  <button className="button secondary" type="button" onClick={() => runShowAction(() => updateShowRequest(show.id, { selectionPaused: !show.selectionPaused }), show.selectionPaused ? 'Selection resumed.' : 'Selection paused.')}>{show.selectionPaused ? 'Resume Selection' : 'Pause Selection'}</button>
                  <button className="button secondary" type="button" onClick={() => window.confirm('Close this show?') && runShowAction(() => closeShowRequest(show.id), 'Show closed.')}>Close Show</button>
                </>
              ) : null}
            </div>
          </section> : (
            <section className="section-heading">
              <div>
                <p className="app-kicker">Readiness</p>
                <h3>Readiness and communication</h3>
              </div>
              <StatusBadge status={show.status} />
            </section>
          )}

          <section className="readiness-grid">
            {!embedded ? (
              <article className="details-panel">
                <h3>Show setup</h3>
                <ul className="checklist compact-checklist">
                  <Check label="Show name" complete={readiness.setup.showName} />
                  <Check label="Venue name" complete={readiness.setup.venueName} />
                  <Check label="Venue address" complete={readiness.setup.venueAddress} />
                  <Check label="Start date" complete={readiness.setup.startDate} />
                  <Check label="End date" complete={readiness.setup.endDate} />
                  <Check label="Timezone" complete={readiness.setup.timezone} />
                  <Check label="Vendor selection deadline" complete={readiness.setup.vendorSelectionDeadline} />
                </ul>
                <dl>
                  <Info label="Event dates" value={formatDateRange(show.startDate, show.endDate)} />
                  <Info label="Deadline" value={formatDateTime(show.vendorSelectionDeadline, show.timezone)} />
                  <Info label="Selection paused" value={show.selectionPaused ? 'Yes' : 'No'} />
                </dl>
              </article>
            ) : null}

            <article className="details-panel">
              <h3>Floor map and booths</h3>
              <div className="booth-stats compact-stats">
                <Stat label="Floor map" value={readiness.floorMap.exists ? 'Yes' : 'No'} />
                <Stat label="Total" value={readiness.floorMap.boothStats?.total || 0} />
                <Stat label="Available" value={readiness.floorMap.boothStats?.available || 0} />
                <Stat label="Reserved" value={readiness.floorMap.boothStats?.reserved || 0} />
                <Stat label="Unavailable" value={readiness.floorMap.boothStats?.unavailable || 0} />
                <Stat label="Assigned" value={readiness.floorMap.boothStats?.assigned || 0} />
                <Stat label="Featured" value={readiness.floorMap.boothStats?.featured || 0} />
              </div>
              <p className="muted">Missing important details: {readiness.floorMap.boothWarnings.missingImportantDetails}. Optional warnings: {readiness.floorMap.boothWarnings.withoutDimensions} without dimensions, {readiness.floorMap.boothWarnings.withoutPrice} without price, {readiness.floorMap.boothWarnings.withoutNotes} without notes.</p>
              <div className="row-actions">
                <Link to={`/admin/shows/${show.id}/floor-map`}>Manage Floor Map</Link>
                <Link to={`/admin/shows/${show.id}/booths`}>Manage Booths</Link>
                <Link to={`/admin/shows/${show.id}/assignments`}>Manage Assignments</Link>
              </div>
            </article>
          </section>

          {publicSettings ? (
            <section className="details-panel">
              <h3>Public/vendor activity visibility</h3>
              <p className="muted">Public views use a secure token and never expose vendor emails, phones, contact names, account status, or internal notes.</p>
              <div className="public-settings-grid">
                <label className="checkbox-field"><input checked={publicSettings.publicMapEnabled} onChange={(event) => savePublicSettings({ ...publicSettings, publicMapEnabled: event.target.checked })} type="checkbox" /> Public read-only floor map</label>
                <label className="checkbox-field"><input checked={publicSettings.publicDirectoryEnabled} onChange={(event) => savePublicSettings({ ...publicSettings, publicDirectoryEnabled: event.target.checked })} type="checkbox" /> Public vendor directory</label>
                {Object.entries(publicSettings.displayOptions || {}).map(([key, value]) => (
                  <label className="checkbox-field" key={key}><input checked={Boolean(value)} onChange={(event) => savePublicSettings({ ...publicSettings, displayOptions: { ...publicSettings.displayOptions, [key]: event.target.checked } })} type="checkbox" /> {labelize(key)}</label>
                ))}
              </div>
              <div className="row-actions">
                <button type="button" onClick={regenerateToken}>Regenerate Public Link</button>
                <button type="button" onClick={disablePublic}>Disable Public Link</button>
                {publicSettings.publicShareToken ? (
                  <>
                    <button type="button" onClick={() => copyText(`${window.location.origin}/public/shows/${publicSettings.publicShareToken}/map`, 'Public map link copied.')}>Copy Public Map Link</button>
                    <button type="button" onClick={() => copyText(`${window.location.origin}/public/shows/${publicSettings.publicShareToken}/vendors`, 'Public directory link copied.')}>Copy Public Directory Link</button>
                    <a href={`/public/shows/${publicSettings.publicShareToken}/map`} rel="noreferrer" target="_blank">View Public Map</a>
                    <a href={`/public/shows/${publicSettings.publicShareToken}/vendors`} rel="noreferrer" target="_blank">View Public Directory</a>
                  </>
                ) : <span className="muted">Regenerate a token to create share links.</span>}
              </div>
            </section>
          ) : null}

          <section className="details-panel">
            <h3>Tier selection schedule</h3>
            <div className="table-wrap">
              <table className="shows-table compact-table">
                <thead><tr><th>Tier</th><th>Opens</th><th>State</th><th>Active vendors</th><th>Profiles ready</th><th>With booths</th><th>Without booths</th></tr></thead>
                <tbody>{readiness.tierStats.map((tier) => <tr key={tier.tier}><td><TierBadge tier={tier.tier} /></td><td>{formatDateTime(tier.opensAt, show.timezone)}</td><td>{stateLabel(tier.state)}</td><td>{tier.activeVendors}</td><td>{tier.completedProfiles}</td><td>{tier.vendorsWithBooths}</td><td>{tier.vendorsWithoutBooths}</td></tr>)}</tbody>
              </table>
            </div>
          </section>

          <section className="readiness-grid">
            {!embedded ? (
              <article className="details-panel">
                <h3>Booth assignment progress</h3>
                <div className="booth-stats compact-stats">
                  <Stat label="Eligible vendors" value={readiness.assignmentProgress.eligibleVendors} />
                  <Stat label="With booths" value={readiness.assignmentProgress.vendorsWithBooths} />
                  <Stat label="Without booths" value={readiness.assignmentProgress.vendorsWithoutBooths} />
                  <Stat label="Blocked" value={readiness.assignmentProgress.blockedVendors} />
                </div>
                <ul className="checklist">
                  {readiness.checklist.map((item) => <Check key={item.key} label={item.label} complete={item.complete} />)}
                </ul>
              </article>
            ) : null}

            <article className="details-panel">
              <h3>Communication prep</h3>
              <div className="communication-controls">
                <label>Template<select value={communicationForm.communicationType} onChange={(event) => setCommunicationForm((current) => ({ ...current, communicationType: event.target.value }))}>{communicationTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label>Target<select value={communicationForm.target} onChange={(event) => setCommunicationForm((current) => ({ ...current, target: event.target.value }))}>{targets.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                {communicationForm.target === 'tier' ? <label>Tier<select value={communicationForm.tier} onChange={(event) => setCommunicationForm((current) => ({ ...current, tier: event.target.value }))}><option value="platinum">Platinum</option><option value="gold">Gold</option><option value="silver">Silver</option><option value="bronze">Bronze</option></select></label> : null}
                <button className="button primary" type="button" onClick={() => generatePreview()}>Preview Message</button>
              </div>
              {preview?.previews?.length ? (
                <div className="message-preview">
                  <label>Preview<select value={selectedPreviewIndex} onChange={(event) => setSelectedPreviewIndex(Number(event.target.value))}>{preview.previews.map((item, index) => <option key={`${item.subject}-${index}`} value={index}>{item.subject}</option>)}</select></label>
                  <h4>{preview.previews[selectedPreviewIndex].subject}</h4>
                  <pre>{preview.previews[selectedPreviewIndex].message}</pre>
                  <div className="row-actions">
                    <button type="button" onClick={copyPreview}>Copy Message</button>
                    <button type="button" onClick={savePreviewDraft}>Save Draft</button>
                  </div>
                </div>
              ) : <p className="muted">Generate a preview to copy or save a draft.</p>}
            </article>
          </section>

          <section className="details-panel">
            <h3>Communication history</h3>
            {communications.length ? <div className="table-wrap"><table className="shows-table compact-table"><thead><tr><th>Date</th><th>Vendor</th><th>Type</th><th>Subject</th><th>Status</th><th>Actions</th></tr></thead><tbody>{communications.map((item) => <tr key={item.id}><td>{formatDateTime(item.createdAt, show.timezone)}</td><td>{item.vendor?.companyName || 'Show-wide draft'}</td><td>{item.communicationType}</td><td>{item.subject}</td><td>{item.status}</td><td><div className="row-actions"><button type="button" onClick={() => navigator.clipboard.writeText(`${item.subject}\n\n${item.message}`).then(() => updateCommunication(item.id, markCommunicationCopiedRequest))}>Copy</button><button type="button" onClick={() => updateCommunication(item.id, markCommunicationSentRequest)}>Mark Sent</button></div></td></tr>)}</tbody></table></div> : <p className="muted">No communication drafts yet.</p>}
          </section>

          <section className="details-panel no-print">
            <h3>Exports</h3>
            <div className="row-actions">
              <button type="button" onClick={() => downloadExport('vendor_directory')}>Vendor Directory CSV</button>
              <button type="button" onClick={() => downloadExport('booth_assignments')}>Booth Assignments CSV</button>
              <button type="button" onClick={() => downloadExport('check_in')}>Check-In CSV</button>
              <button type="button" onClick={() => downloadExport('vendors_without_booths')}>Vendors Without Booths CSV</button>
              <button type="button" onClick={() => downloadExport('incomplete_profiles')}>Incomplete Profiles CSV</button>
              <button type="button" onClick={() => downloadExport('excluded_vendors')}>Excluded Vendors CSV</button>
              <button type="button" onClick={() => downloadExport('booth_inventory')}>Booth Inventory CSV</button>
              <button type="button" onClick={() => downloadExport('assignment_history')}>Assignment History CSV</button>
            </div>
          </section>

          <section className="details-panel">
            <h3>Assignment history</h3>
            <section className="show-toolbar booth-toolbar">
              <input placeholder="Filter vendor" value={assignmentFilters.vendor} onChange={(event) => setAssignmentFilters((current) => ({ ...current, vendor: event.target.value }))} />
              <input placeholder="Filter booth" value={assignmentFilters.booth} onChange={(event) => setAssignmentFilters((current) => ({ ...current, booth: event.target.value }))} />
              <select value={assignmentFilters.action} onChange={(event) => setAssignmentFilters((current) => ({ ...current, action: event.target.value }))}><option value="all">All actions</option><option value="selected">Selected</option><option value="assigned">Assigned</option><option value="moved">Moved</option><option value="released">Released</option><option value="cancelled">Cancelled</option></select>
            </section>
            {filteredHistory.length ? <div className="table-wrap"><table className="shows-table compact-table"><thead><tr><th>Date/time</th><th>Action</th><th>Booth</th><th>Previous</th><th>New</th><th>Vendor</th><th>Performed by</th><th>Notes</th></tr></thead><tbody>{filteredHistory.map((item) => <tr key={item.id}><td>{formatDateTime(item.createdAt, show.timezone)}</td><td>{item.action}</td><td>{item.boothNumber || 'Not set'}</td><td>{item.previousBoothId || '-'}</td><td>{item.newBoothId || '-'}</td><td>{item.companyName || 'Not set'}</td><td>{item.performedByUserId}</td><td>{item.notes || ''}</td></tr>)}</tbody></table></div> : <p className="muted">No assignment history yet.</p>}
          </section>
        </>
      ) : null}
    </>
  );
}

function Check({ complete, label }) {
  return <li className={complete ? 'complete' : 'incomplete'}>{label}</li>;
}

function Info({ label, value }) {
  return <><dt>{label}</dt><dd>{value}</dd></>;
}

function Stat({ label, value }) {
  return <div><strong>{value}</strong><span>{label}</span></div>;
}

function stateLabel(value) {
  return String(value || '').replace('_', ' ');
}

function labelize(value) {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}
