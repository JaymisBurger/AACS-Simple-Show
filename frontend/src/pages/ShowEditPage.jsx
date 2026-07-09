import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ShowForm } from '../components/ShowForm.jsx';
import { TierBadge } from '../components/TierBadge.jsx';
import { VendorMapPreview } from '../components/VendorMapPreview.jsx';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import { ShowReadinessContent } from './ShowReadinessPage.jsx';
import { getAdminShowAssignmentsRequest } from '../services/assignmentService.js';
import { getFloorMapImageBlobUrlRequest, getFloorMapRequest, listMapObjectsRequest } from '../services/mapService.js';
import { getShowRequest, updateShowRequest } from '../services/showService.js';
import {
  assignAdminVendorToShowRequest,
  listAdminVendorsRequest,
  listShowVendorsRequest,
  removeShowVendorRequest
} from '../services/vendorService.js';
import './FloorMap.css';
import './Shows.css';

export function ShowEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [show, setShow] = useState(null);
  const [apiErrors, setApiErrors] = useState({});
  const [message, setMessage] = useState('');
  const [vendors, setVendors] = useState([]);
  const [showVendorAssignments, setShowVendorAssignments] = useState([]);
  const [floorMap, setFloorMap] = useState(null);
  const [floorMapImageUrl, setFloorMapImageUrl] = useState('');
  const [mapObjects, setMapObjects] = useState([]);
  const [mapAssignments, setMapAssignments] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [status, setStatus] = useState('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getShowRequest(id)
      .then((data) => {
        setShow(data.show);
        setStatus('ready');
      })
      .catch((requestError) => {
        setMessage(requestError.response?.data?.message || 'Unable to load show.');
        setStatus('error');
      });
    loadVendorExclusions();
  }, [id]);

  useEffect(() => {
    let objectUrl = '';

    async function loadMapPreview() {
      try {
        const [mapData, assignmentsData] = await Promise.all([
          getFloorMapRequest(id),
          getAdminShowAssignmentsRequest(id)
        ]);
        setFloorMap(mapData.map || null);
        setMapAssignments((assignmentsData.assignments || [])
          .filter((assignment) => assignment.status === 'active')
          .map((assignment) => ({
            boothId: assignment.boothId,
            companyName: assignment.vendor?.companyName,
            logoUrl: assignment.vendor?.logoUrl
          })));

        if (!mapData.map) {
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
      } catch {
        setFloorMap(null);
        setFloorMapImageUrl('');
        setMapObjects([]);
        setMapAssignments([]);
      }
    }

    loadMapPreview();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);

  async function loadVendorExclusions() {
    try {
      const [vendorData, showVendorData] = await Promise.all([
        listAdminVendorsRequest({ active: 'all', tier: 'all', complete: 'all', showId: 'all', sort: 'company' }),
        listShowVendorsRequest(id)
      ]);
      setVendors(vendorData.vendors || []);
      setShowVendorAssignments(showVendorData.assignments || []);
    } catch {
      setVendors([]);
      setShowVendorAssignments([]);
    }
  }

  async function handleSubmit(payload) {
    setApiErrors({});
    setMessage('');
    setIsSubmitting(true);

    try {
      const data = await updateShowRequest(id, payload);
      navigate(`/admin/shows/${data.show.id}`, { replace: true });
    } catch (requestError) {
      setApiErrors(requestError.response?.data?.errors || {});
      setMessage(requestError.response?.data?.message || 'Unable to save show.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function runExclusionAction(action, success) {
    setMessage('');
    try {
      await action();
      setMessage(success);
      setSelectedVendorId('');
      await loadVendorExclusions();
    } catch (requestError) {
      setMessage(requestError.response?.data?.message || 'Unable to update vendor exclusions.');
    }
  }

  const excludedAssignments = showVendorAssignments.filter((assignment) => assignment.status === 'excluded');
  const excludedVendorIds = new Set(excludedAssignments.map((assignment) => Number(assignment.vendor?.id || assignment.vendorProfileId)));
  const availableVendors = vendors.filter((vendor) => !excludedVendorIds.has(Number(vendor.id)));

  return (
    <AdminLayout>
      <section className="page-heading">
        <div>
          <p className="app-kicker">Shows</p>
          <h2>Edit Show</h2>
        </div>
        <div className="page-actions">
          <Link className="button secondary link-button" to={`/admin/shows/${id}`}>
            Event Details
          </Link>
          <Link className="button secondary link-button" to={`/admin/shows/${id}/floor-map`}>
            Manage Floor Map
          </Link>
        </div>
      </section>
      {status === 'loading' ? <p className="muted">Loading show...</p> : null}
      {message ? <div className={status === 'error' ? 'form-error' : 'success-message'}>{message}</div> : null}
      {status === 'ready' ? (
        <>
          <ShowForm
            apiErrors={apiErrors}
            initialShow={show}
            isSubmitting={isSubmitting}
            mode="edit"
            onSubmit={handleSubmit}
          />
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
                  <Link className="button primary link-button" to={`/admin/shows/${id}/floor-map`}>
                    Manage Floor Map
                  </Link>
                  <Link className="button secondary link-button" to={`/admin/shows/${id}/booths`}>
                    Manage Booths
                  </Link>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <h3>No floor map uploaded</h3>
                <p>Upload a floor map to preview placed booths and map objects here.</p>
                <div className="page-actions map-preview-actions">
                  <Link className="button primary link-button" to={`/admin/shows/${id}/floor-map`}>
                    Manage Floor Map
                  </Link>
                  <Link className="button secondary link-button" to={`/admin/shows/${id}/booths`}>
                    Manage Booths
                  </Link>
                </div>
              </div>
            )}
          </section>
          <section className="details-panel vendor-form">
            <h3>Excluded vendors</h3>
            <p className="muted">All vendors can access this show by default. Add an exclusion only when a vendor should not have access to this show.</p>
            <label>Vendor<select value={selectedVendorId} onChange={(event) => setSelectedVendorId(event.target.value)}>
              <option value="">Choose a vendor</option>
              {availableVendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>{vendor.companyName || vendor.email}</option>
              ))}
            </select></label>
            <button
              className="button primary"
              disabled={!selectedVendorId}
              type="button"
              onClick={() => runExclusionAction(
                () => assignAdminVendorToShowRequest(selectedVendorId, { showId: id, status: 'excluded' }),
                'Vendor excluded from show.'
              )}
            >
              Exclude Vendor
            </button>

            {excludedAssignments.length ? (
              <div className="table-wrap">
                <table className="shows-table vendor-exclusions-table">
                  <thead><tr><th>Vendor</th><th>Tier</th><th>Status</th><th>Actions</th></tr></thead>
                  <tbody>{excludedAssignments.map((assignment) => (
                    <tr key={assignment.id || assignment.vendor?.id}>
                      <td><Link to={`/admin/vendors/${assignment.vendor?.id}`}>{assignment.vendor?.companyName || assignment.vendor?.email || 'Unnamed vendor'}</Link></td>
                      <td><TierBadge tier={assignment.vendor?.tier} /></td>
                      <td>{assignment.status}</td>
                      <td>
                        <button
                          aria-label={`Remove ${assignment.vendor?.companyName || 'vendor'} exclusion`}
                          className="icon-button trash-button"
                          onClick={() => {
                            if (window.confirm(`Remove the exclusion for ${assignment.vendor?.companyName || 'this vendor'}?`)) {
                              runExclusionAction(
                                () => removeShowVendorRequest(id, assignment.vendor?.id),
                                'Vendor exclusion removed.'
                              );
                            }
                          }}
                          title="Remove exclusion"
                          type="button"
                        >
                          <span className="trash-icon" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p className="muted">No vendors are excluded from this show.</p>}
          </section>
          <ShowReadinessContent embedded showId={id} />
        </>
      ) : null}
    </AdminLayout>
  );
}
