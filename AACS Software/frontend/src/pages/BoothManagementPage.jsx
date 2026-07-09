import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import {
  bulkDeleteBoothsRequest,
  bulkUpdateBoothsRequest,
  deleteBoothRequest,
  duplicateBoothRequest,
  listBoothsRequest,
  renumberBoothsRequest,
  updateBoothRequest
} from '../services/boothService.js';
import { getShowRequest } from '../services/showService.js';
import { formatDateTime } from '../utils/dateFormat.js';
import './Shows.css';

const statusFilters = ['all', 'available', 'reserved', 'unavailable', 'assigned'];
const boothTypes = ['standard', 'premium', 'corner', 'double', 'custom'];
const renumberDirections = [
  { value: 'left_to_right', label: 'Left to right' },
  { value: 'right_to_left', label: 'Right to left' },
  { value: 'top_to_bottom', label: 'Top to bottom' },
  { value: 'bottom_to_top', label: 'Bottom to top' }
];

export function BoothManagementPage() {
  const { showId } = useParams();
  const [show, setShow] = useState(null);
  const [booths, setBooths] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: 'all', boothType: 'all', featured: 'all', sort: 'booth_number' });
  const [editingBooth, setEditingBooth] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [renumber, setRenumber] = useState({ startingNumber: 1, direction: 'left_to_right', preview: [] });
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const allVisibleSelected = useMemo(
    () => booths.length > 0 && booths.every((booth) => selectedIds.includes(booth.id)),
    [booths, selectedIds]
  );

  useEffect(() => {
    getShowRequest(showId)
      .then((data) => setShow(data.show))
      .catch(() => setShow(null));
  }, [showId]);

  useEffect(() => {
    const timeout = window.setTimeout(loadBooths, 150);
    return () => window.clearTimeout(timeout);
  }, [showId, filters]);

  async function loadBooths() {
    setStatus('loading');
    setError('');

    try {
      const data = await listBoothsRequest(showId, filters);
      setBooths(data.booths);
      setStats(data.stats);
      setSelectedIds((current) => current.filter((id) => data.booths.some((booth) => booth.id === id)));
      setStatus('ready');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load booths.');
      setStatus('error');
    }
  }

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function toggleSelected(boothId) {
    setSelectedIds((current) =>
      current.includes(boothId) ? current.filter((id) => id !== boothId) : [...current, boothId]
    );
  }

  function toggleAllVisible() {
    setSelectedIds(allVisibleSelected ? [] : booths.map((booth) => booth.id));
  }

  async function runAction(action, successMessage) {
    setMessage('');
    setError('');
    setFormErrors({});

    try {
      await action();
      setMessage(successMessage);
      await loadBooths();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update booths.');
      setFormErrors(requestError.response?.data?.errors || {});
    }
  }

  async function saveBooth(event) {
    event.preventDefault();
    await runAction(
      async () => {
        const data = await updateBoothRequest(showId, editingBooth.id, editingBooth);
        setEditingBooth(data.booth);
      },
      'Booth updated.'
    );
    setEditingBooth(null);
  }

  async function previewRenumber() {
    setError('');
    try {
      const data = await renumberBoothsRequest(showId, { ...renumber, previewOnly: true });
      setRenumber((current) => ({ ...current, preview: data.preview || [] }));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to preview booth numbering.');
    }
  }

  async function applyRenumber() {
    await runAction(
      () => renumberBoothsRequest(showId, { ...renumber, previewOnly: false }),
      'Booths renumbered.'
    );
    setRenumber((current) => ({ ...current, preview: [] }));
  }

  return (
    <AdminLayout>
      <section className="page-heading">
        <div>
          <p className="app-kicker">Booth Management</p>
          <h2>{show?.name ? `${show.name} Booths` : 'Booths'}</h2>
        </div>
        <div className="page-actions">
          <Link className="button secondary link-button" to={`/admin/shows/${showId}`}>
            Event Details
          </Link>
          <Link className="button primary link-button" to={`/admin/shows/${showId}/floor-map/editor`}>
            Map Editor
          </Link>
        </div>
      </section>

      {stats ? (
        <section className="booth-stats" aria-label="Booth totals">
          <Stat label="Total" value={stats.total} />
          <Stat label="Available" value={stats.available} />
          <Stat label="Reserved" value={stats.reserved} />
          <Stat label="Unavailable" value={stats.unavailable} />
          <Stat label="Assigned" value={stats.assigned} />
          <Stat label="Featured" value={stats.featured} />
        </section>
      ) : null}

      <section className="show-toolbar booth-toolbar">
        <input
          aria-label="Search booths"
          onChange={(event) => updateFilter('search', event.target.value)}
          placeholder="Search by booth number or name"
          value={filters.search}
        />
        <select aria-label="Status filter" onChange={(event) => updateFilter('status', event.target.value)} value={filters.status}>
          {statusFilters.map((item) => <option key={item} value={item}>{titleize(item)}</option>)}
        </select>
        <select aria-label="Type filter" onChange={(event) => updateFilter('boothType', event.target.value)} value={filters.boothType}>
          <option value="all">All Types</option>
          {boothTypes.map((item) => <option key={item} value={item}>{titleize(item)}</option>)}
        </select>
        <select aria-label="Featured filter" onChange={(event) => updateFilter('featured', event.target.value)} value={filters.featured}>
          <option value="all">All Featured</option>
          <option value="featured">Featured</option>
          <option value="not_featured">Not Featured</option>
        </select>
        <select aria-label="Sort booths" onChange={(event) => updateFilter('sort', event.target.value)} value={filters.sort}>
          <option value="booth_number">Booth number</option>
          <option value="status">Status</option>
          <option value="price">Price</option>
          <option value="updated_at">Recently updated</option>
        </select>
      </section>

      {selectedIds.length > 0 ? (
        <section className="bulk-bar">
          <span>{selectedIds.length} selected</span>
          <button type="button" onClick={() => runAction(() => bulkUpdateBoothsRequest(showId, { boothIds: selectedIds, status: 'available' }), 'Selected booths marked available.')}>Mark Available</button>
          <button type="button" onClick={() => runAction(() => bulkUpdateBoothsRequest(showId, { boothIds: selectedIds, status: 'reserved' }), 'Selected booths marked reserved.')}>Mark Reserved</button>
          <button type="button" onClick={() => runAction(() => bulkUpdateBoothsRequest(showId, { boothIds: selectedIds, status: 'unavailable' }), 'Selected booths marked unavailable.')}>Mark Unavailable</button>
          <button type="button" onClick={() => runAction(() => bulkUpdateBoothsRequest(showId, { boothIds: selectedIds, isFeatured: true }), 'Selected booths marked featured.')}>Feature</button>
          <button type="button" onClick={() => runAction(() => bulkUpdateBoothsRequest(showId, { boothIds: selectedIds, isFeatured: false }), 'Selected booths unfeatured.')}>Unfeature</button>
          <button
            className="danger-action"
            type="button"
            onClick={() => {
              if (window.confirm('Delete the selected booth records and map objects?')) {
                runAction(() => bulkDeleteBoothsRequest(showId, selectedIds), 'Selected booths deleted.');
              }
            }}
          >
            Delete Selected
          </button>
        </section>
      ) : null}

      <section className="renumber-panel">
        <h3>Renumber booths</h3>
        <div className="renumber-controls">
          <label>Starting number<input min="1" type="number" value={renumber.startingNumber} onChange={(event) => setRenumber((current) => ({ ...current, startingNumber: Number(event.target.value) }))} /></label>
          <label>Direction<select value={renumber.direction} onChange={(event) => setRenumber((current) => ({ ...current, direction: event.target.value }))}>{renumberDirections.map((direction) => <option key={direction.value} value={direction.value}>{direction.label}</option>)}</select></label>
          <button type="button" onClick={previewRenumber}>Preview</button>
          <button type="button" disabled={renumber.preview.length === 0} onClick={applyRenumber}>Apply</button>
        </div>
        {renumber.preview.length > 0 ? (
          <p className="muted">
            Preview: {renumber.preview.slice(0, 8).map((item) => `${item.existingNumber} -> ${item.proposedNumber}`).join(', ')}
            {renumber.preview.length > 8 ? '...' : ''}
          </p>
        ) : null}
      </section>

      {message ? <div className="success-message">{message}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}
      {status === 'loading' ? <p className="muted">Loading booths...</p> : null}
      {status === 'ready' && booths.length === 0 ? (
        <section className="empty-state">
          <h3>No booths found</h3>
          <p>Add booths in the map editor to create booth records.</p>
        </section>
      ) : null}

      {booths.length > 0 ? (
        <div className="table-wrap">
          <table className="shows-table booth-table">
            <thead>
              <tr>
                <th><input checked={allVisibleSelected} onChange={toggleAllVisible} type="checkbox" /></th>
                <th>Booth #</th>
                <th>Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Size</th>
                <th>Price</th>
                <th>Featured</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {booths.map((booth) => (
                <tr key={booth.id}>
                  <td><input checked={selectedIds.includes(booth.id)} onChange={() => toggleSelected(booth.id)} type="checkbox" /></td>
                  <td>{booth.boothNumber}</td>
                  <td>{booth.boothName || 'Untitled booth'}</td>
                  <td>{titleize(booth.boothType)}</td>
                  <td><span className={`booth-status booth-status-${booth.status}`}>{titleize(booth.status)}</span></td>
                  <td>{[booth.widthLabel, booth.depthLabel].filter(Boolean).join(' x ') || 'Not set'}</td>
                  <td>{formatPrice(booth.price)}</td>
                  <td>{booth.isFeatured ? 'Yes' : 'No'}</td>
                  <td>{formatDateTime(booth.updatedAt, show?.timezone)}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" onClick={() => setEditingBooth(booth)}>Edit</button>
                      <Link to={`/admin/shows/${showId}/floor-map/editor?boothId=${booth.id}`}>Locate</Link>
                      <button type="button" onClick={() => runAction(() => duplicateBoothRequest(showId, booth.id), 'Booth duplicated.')}>Duplicate</button>
                      <button
                        className="danger-action"
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete booth ${booth.boothNumber}?`)) {
                            runAction(() => deleteBoothRequest(showId, booth.id), 'Booth deleted.');
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {editingBooth ? (
        <BoothEditModal
          booth={editingBooth}
          errors={formErrors}
          onCancel={() => {
            setEditingBooth(null);
            setFormErrors({});
          }}
          onChange={(updates) => setEditingBooth((current) => ({ ...current, ...updates }))}
          onSubmit={saveBooth}
        />
      ) : null}
    </AdminLayout>
  );
}

function BoothEditModal({ booth, errors, onCancel, onChange, onSubmit }) {
  return (
    <div className="properties-overlay" role="dialog" aria-modal="true" aria-label="Edit booth">
      <button className="properties-overlay-backdrop" onClick={onCancel} type="button" />
      <form className="booth-modal" onSubmit={onSubmit}>
        <div className="panel-heading">
          <h3>Edit booth {booth.boothNumber}</h3>
          <button aria-label="Close booth editor" className="panel-close" onClick={onCancel} type="button" />
        </div>
        <FieldError errors={errors.boothNumber} />
        <label>Booth name<input value={booth.boothName || ''} onChange={(event) => onChange({ boothName: event.target.value })} /></label>
        <FieldError errors={errors.boothName} />
        <label>Type<select value={booth.boothType} onChange={(event) => onChange({ boothType: event.target.value })}>{boothTypes.map((type) => <option key={type} value={type}>{titleize(type)}</option>)}</select></label>
        <FieldError errors={errors.boothType} />
        <label>Status<select value={booth.status} onChange={(event) => onChange({ status: event.target.value })}>{statusFilters.filter((item) => item !== 'all').map((status) => <option key={status} value={status}>{titleize(status)}</option>)}</select></label>
        <FieldError errors={errors.status} />
        <div className="property-grid">
          <label>Width label<input value={booth.widthLabel || ''} onChange={(event) => onChange({ widthLabel: event.target.value })} /></label>
          <label>Depth label<input value={booth.depthLabel || ''} onChange={(event) => onChange({ depthLabel: event.target.value })} /></label>
        </div>
        <label>Price<input min="0" step="0.01" type="number" value={booth.price ?? ''} onChange={(event) => onChange({ price: event.target.value === '' ? null : Number(event.target.value) })} /></label>
        <FieldError errors={errors.price} />
        <label className="checkbox-field"><input checked={Boolean(booth.isFeatured)} onChange={(event) => onChange({ isFeatured: event.target.checked })} type="checkbox" /> Featured booth</label>
        <label>Notes<textarea value={booth.notes || ''} onChange={(event) => onChange({ notes: event.target.value })} /></label>
        <div className="page-actions">
          <button className="button primary" type="submit">Save Changes</button>
          <button className="button secondary" onClick={onCancel} type="button">Cancel</button>
        </div>
      </form>
    </div>
  );
}

function FieldError({ errors }) {
  return errors?.length ? <span className="field-error">{errors[0]}</span> : null;
}

function Stat({ label, value }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function titleize(value) {
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return 'Not set';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
}
