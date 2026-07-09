import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { TierBadge } from '../components/TierBadge.jsx';
import { VendorAvatar } from '../components/VendorAvatar.jsx';
import { FieldError, VendorFormFields } from '../components/VendorFormFields.jsx';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import {
  getAdminVendorRequest,
  removeAdminVendorLogoRequest,
  resetAdminVendorPasswordRequest,
  updateAdminVendorRequest,
  updateAdminVendorStatusRequest,
  updateAdminVendorTierRequest,
  uploadAdminVendorLogoRequest
} from '../services/vendorService.js';
import { formatDate, formatDateRange, formatDateTime } from '../utils/dateFormat.js';
import './Shows.css';

const tiers = ['platinum', 'gold', 'silver', 'bronze'];

export function AdminVendorDetailPage() {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editingProfile = searchParams.get('edit') === '1';
  const [vendor, setVendor] = useState(null);
  const [formData, setFormData] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('loading');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadVendor();
  }, [vendorId]);

  async function loadVendor() {
    setStatus('loading');
    try {
      const data = await getAdminVendorRequest(vendorId);
      setVendor(data.vendor);
      setFormData(data.vendor);
      setStatus('ready');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load vendor.');
      setStatus('error');
    }
  }

  async function runAction(action, success) {
    setError('');
    setMessage('');
    try {
      const data = await action();
      setMessage(data?.resetUrl || success);
      await loadVendor();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update vendor.');
    }
  }

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setFormErrors({});
    try {
      const data = await updateAdminVendorRequest(vendor.id, formData);
      setVendor(data.vendor);
      setFormData(data.vendor);
      navigate(`/admin/vendors/${vendor.id}`, { replace: true });
      setMessage('Vendor profile saved.');
    } catch (requestError) {
      setFormErrors(requestError.response?.data?.errors || {});
      setError(requestError.response?.data?.message || 'Unable to save vendor.');
    }
  }

  async function handleLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    await runAction(
      () => uploadAdminVendorLogoRequest(vendorId, file, (progressEvent) => {
        if (progressEvent.total) setUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
      }),
      'Logo uploaded.'
    );
    setUploadProgress(0);
  }

  async function handleTemporaryPasswordReset() {
    if (temporaryPassword.length < 8) {
      setError('Temporary password must be at least 8 characters.');
      setMessage('');
      return;
    }
    await runAction(
      () => resetAdminVendorPasswordRequest(vendor.id, { temporaryPassword }),
      'Temporary password set.'
    );
    setTemporaryPassword('');
  }

  return (
    <AdminLayout>
      <section className="page-heading">
        <div>
          <p className="app-kicker">Vendor Details</p>
          <h2>{vendor?.companyName || 'Vendor'}</h2>
        </div>
        <div className="page-actions">
          <Link className="button secondary link-button" to="/admin/vendors">Vendor List</Link>
        </div>
      </section>

      {status === 'loading' ? <p className="muted">Loading vendor...</p> : null}
      {message ? <div className="success-message">{message}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}

      {vendor ? (
        <>
          <section className="details-grid">
            <article className="details-panel vendor-profile-card">
              <VendorAvatar logoUrl={vendor.logoUrl} companyName={vendor.companyName} size="large" />
              <div className="vendor-info-content">
                <div className="panel-heading">
                  <h3>Vendor information</h3>
                  {!editingProfile ? (
                    <Link className="button secondary link-button" to={`/admin/vendors/${vendor.id}?edit=1`}>Edit</Link>
                  ) : null}
                </div>
                {editingProfile ? (
                  <form className="vendor-form inline-vendor-form" onSubmit={handleProfileSubmit}>
                    <FieldError errors={formErrors.email} />
                    <label>Email<input name="email" onChange={handleFieldChange} type="email" value={formData?.email || ''} /></label>
                    <VendorFormFields formData={formData || vendor} errors={formErrors} onChange={handleFieldChange} />
                    <div className="vendor-edit-actions">
                      <h4>Admin options</h4>
                      <label>Tier<select value={vendor.tier} onChange={(event) => {
                        const lower = tiers.indexOf(event.target.value) > tiers.indexOf(vendor.tier);
                        if (!lower || window.confirm('Change this vendor to a lower tier?')) {
                          runAction(() => updateAdminVendorTierRequest(vendor.id, event.target.value), 'Tier updated.');
                        }
                      }}>{tiers.map((tier) => <option key={tier} value={tier}>{tier}</option>)}</select></label>
                      <button className="button secondary" type="button" onClick={() => runAction(() => updateAdminVendorStatusRequest(vendor.id, !vendor.isActive), vendor.isActive ? 'Vendor deactivated.' : 'Vendor activated.')}>{vendor.isActive ? 'Deactivate' : 'Activate'} Account</button>
                      <button className="button secondary" type="button" onClick={() => runAction(() => resetAdminVendorPasswordRequest(vendor.id, { mode: 'link' }), 'Reset link generated.')}>Generate Reset Link</button>
                      <label>
                        Temporary password
                        <input
                          minLength="8"
                          onChange={(event) => setTemporaryPassword(event.target.value)}
                          placeholder="At least 8 characters"
                          type="text"
                          value={temporaryPassword}
                        />
                      </label>
                      <button className="button secondary" disabled={temporaryPassword.length < 8} type="button" onClick={handleTemporaryPasswordReset}>Reset Password</button>
                      <label>Upload logo<input accept=".png,.jpg,.jpeg,.webp" onChange={handleLogo} type="file" /></label>
                      {uploadProgress ? <progress max="100" value={uploadProgress} /> : null}
                      {vendor.logoUrl ? <button className="button secondary" type="button" onClick={() => runAction(() => removeAdminVendorLogoRequest(vendor.id), 'Logo removed.')}>Remove Logo</button> : null}
                    </div>
                    <div className="row-actions">
                      <button className="button primary" type="submit">Save Vendor</button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(vendor);
                          setFormErrors({});
                          navigate(`/admin/vendors/${vendor.id}`);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <dl>
                    <Info label="Company" value={vendor.companyName || 'Not set'} />
                    <Info label="Contact" value={vendor.contactName || 'Not set'} />
                    <Info label="Email" value={vendor.email} />
                    <Info label="Phone" value={vendor.phone || 'Not set'} />
                    <Info label="Website" value={vendor.website || 'Not set'} />
                    <Info label="Description" value={vendor.description || 'Not set'} />
                    <dt>Tier</dt><dd><TierBadge tier={vendor.tier} /></dd>
                    <Info label="Account" value={vendor.isActive ? 'Active' : 'Inactive'} />
                    <Info label="Profile" value={vendor.isProfileComplete ? 'Complete' : 'Incomplete'} />
                    <Info label="Created" value={formatDate(vendor.createdAt)} />
                    <Info label="Updated" value={formatDate(vendor.updatedAt)} />
                  </dl>
                )}
              </div>
            </article>
          </section>

          <section className="details-panel vendor-activity-panel">
            <div className="panel-heading">
              <h3>Show Activity</h3>
            </div>
            {vendor.showActivity?.length ? (
              <div className="table-wrap">
                <table className="shows-table vendor-activity-table">
                  <thead>
                    <tr>
                      <th>Show</th>
                      <th>Event dates</th>
                      <th>Booth number</th>
                      <th>Booth type</th>
                      <th>Assigned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendor.showActivity.map((activity) => (
                      <tr key={activity.id}>
                        <td>
                          <Link to={`/admin/shows/${activity.showId}`}>{activity.showName}</Link>
                          {activity.venueName ? <span className="table-subtext">{activity.venueName}</span> : null}
                        </td>
                        <td>{formatDateRange(activity.startDate, activity.endDate)}</td>
                        <td>{activity.boothNumber || 'Not set'}</td>
                        <td>{formatBoothType(activity.boothType)}</td>
                        <td>{formatDateTime(activity.confirmedAt || activity.selectedAt || activity.assignedAt, activity.timezone)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">This vendor has not been assigned a booth for any shows.</p>
            )}
          </section>

        </>
      ) : null}
    </AdminLayout>
  );
}

function Info({ label, value }) {
  return <><dt>{label}</dt><dd>{value}</dd></>;
}

function formatBoothType(type) {
  if (!type) return 'Not set';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
