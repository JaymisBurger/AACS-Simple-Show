import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TierBadge } from '../components/TierBadge.jsx';
import { VendorAvatar } from '../components/VendorAvatar.jsx';
import { getPublicDirectoryRequest } from '../services/eventDayService.js';
import { formatDateRange } from '../utils/dateFormat.js';
import './Dashboard.css';
import './Shows.css';

export function PublicVendorDirectoryPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('company');
  const [boothType, setBoothType] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    getPublicDirectoryRequest(token)
      .then(setData)
      .catch((requestError) => setError(requestError.response?.data?.message || 'Public directory is not available.'));
  }, [token]);

  const boothTypes = useMemo(() => Array.from(new Set((data?.vendors || []).map((vendor) => vendor.boothType).filter(Boolean))), [data]);
  const vendors = useMemo(() => (data?.vendors || [])
    .filter((vendor) => boothType === 'all' || vendor.boothType === boothType)
    .filter((vendor) => vendor.companyName?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'booth' ? Number(a.boothNumber || 0) - Number(b.boothNumber || 0) : String(a.companyName || '').localeCompare(String(b.companyName || ''))), [data, search, sort, boothType]);

  return (
    <main className="public-shell">
      {error ? <section className="empty-state"><h1>Public link unavailable</h1><p>{error}</p></section> : null}
      {data ? (
        <>
          <header className="public-header print-title">
            <div>
              <p className="app-kicker">Vendor Directory</p>
              <h1>{data.show.name}</h1>
              <p>{data.show.venueName} · {formatDateRange(data.show.startDate, data.show.endDate)}</p>
            </div>
            <div className="page-actions no-print">
              <Link className="button secondary link-button" to={`/public/shows/${token}/map`}>Map</Link>
              <button className="button secondary" type="button" onClick={() => window.print()}>Print Directory</button>
            </div>
          </header>
          <section className="show-toolbar booth-toolbar no-print">
            <input placeholder="Search vendors" value={search} onChange={(event) => setSearch(event.target.value)} />
            <select value={boothType} onChange={(event) => setBoothType(event.target.value)}><option value="all">All booth types</option>{boothTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select>
            <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="company">Company name</option><option value="booth">Booth number</option></select>
          </section>
          <section className="public-directory-grid">
            {vendors.map((vendor) => (
              <article className="details-panel public-vendor-card" key={vendor.id}>
                <VendorAvatar logoUrl={vendor.logoUrl} companyName={vendor.companyName} size="large" />
                <div>
                  <h3>{vendor.companyName}</h3>
                  <p>Booth {vendor.boothNumber || 'TBD'}</p>
                  {vendor.tier ? <TierBadge tier={vendor.tier} /> : null}
                  {vendor.website ? <p><a href={vendor.website} rel="noreferrer" target="_blank">{vendor.website}</a></p> : null}
                  {vendor.description ? <p>{vendor.description}</p> : null}
                  <Link to={`/public/shows/${token}/map`}>View on map</Link>
                </div>
              </article>
            ))}
          </section>
        </>
      ) : !error ? <p className="muted">Loading directory...</p> : null}
    </main>
  );
}
