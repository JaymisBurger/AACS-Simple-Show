import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import {
  deleteFloorMapRequest,
  getFloorMapImageBlobUrlRequest,
  getFloorMapRequest,
  listMapObjectsRequest,
  uploadFloorMapRequest
} from '../services/mapService.js';
import './FloorMap.css';

const acceptedTypes = ['image/png', 'image/jpeg', 'image/webp'];

export function FloorMapManagementPage() {
  const { showId } = useParams();
  const [show, setShow] = useState(null);
  const [map, setMap] = useState(null);
  const [currentMapImageUrl, setCurrentMapImageUrl] = useState('');
  const [mapObjects, setMapObjects] = useState([]);
  const [objectCount, setObjectCount] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [keepObjects, setKeepObjects] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadMap();
  }, [showId]);

  useEffect(() => {
    if (!map) {
      setCurrentMapImageUrl('');
      return;
    }

    let objectUrl = '';
    getFloorMapImageBlobUrlRequest(showId)
      .then((url) => {
        objectUrl = url;
        setCurrentMapImageUrl(url);
      })
      .catch(() => setCurrentMapImageUrl(''));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [map, showId]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl('');
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  async function loadMap() {
    setStatus('loading');
    setError('');

    try {
      const data = await getFloorMapRequest(showId);
      setShow(data.show);
      setMap(data.map);
      setObjectCount(data.objectCount || 0);
      if (data.map) {
        await loadMapObjects();
      } else {
        setMapObjects([]);
      }
      setStatus('ready');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load floor map.');
      setStatus('error');
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    setError('');
    setMessage('');

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!acceptedTypes.includes(file.type)) {
      setSelectedFile(null);
      setError('Upload a PNG, JPG, JPEG, or WEBP image.');
      return;
    }

    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile) {
      setError('Choose a floor-map image first.');
      return;
    }

    if (map) {
      const confirmed = window.confirm(
        'Replace the existing floor map? Existing object coordinates may no longer align with the new map.'
      );
      if (!confirmed) return;
    }

    setStatus('uploading');
    setError('');
    setMessage('');
    setUploadProgress(0);

    try {
      const data = await uploadFloorMapRequest(
        showId,
        { file: selectedFile, keepObjects: map ? keepObjects : false },
        (event) => {
          if (event.total) setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      );
      setShow(data.show);
      setMap(data.map);
      setObjectCount(data.objectCount || 0);
      await loadMapObjects();
      setSelectedFile(null);
      setMessage(map ? 'Floor map replaced.' : 'Floor map uploaded.');
      setStatus('ready');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to upload floor map.');
      setStatus('ready');
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this floor map? This also removes map objects.')) return;

    try {
      await deleteFloorMapRequest(showId);
      setMap(null);
      setMapObjects([]);
      setObjectCount(0);
      setMessage('Floor map deleted.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete floor map.');
    }
  }

  async function loadMapObjects() {
    try {
      const data = await listMapObjectsRequest(showId);
      setMapObjects(data.objects || []);
    } catch (requestError) {
      setMapObjects([]);
    }
  }

  return (
    <AdminLayout>
      <section className="page-heading">
        <div>
          <p className="app-kicker">Floor Maps</p>
          <h2>{show?.name || 'Floor Map'}</h2>
        </div>
        <div className="page-actions">
          {map ? (
            <Link className="button primary link-button" to={`/admin/shows/${showId}/floor-map/editor`}>
              Edit Floor Map
            </Link>
          ) : null}
          <Link className="button secondary link-button" to={`/admin/shows/${showId}`}>
            Event Details
          </Link>
          <Link className="button secondary link-button" to={`/admin/shows/${showId}/edit`}>
            Edit Show
          </Link>
          <Link className="button secondary link-button" to={`/admin/shows/${showId}/booths`}>
            Booths
          </Link>
        </div>
      </section>

      {status === 'loading' ? <p className="muted">Loading floor map...</p> : null}
      {message ? <div className="success-message">{message}</div> : null}
      {error ? <div className="form-error">{error}</div> : null}

      <section className="map-management-grid">
        <article className="details-panel map-preview-panel">
          <h3>Current floor map</h3>
          {map ? (
            <>
              {currentMapImageUrl ? (
                <FloorMapPreview imageAlt={map.originalFilename} imageUrl={currentMapImageUrl} objects={mapObjects} />
              ) : (
                <p className="muted">Loading map preview...</p>
              )}
              <dl>
                <Info label="Map objects" value={String(objectCount)} />
              </dl>
            </>
          ) : (
            <div className="empty-state">
              <h3>No floor map uploaded</h3>
              <p>Upload a PNG, JPG, JPEG, or WEBP image to start building the admin map.</p>
            </div>
          )}
        </article>

        <article className="details-panel upload-panel">
          <h3>{map ? 'Replace Map' : 'Upload Map'}</h3>
          <input accept=".png,.jpg,.jpeg,.webp" onChange={handleFileChange} type="file" />
          {map ? (
            <label className="checkbox-field">
              <input
                checked={keepObjects}
                onChange={(event) => setKeepObjects(event.target.checked)}
                type="checkbox"
              />
              Keep existing map objects
            </label>
          ) : null}
          {map ? (
            <p className="muted">Replacing the map may cause existing coordinates to misalign.</p>
          ) : null}
          {previewUrl ? (
            <div className="pending-preview">
              <span>Preview</span>
              <img alt="Selected floor map preview" src={previewUrl} />
            </div>
          ) : null}
          {status === 'uploading' ? <progress max="100" value={uploadProgress} /> : null}
          <button
            className="button primary"
            disabled={status === 'uploading'}
            onClick={handleUpload}
            type="button"
          >
            {status === 'uploading' ? `Uploading ${uploadProgress}%` : map ? 'Upload Replacement' : 'Upload Map'}
          </button>
          {map && show?.status === 'draft' ? (
            <button className="button secondary" onClick={handleDelete} type="button">
              Delete Map
            </button>
          ) : null}
        </article>
      </section>
    </AdminLayout>
  );
}

function Info({ label, value }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </>
  );
}

function FloorMapPreview({ imageAlt, imageUrl, objects }) {
  const booths = objects
    .filter((object) => object.objectType === 'booth')
    .sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="floor-map-preview-frame">
      <img alt={imageAlt} src={imageUrl} />
      <div className="floor-map-booth-layer" aria-label="Placed booths">
        {booths.map((boothObject) => (
          <div
            className={`floor-map-booth-preview booth-preview-${boothObject.booth?.status || 'available'}`}
            key={boothObject.id}
            style={{
              height: `${boothObject.heightPercent}%`,
              left: `${boothObject.xPercent}%`,
              top: `${boothObject.yPercent}%`,
              transform: `rotate(${boothObject.rotation || 0}deg)`,
              width: `${boothObject.widthPercent}%`
            }}
            title={`Booth ${boothObject.booth?.boothNumber || ''}`}
          >
            {boothObject.booth?.isFeatured ? <span className="booth-preview-featured">*</span> : null}
            <span>{boothObject.booth?.boothNumber || boothObject.metadataJson?.boothNumber || ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
