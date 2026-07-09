import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShowForm } from '../components/ShowForm.jsx';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import { createShowRequest } from '../services/showService.js';
import './Shows.css';

export function ShowCreatePage() {
  const navigate = useNavigate();
  const [apiErrors, setApiErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(payload) {
    setApiErrors({});
    setMessage('');
    setIsSubmitting(true);

    try {
      const data = await createShowRequest(payload);
      navigate(`/admin/shows/${data.show.id}`, { replace: true });
    } catch (requestError) {
      setApiErrors(requestError.response?.data?.errors || {});
      setMessage(requestError.response?.data?.message || 'Unable to save show.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AdminLayout>
      <section className="page-heading">
        <div>
          <p className="app-kicker">Shows</p>
          <h2>Create Show</h2>
        </div>
      </section>
      {message ? <div className="form-error">{message}</div> : null}
      <ShowForm apiErrors={apiErrors} isSubmitting={isSubmitting} mode="create" onSubmit={handleSubmit} />
    </AdminLayout>
  );
}
