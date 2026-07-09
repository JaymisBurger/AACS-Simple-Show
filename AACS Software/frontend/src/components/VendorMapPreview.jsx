import { uploadedAssetUrl } from '../services/vendorService.js';
import { useMemo, useState } from 'react';

export function VendorMapPreview({ imageUrl, objects, assignments = [], ownAssignment, selectedBoothId, onBoothClick, readonly = false }) {
  const [zoom, setZoom] = useState(1);
  const [query, setQuery] = useState('');
  const [hoverTooltip, setHoverTooltip] = useState(null);
  const assignmentByBooth = new Map(assignments.map((assignment) => [Number(assignment.boothId), assignment]));
  const matchedBoothIds = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return new Set();
    const matches = new Set();
    objects.forEach((object) => {
      const booth = object.booth || {};
      const assignment = assignmentByBooth.get(Number(booth.id));
      if (String(booth.boothNumber || '').includes(value) || String(assignment?.companyName || '').toLowerCase().includes(value)) {
        matches.add(Number(booth.id));
      }
    });
    return matches;
  }, [query, objects, assignmentByBooth]);

  return (
    <div className="read-only-map-shell">
      <div className="map-view-controls no-print">
        <input aria-label="Search booth or vendor" placeholder="Search booth or vendor" value={query} onChange={(event) => setQuery(event.target.value)} />
        <button type="button" onClick={() => setZoom((current) => Math.min(2.5, current + 0.15))}>Zoom In</button>
        <button type="button" onClick={() => setZoom((current) => Math.max(0.6, current - 0.15))}>Zoom Out</button>
        <button type="button" onClick={() => setZoom(1)}>Reset</button>
        <button type="button" onClick={() => setZoom(0.8)}>Fit</button>
      </div>
      <div className="floor-map-pan-frame">
        <div className="floor-map-preview-frame vendor-map-frame" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
          {imageUrl ? <img alt="Floor map" src={imageUrl} /> : null}
          <div className="floor-map-booth-layer">
            {objects.map((object) => {
              if (object.objectType === 'label') {
                return (
                  <div className="map-label-preview" key={object.id} style={boxStyle(object)}>
                    {object.metadataJson?.displayText || object.label}
                  </div>
                );
              }
              if (object.objectType === 'arrow') {
                return <div className="map-arrow-preview" key={object.id} style={boxStyle(object)} />;
              }
              if (object.objectType === 'restricted' || object.objectType === 'door') {
                return <div className={`map-area-preview map-area-${object.objectType}`} key={object.id} style={boxStyle(object)}>{object.label}</div>;
              }
              if (object.objectType !== 'booth') return null;
              const booth = object.booth || {};
              const assignment = assignmentByBooth.get(Number(booth.id));
              const isOwn = ownAssignment?.boothId === booth.id;
              const selectable = !readonly && !assignment && booth.status === 'available';
              const canActivate = selectable || isOwn || readonly;
              const matched = matchedBoothIds.has(Number(booth.id));
              const hoverLabel = assignment?.companyName || 'Open';
              const showTooltip = (event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setHoverTooltip({
                  label: hoverLabel,
                  x: event.clientX || rect.left + rect.width / 2,
                  y: (event.clientY || rect.top) - 12
                });
              };
              return (
                <button
                  className={`floor-map-booth-preview vendor-map-booth booth-preview-${assignment ? 'assigned' : booth.status || 'available'} ${isOwn ? 'own-booth' : ''} ${selectedBoothId === booth.id ? 'selected' : ''} ${matched ? 'map-search-match' : ''}`}
                  aria-disabled={!canActivate}
                  data-tooltip={hoverLabel}
                  key={object.id}
                  onClick={() => {
                    if (!canActivate) return;
                    onBoothClick?.({ object, booth, assignment, isOwn, selectable });
                  }}
                  onBlur={() => setHoverTooltip(null)}
                  onFocus={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    setHoverTooltip({ label: hoverLabel, x: rect.left + rect.width / 2, y: rect.top - 12 });
                  }}
                  onMouseEnter={showTooltip}
                  onMouseLeave={() => setHoverTooltip(null)}
                  onMouseMove={showTooltip}
                  style={boxStyle(object)}
                  type="button"
                >
                  {assignment?.logoUrl ? <img alt="" src={uploadedAssetUrl(assignment.logoUrl)} onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : null}
                  {assignment && !assignment.logoUrl ? <span className="booth-logo-fallback">{(assignment.companyName || 'V').charAt(0)}</span> : null}
                  {!assignment?.logoUrl ? <span>{booth.boothNumber}</span> : null}
                  {isOwn ? <strong>Your Booth</strong> : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {hoverTooltip ? (
        <div className="map-hover-tooltip" style={{ left: hoverTooltip.x, top: hoverTooltip.y }}>
          {hoverTooltip.label}
        </div>
      ) : null}
    </div>
  );
}

function boxStyle(object) {
  return {
    height: `${object.heightPercent}%`,
    left: `${object.xPercent}%`,
    top: `${object.yPercent}%`,
    transform: `rotate(${object.rotation || 0}deg)`,
    width: `${object.widthPercent}%`
  };
}
