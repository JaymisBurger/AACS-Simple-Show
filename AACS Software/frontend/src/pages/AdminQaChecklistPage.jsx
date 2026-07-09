import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import {
  downloadQaChecklistRequest,
  getMigrationStatusRequest,
  getQaChecklistRequest,
  getSetupStatusRequest,
  resetQaChecklistRequest,
  updateQaItemRequest
} from '../services/opsService.js';
import { formatDateTime } from '../utils/dateFormat.js';
import './Shows.css';

const statuses = [
  ['not_checked', 'Not checked'],
  ['passed', 'Passed'],
  ['failed', 'Failed'],
  ['needs_review', 'Needs review']
];

export function AdminQaChecklistPage() {
  const [items, setItems] = useState([]);
  const [setup, setSetup] = useState(null);
  const [migrations, setMigrations] = useState(null);
  const [filter, setFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setError('');
    try {
      const [qaData, setupData, migrationData] = await Promise.all([
        getQaChecklistRequest(),
        getSetupStatusRequest(),
        getMigrationStatusRequest()
      ]);
      setItems(qaData.items);
      setSetup(setupData);
      setMigrations(migrationData.migrationStatus);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load QA tools.');
    }
  }

  async function updateItem(item, patch) {
    const data = await updateQaItemRequest(item.key, { status: item.status, notes: item.notes, ...patch });
    setItems(data.items);
    setMessage('Checklist updated.');
  }

  async function resetChecklist() {
    if (!window.confirm('Reset the QA checklist?')) return;
    const data = await resetQaChecklistRequest();
    setItems(data.items);
    setMessage('Checklist reset.');
  }

  const grouped = useMemo(() => {
    const visible = filter === 'all' ? items : items.filter((item) => item.status === filter);
    return visible.reduce((result, item) => {
      if (!result[item.area]) result[item.area] = [];
      result[item.area].push(item);
      return result;
    }, {});
  }, [items, filter]);

  const counts = statuses.reduce((result, [status]) => ({ ...result, [status]: items.filter((item) => item.status === status).length }), {});

  return (
    <AdminLayout>
      <section className="page-heading">
        <div><p className="app-kicker">Operations</p><h2>Manual QA Checklist</h2></div>
        <div className="page-actions">
          <button className="button secondary" type="button" onClick={downloadQaChecklistRequest}>Export QA CSV</button>
          <button className="button secondary" type="button" onClick={resetChecklist}>Reset Checklist</button>
        </div>
      </section>
      {message ? <div className="success-message">{message}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}

      <section className="booth-stats">
        <Stat label="Passed" value={counts.passed || 0} />
        <Stat label="Failed" value={counts.failed || 0} />
        <Stat label="Needs review" value={counts.needs_review || 0} />
        <Stat label="Not checked" value={counts.not_checked || 0} />
      </section>

      <section className="details-grid">
        <article className="details-panel">
          <h3>First-run setup checks</h3>
          <p className={setup?.ok ? 'success-text' : 'warning-text'}>{setup?.ok ? 'Setup checks passed.' : 'Setup needs attention.'}</p>
          <ul className="checklist">
            {(setup?.checks || []).map((check) => <li className={check.status === 'pass' ? 'complete' : 'incomplete'} key={check.name}>{check.name}: {check.message}</li>)}
          </ul>
        </article>
        <article className="details-panel">
          <h3>Migration status</h3>
          <p><strong>Known schema version:</strong> {migrations?.knownVersion || 'Unknown'}</p>
          <p><strong>Missing expected migrations:</strong> {migrations?.missing?.length || 0}</p>
          <ul className="checklist">
            {(migrations?.applied || []).map((item) => <li className="complete" key={item.migrationName}>{item.migrationName}</li>)}
          </ul>
        </article>
      </section>

      <section className="show-toolbar booth-toolbar">
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">All statuses</option>
          {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </section>

      {Object.entries(grouped).map(([area, areaItems]) => (
        <section className="details-panel" key={area}>
          <h3>{area}</h3>
          <div className="table-wrap">
            <table className="shows-table">
              <thead><tr><th>Task</th><th>Why it matters</th><th>Expected result</th><th>Status</th><th>Notes</th><th>Checked</th><th>Actions</th></tr></thead>
              <tbody>{areaItems.map((item) => <tr key={item.key}><td>{item.taskName}</td><td>{item.whyItMatters}</td><td>{item.expectedResult}</td><td>{labelStatus(item.status)}</td><td><textarea aria-label={`${item.taskName} notes`} value={item.notes} onChange={(event) => setItems((current) => current.map((row) => row.key === item.key ? { ...row, notes: event.target.value } : row))} /></td><td>{formatDateTime(item.checkedAt)}</td><td><div className="row-actions">{statuses.slice(1).map(([value, label]) => <button key={value} type="button" onClick={() => updateItem(item, { status: value })}>{label}</button>)}<button type="button" onClick={() => updateItem(item, { status: 'not_checked' })}>Reset</button><button type="button" onClick={() => updateItem(item, { notes: item.notes })}>Save Notes</button></div></td></tr>)}</tbody>
            </table>
          </div>
        </section>
      ))}
      {!items.length ? <section className="empty-state"><h3>No QA checklist items loaded</h3><p>Refresh the page or run setup checks.</p></section> : null}
    </AdminLayout>
  );
}

function Stat({ label, value }) {
  return <div><strong>{value}</strong><span>{label}</span></div>;
}

function labelStatus(value) {
  return statuses.find(([status]) => status === value)?.[1] || value;
}
