import { useEffect, useState } from 'react';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import { getReleaseNotesRequest } from '../services/opsService.js';
import './Shows.css';

export function AdminReleaseNotesPage() {
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getReleaseNotesRequest().then((data) => setNotes(data.releaseNotes || [])).catch(() => setError('Unable to load release notes.'));
  }, []);

  return (
    <AdminLayout>
      <section className="page-heading"><div><p className="app-kicker">Operations</p><h2>Release Notes</h2></div></section>
      {error ? <div className="form-error">{error}</div> : null}
      <section className="details-panel">
        <div className="table-wrap">
          <table className="shows-table">
            <thead><tr><th>Version</th><th>Title</th><th>Feature area</th><th>Date added</th><th>Summary</th></tr></thead>
            <tbody>{notes.map((note) => <tr key={note.version}><td>{note.version}</td><td>{note.title}</td><td>{note.featureArea}</td><td>{note.dateAdded}</td><td>{note.summary}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
}
