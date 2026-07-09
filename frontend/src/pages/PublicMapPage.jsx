import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TierBadge } from '../components/TierBadge.jsx';
import { VendorMapPreview } from '../components/VendorMapPreview.jsx';
import { getPublicMapImageBlobUrlRequest, getPublicMapRequest } from '../services/eventDayService.js';
import { formatDateRange } from '../utils/dateFormat.js';
import './Dashboard.css';
import './FloorMap.css';
import './Shows.css';

export function PublicMapPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getPublicMapRequest(token)
      .then(async (nextData) => {
        setData(nextData);
        setImageUrl(await getPublicMapImageBlobUrlRequest(token));
      })
      .catch((requestError) => setError(requestError.response?.data?.message || 'Public map is not available.'));
  }, [token]);

  return (
    <main className="public-shell">
      {error ? <section className="empty-state"><h1>Public link unavailable</h1><p>{error}</p></section> : null}
      {data ? (
        <>
          <header className="public-header print-title">
            <div>
              <p className="app-kicker">Event Map</p>
              <h1>{data.show.name}</h1>
              <p>{data.show.venueName} · {formatDateRange(data.show.startDate, data.show.endDate)}</p>
            </div>
            <div className="page-actions no-print">
              <Link className="button secondary link-button" to={`/public/shows/${token}/vendors`}>Vendor Directory</Link>
              <button className="button secondary" type="button" onClick={() => window.print()}>Print Map</button>
            </div>
          </header>
          <section className="details-panel">
            <div className="legend-row">
              <span className="booth-status booth-status-assigned">Assigned</span>
              <span className="booth-status booth-status-available">Available</span>
              <span className="booth-status booth-status-reserved">Reserved</span>
              <span className="booth-status booth-status-unavailable">Unavailable</span>
            </div>
            <VendorMapPreview
              assignments={data.assignments}
              imageUrl={imageUrl}
              objects={data.objects || []}
              onBoothClick={(detail) => setSelected(detail)}
              readonly
              selectedBoothId={selected?.booth?.id}
            />
          </section>
          {selected ? (
            <section className="details-panel vendor-selection-panel">
              <h3>Booth {selected.booth.boothNumber}</h3>
              {selected.assignment ? (
                <>
                  <p><strong>{selected.assignment.companyName}</strong></p>
                  {selected.assignment.website ? <a href={selected.assignment.website} rel="noreferrer" target="_blank">{selected.assignment.website}</a> : null}
                </>
              ) : <p>{selected.booth.boothType}</p>}
            </section>
          ) : null}
        </>
      ) : !error ? <p className="muted">Loading public map...</p> : null}
    </main>
  );
}
