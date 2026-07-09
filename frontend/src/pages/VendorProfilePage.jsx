import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TierBadge } from '../components/TierBadge.jsx';
import { VendorAvatar } from '../components/VendorAvatar.jsx';
import { VendorFormFields } from '../components/VendorFormFields.jsx';
import { getVendorDashboardRequest } from '../services/dashboardService.js';
import { removeVendorLogoRequest, updateVendorProfileRequest, uploadVendorLogoRequest } from '../services/vendorService.js';
import { formatDate, formatDateRange, formatDateTime } from '../utils/dateFormat.js';
import './Dashboard.css';
import './Shows.css';

export function VendorProfilePage() {
  const [profile, setProfile] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    getVendorDashboardRequest()
      .then((data) => setProfile(data.vendorProfile))
      .catch(() => setMessage('Unable to load profile.'));
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrors({});
    setMessage('');
    try {
      const data = await updateVendorProfileRequest(profile);
      setProfile((current) => ({ ...data.vendorProfile, showActivity: current?.showActivity || [] }));
      setMessage('Profile updated.');
      setIsEditing(false);
    } catch (requestError) {
      setErrors(requestError.response?.data?.errors || {});
      setMessage(requestError.response?.data?.message || 'Unable to update profile.');
    }
  }

  async function handleLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const data = await uploadVendorLogoRequest(file, (progressEvent) => {
      if (progressEvent.total) setUploadProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
    });
    setProfile((current) => ({ ...data.vendorProfile, showActivity: current?.showActivity || [] }));
    setMessage('Logo updated.');
    setUploadProgress(0);
  }

  return (
    <main className="vendor-shell">
      <header className="vendor-header">
        <div>
          <p className="app-kicker">Vendor Portal</p>
          <h1>My Profile</h1>
        </div>
        <div className="page-actions"><Link className="button secondary link-button" to="/vendor">Dashboard</Link><Link className="button secondary link-button" to="/vendor/help">Help</Link></div>
      </header>

      {message ? <div className={message.includes('Unable') ? 'form-error' : 'success-message'}>{message}</div> : null}
      {profile ? (
        <>
          <section className="details-grid">
            <article className="details-panel vendor-profile-card">
              <VendorAvatar logoUrl={profile.logoUrl} companyName={profile.companyName} size="large" />
              <div className="vendor-info-content">
                <div className="panel-heading">
                  <h3>Vendor information</h3>
                  <button className="button secondary" type="button" onClick={() => setIsEditing(true)}>Edit Profile</button>
                </div>
                <dl>
                  <Info label="Company" value={profile.companyName || 'Not set'} />
                  <Info label="Contact" value={profile.contactName || 'Not set'} />
                  <Info label="Email" value={profile.email} />
                  <Info label="Phone" value={profile.phone || 'Not set'} />
                  <Info label="Website" value={profile.website || 'Not set'} />
                  <Info label="Description" value={profile.description || 'Not set'} />
                  <dt>Tier</dt><dd><TierBadge tier={profile.tier} /></dd>
                  <Info label="Profile" value={profile.isProfileComplete ? 'Complete' : 'Incomplete'} />
                  <Info label="Created" value={formatDate(profile.createdAt)} />
                  <Info label="Updated" value={formatDate(profile.updatedAt)} />
                </dl>
              </div>
            </article>
          </section>

          {isEditing ? (
            <EditProfileModal
              errors={errors}
              onChange={handleChange}
              onClose={() => setIsEditing(false)}
              onLogoChange={handleLogo}
              onLogoRemove={async () => {
                const data = await removeVendorLogoRequest();
                setProfile((current) => ({ ...data.vendorProfile, showActivity: current?.showActivity || [] }));
                setMessage('Logo removed.');
              }}
              onSubmit={handleSubmit}
              profile={profile}
              uploadProgress={uploadProgress}
            />
          ) : null}

          <section className="details-panel vendor-activity-panel">
            <div className="panel-heading">
              <h3>Show Activity</h3>
            </div>
            {profile.showActivity?.length ? (
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
                    {profile.showActivity.map((activity) => (
                      <tr key={activity.id}>
                        <td>
                          <Link to={`/vendor/shows/${activity.showId}`}>{activity.showName}</Link>
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
              <p className="muted">You have not been assigned a booth for any shows.</p>
            )}
          </section>
        </>
      ) : <p className="muted">Loading profile...</p>}
    </main>
  );
}

function EditProfileModal({ errors, onChange, onClose, onLogoChange, onLogoRemove, onSubmit, profile, uploadProgress }) {
  return (
    <div className="metric-modal" role="dialog" aria-modal="true" aria-label="Edit profile">
      <button className="metric-modal-backdrop" onClick={onClose} type="button" aria-label="Close edit profile" />
      <div className="metric-modal-panel vendor-profile-modal">
        <div className="panel-heading">
          <div>
            <p className="app-kicker">My Profile</p>
            <h3>Edit Profile</h3>
          </div>
          <button aria-label="Close edit profile" className="panel-close" onClick={onClose} title="Close" type="button" />
        </div>
        <form className="vendor-form inline-vendor-form" onSubmit={onSubmit}>
          <p className="muted">Profile is complete when company name, contact name, and logo are set.</p>
          {errors.email?.length ? <span className="field-error">{errors.email[0]}</span> : null}
          <label>Email<input name="email" onChange={onChange} type="email" value={profile.email || ''} /></label>
          <VendorFormFields formData={profile} errors={errors} includeTier tierReadOnly onChange={onChange} />
          <label>Upload logo<input accept=".png,.jpg,.jpeg,.webp" onChange={onLogoChange} type="file" /></label>
          {uploadProgress ? <progress max="100" value={uploadProgress} /> : null}
          {profile.logoUrl ? <button className="button secondary" type="button" onClick={onLogoRemove}>Remove Logo</button> : null}
          <div className="row-actions">
            <button className="button primary" type="submit">Save Profile</button>
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

function formatBoothType(type) {
  if (!type) return 'Not set';
  return type.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
