import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { VendorAvatar } from '../components/VendorAvatar.jsx';
import { VendorMapPreview } from '../components/VendorMapPreview.jsx';
import { getVendorFloorMapImageBlobUrlRequest, getVendorMyBoothRequest } from '../services/assignmentService.js';
import { formatDateRange, formatDateTime } from '../utils/dateFormat.js';
import './Dashboard.css';
import './FloorMap.css';
import './Shows.css';

export function VendorMyBoothPage() {
  const { showId } = useParams();
  const [data, setData] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getVendorMyBoothRequest(showId)
      .then(async (nextData) => {
        setData(nextData);
        setImageUrl(await getVendorFloorMapImageBlobUrlRequest(showId));
      })
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load booth.'));
  }, [showId]);

  const assignment = data?.assignment;

  return (
    <main className="vendor-shell">
      <header className="vendor-header">
        <div>
          <p className="app-kicker">My Booth</p>
          <h1>{assignment?.showName || 'My Booth'}</h1>
        </div>
        <div className="page-actions no-print">
          <Link className="button secondary link-button" to="/vendor">Dashboard</Link>
          <Link className="button secondary link-button" to={`/vendor/shows/${showId}/floor-map`}>Floor Map</Link>
          <Link className="button secondary link-button" to="/vendor/help">Help</Link>
        </div>
      </header>
      {error ? <div className="form-error">{error}</div> : null}
      {assignment ? (
        <>
          {imageUrl ? (
            <section className="details-panel">
              <VendorMapPreview
                assignments={[{ boothId: assignment.boothId, companyName: assignment.vendor.companyName, logoUrl: assignment.vendor.logoUrl }]}
                imageUrl={imageUrl}
                objects={data.objects || []}
                ownAssignment={assignment}
                readonly
              />
            </section>
          ) : null}
          <section className="details-panel vendor-profile-card">
            <VendorAvatar logoUrl={assignment.vendor.logoUrl} companyName={assignment.vendor.companyName} size="large" />
            <dl>
              <Info label="Company" value={assignment.vendor.companyName} />
              <Info label="Show" value={assignment.showName} />
              <Info label="Show dates" value={formatDateRange(assignment.startDate, assignment.endDate)} />
              <Info label="Booth" value={String(assignment.booth.boothNumber)} />
              <Info label="Type" value={assignment.booth.boothType} />
              <Info label="Dimensions" value={[assignment.booth.widthLabel, assignment.booth.depthLabel].filter(Boolean).join(' x ') || 'Not set'} />
              <Info label="Price" value={assignment.booth.price ? `$${assignment.booth.price}` : 'Not set'} />
              <Info label="Notes" value={assignment.booth.notes || 'None'} />
              <Info label="Selected" value={formatDateTime(assignment.confirmedAt, assignment.timezone)} />
              <Info label="Status" value={assignment.status} />
            </dl>
          </section>
          <p className="muted">Booth changes must be requested through the association administrator.</p>
        </>
      ) : !error ? <p className="muted">Loading booth...</p> : null}
    </main>
  );
}

function Info({ label, value }) {
  return <><dt>{label}</dt><dd>{value}</dd></>;
}
