import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FieldError, VendorFormFields } from '../components/VendorFormFields.jsx';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import { createAdminVendorRequest } from '../services/vendorService.js';
import './Shows.css';

const initialForm = {
  email: '',
  temporaryPassword: '',
  creationMode: 'temporary_password',
  companyName: '',
  contactName: '',
  phone: '',
  website: '',
  description: '',
  tier: 'bronze',
  isActive: true
};

export function AdminVendorCreatePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('ready');

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('saving');
    setErrors({});
    setMessage('');
    try {
      const data = await createAdminVendorRequest(formData);
      if (data.activationUrl) {
        setMessage(`Activation URL: ${data.activationUrl}`);
        setStatus('ready');
      } else {
        navigate(`/admin/vendors/${data.vendor.id}`);
      }
    } catch (requestError) {
      setErrors(requestError.response?.data?.errors || {});
      setMessage(requestError.response?.data?.message || 'Unable to create vendor.');
      setStatus('ready');
    }
  }

  return (
    <AdminLayout>
      <section className="page-heading">
        <div>
          <p className="app-kicker">Vendors</p>
          <h2>Create Vendor</h2>
        </div>
        <Link className="button secondary link-button" to="/admin/vendors">Vendor List</Link>
      </section>

      {message ? <div className={message.startsWith('Activation') ? 'success-message' : 'form-error'}>{message}</div> : null}
      <form className="details-panel vendor-form" onSubmit={handleSubmit}>
        <FieldError errors={errors.email} />
        <label>Email<input name="email" onChange={handleChange} type="email" value={formData.email} /></label>
        <label>Creation mode<select name="creationMode" onChange={handleChange} value={formData.creationMode}><option value="temporary_password">Temporary password</option><option value="invitation">Invitation link</option></select></label>
        {formData.creationMode === 'temporary_password' ? (
          <>
            <FieldError errors={errors.temporaryPassword} />
            <label>Temporary password<input name="temporaryPassword" onChange={handleChange} type="text" value={formData.temporaryPassword} /></label>
          </>
        ) : null}
        <VendorFormFields formData={formData} errors={errors} includeTier onChange={handleChange} />
        <label className="checkbox-field"><input checked={formData.isActive} name="isActive" onChange={handleChange} type="checkbox" /> Active account</label>
        <div className="page-actions">
          <button className="button primary" disabled={status === 'saving'} type="submit">{status === 'saving' ? 'Saving...' : 'Create Vendor'}</button>
        </div>
      </form>
    </AdminLayout>
  );
}
