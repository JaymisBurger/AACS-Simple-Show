import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import { getNotificationsRequest } from '../services/opsService.js';
import './Shows.css';

export function AdminNotificationsPage() {
  const [data, setData] = useState({ notices: [] });
  const [error, setError] = useState('');
  useEffect(() => { getNotificationsRequest().then(setData).catch(() => setError('Unable to load notifications.')); }, []);
  return (
    <AdminLayout>
      <section className="page-heading"><div><p className="app-kicker">Operations</p><h2>Notifications</h2></div></section>
      {error ? <div className="form-error">{error}</div> : null}
      {data.notices?.length ? data.notices.map((notice, index) => <article className="details-panel" key={`${notice.title}-${index}`}><h3>{notice.title}</h3><p className="muted">{notice.context || notice.type}</p>{notice.url ? <Link className="button secondary link-button" to={notice.url}>Open</Link> : null}</article>) : <section className="empty-state"><h3>No unresolved notices</h3><p>System-generated reminders will appear here as your shows and vendors change.</p></section>}
    </AdminLayout>
  );
}
