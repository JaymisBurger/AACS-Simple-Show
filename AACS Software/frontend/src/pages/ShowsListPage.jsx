import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from '../components/StatusBadge.jsx';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import {
  archiveShowRequest,
  closeShowRequest,
  listShowsRequest,
  publishShowRequest,
  restoreShowRequest
} from '../services/showService.js';
import { formatDateRange, formatDateTime } from '../utils/dateFormat.js';
import './Shows.css';

const filters = ['all', 'draft', 'published', 'closed', 'archived'];

export function ShowsListPage() {
  const [shows, setShows] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadShows();
    }, 150);

    return () => window.clearTimeout(timeout);
  }, [filter, search]);

  async function loadShows() {
    setStatus('loading');
    setError('');

    try {
      const data = await listShowsRequest({ status: filter, search });
      setShows(data.shows);
      setStatus('ready');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load shows.');
      setStatus('error');
    }
  }

  async function runAction(action, successMessage) {
    setMessage('');
    setError('');

    try {
      await action();
      setMessage(successMessage);
      await loadShows();
    } catch (requestError) {
      if (requestError.response?.status === 409 && requestError.response?.data?.warnings) {
        const warnings = requestError.response.data.warnings;
        const confirmed = window.confirm(`This show has active records:\n\nActive assignments: ${warnings.activeAssignments}\nPublic links: ${warnings.publicLinks}\nCommunication drafts: ${warnings.communicationDrafts}\nAssignment history: ${warnings.assignmentHistory}\n\nArchive anyway? Public links will be disabled.`);
        if (confirmed) {
          await action(true);
          setMessage(successMessage);
          await loadShows();
          return;
        }
      }
      setError(requestError.response?.data?.message || 'Unable to update show.');
    }
  }

  return (
    <AdminLayout>
      <section className="page-heading">
        <div>
          <p className="app-kicker">Shows</p>
          <h2>Shows List</h2>
        </div>
        <Link className="button primary link-button" to="/admin/shows/new">
          Create Show
        </Link>
      </section>

      <section className="show-toolbar">
        <div className="filter-tabs" aria-label="Show status filters">
          {filters.map((item) => (
            <button
              className={filter === item ? 'active' : ''}
              key={item}
              onClick={() => setFilter(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
        <input
          aria-label="Search shows"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by show name or venue"
          value={search}
        />
      </section>

      {message ? <div className="success-message">{message}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}
      {status === 'loading' ? <p className="muted">Loading shows...</p> : null}

      {status === 'ready' && shows.length === 0 ? (
        <section className="empty-state">
          <h3>No shows found</h3>
          <p>Create the first show or adjust the current filters.</p>
        </section>
      ) : null}

      {shows.length > 0 ? (
        <div className="table-wrap">
          <table className="shows-table">
            <thead>
              <tr>
                <th>Show name</th>
                <th>Venue</th>
                <th>Event dates</th>
                <th>Status</th>
                <th>Vendor selection deadline</th>
                <th>Selection paused</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shows.map((show) => (
                <tr key={show.id}>
                  <td>{show.name || 'Untitled show'}</td>
                  <td>{show.venueName || 'Venue not set'}</td>
                  <td>{formatDateRange(show.startDate, show.endDate)}</td>
                  <td><StatusBadge status={show.status} /></td>
                  <td>{formatDateTime(show.vendorSelectionDeadline, show.timezone)}</td>
                  <td>{show.selectionPaused ? 'Yes' : 'No'}</td>
                  <td>
                    <div className="row-actions">
                      <Link to={`/admin/shows/${show.id}`}>View</Link>
                      <Link to={`/admin/shows/${show.id}/edit`}>Readiness</Link>
                      <Link to={`/admin/shows/${show.id}/floor-map`}>Floor Map</Link>
                      {show.status !== 'archived' ? (
                        <Link to={`/admin/shows/${show.id}/edit`}>Edit</Link>
                      ) : null}
                      {show.status === 'draft' ? (
                        <button onClick={() => runAction(() => publishShowRequest(show.id), 'Show published.')} type="button">
                          Publish
                        </button>
                      ) : null}
                      {show.status === 'published' ? (
                        <button onClick={() => runAction(() => closeShowRequest(show.id), 'Show closed.')} type="button">
                          Close
                        </button>
                      ) : null}
                      {show.status !== 'archived' ? (
                        <button
                          onClick={() => {
                            if (window.confirm('Archive this show?')) {
                              runAction((confirmed) => archiveShowRequest(show.id, { confirmArchive: Boolean(confirmed) }), 'Show archived.');
                            }
                          }}
                          type="button"
                        >
                          Archive
                        </button>
                      ) : (
                        <button onClick={() => runAction(() => restoreShowRequest(show.id), 'Show restored.')} type="button">
                          Restore
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </AdminLayout>
  );
}
