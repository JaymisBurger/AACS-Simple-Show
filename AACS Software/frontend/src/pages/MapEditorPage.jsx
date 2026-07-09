import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Arrow, Group, Image as KonvaImage, Layer, Rect, Stage, Text, Transformer } from 'react-konva';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import {
  bulkSaveMapObjectsRequest,
  createMapObjectRequest,
  getFloorMapImageBlobUrlRequest,
  listMapObjectsRequest
} from '../services/mapService.js';
import { duplicateBoothRequest } from '../services/boothService.js';
import './FloorMap.css';

const objectTypes = ['booth', 'label', 'arrow'];
const defaultObject = {
  booth: { label: 'Booth', widthPercent: 10, heightPercent: 8, metadataJson: {}, booth: defaultBoothDetails() },
  door: { label: 'Door', widthPercent: 8, heightPercent: 5, metadataJson: { doorType: 'entrance' } },
  label: { label: 'Label', widthPercent: 16, heightPercent: 6, metadataJson: { displayText: 'Label', fontSize: 18 } },
  arrow: { label: 'Arrow', widthPercent: 14, heightPercent: 4, metadataJson: { directionLabel: '', arrowThickness: 4 } },
  restricted_area: { label: 'Restricted', widthPercent: 14, heightPercent: 10, metadataJson: { areaName: '', reason: '' } }
};

export function MapEditorPage() {
  const { showId } = useParams();
  const [searchParams] = useSearchParams();
  const [show, setShow] = useState(null);
  const [map, setMap] = useState(null);
  const [objects, setObjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [image, setImage] = useState(null);
  const [status, setStatus] = useState('loading');
  const [saveStatus, setSaveStatus] = useState('Saved');
  const [error, setError] = useState('');
  const [containerWidth, setContainerWidth] = useState(900);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [propertiesOverlayOpen, setPropertiesOverlayOpen] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [editingLabel, setEditingLabel] = useState(null);
  const containerRef = useRef(null);
  const transformerRef = useRef(null);
  const shapeRefs = useRef(new Map());
  const saveTimer = useRef(null);
  const objectsRef = useRef([]);
  const undoStackRef = useRef([]);
  const editVersionRef = useRef(0);
  const interactionSnapshotRef = useRef(null);
  const hasUnsavedChanges = saveStatus === 'Unsaved changes';

  const selectedObject = objects.find((object) => object.localId === selectedId || object.id === selectedId);
  const editingLabelObject = editingLabel
    ? objects.find((object) => objectKey(object) === editingLabel.id && object.objectType === 'label')
    : null;
  const stageSize = useMemo(() => {
    if (!map) return { width: 900, height: 600 };
    const width = Math.min(containerWidth, 1100);
    return { width, height: width * (map.imageHeight / map.imageWidth) };
  }, [containerWidth, map]);

  useEffect(() => {
    loadEditor();
  }, [showId]);

  useEffect(() => {
    objectsRef.current = objects;
  }, [objects]);

  useEffect(() => {
    function updateWidth() {
      if (containerRef.current) setContainerWidth(containerRef.current.clientWidth);
    }
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    if (!map) return;
    let objectUrl = '';
    const nextImage = new window.Image();
    nextImage.onload = () => setImage(nextImage);
    getFloorMapImageBlobUrlRequest(showId)
      .then((url) => {
        objectUrl = url;
        nextImage.src = url;
      })
      .catch(() => setError('Unable to load the floor-map image.'));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [map, showId]);

  useEffect(() => {
    const node = selectedId ? shapeRefs.current.get(selectedId) : null;
    if (transformerRef.current) {
      transformerRef.current.nodes(node ? [node] : []);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, objects]);

  useEffect(() => {
    function warnBeforeLeave(event) {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', warnBeforeLeave);
    return () => window.removeEventListener('beforeunload', warnBeforeLeave);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    function handleDeleteKey(event) {
      if (isTypingTarget(event.target)) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        undoLastChange();
        return;
      }

      if (!selectedId) return;
      if (event.key !== 'Delete' && event.key !== 'Backspace') return;

      event.preventDefault();
      deleteSelected();
    }

    window.addEventListener('keydown', handleDeleteKey);
    return () => window.removeEventListener('keydown', handleDeleteKey);
  }, [selectedId, selectedObject]);

  async function loadEditor() {
    setStatus('loading');
    setError('');
    try {
      const data = await listMapObjectsRequest(showId);
      setShow(data.show);
      setMap(data.map);
      const nextObjects = data.objects.map(fromApiObject);
      replaceObjects(nextObjects);
      const focusBoothId = Number(searchParams.get('boothId'));
      if (focusBoothId) {
        const focusedObject = nextObjects.find((object) => object.booth?.id === focusBoothId);
        if (focusedObject) setSelectedId(objectKey(focusedObject));
      }
      setStatus('ready');
      setSaveStatus('Saved');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load map editor.');
      setStatus('error');
    }
  }

  async function addObject(objectType) {
    const defaults = defaultObject[objectType];
    const object = {
      objectType,
      label: defaults.label,
      xPercent: 8,
      yPercent: 8,
      widthPercent: defaults.widthPercent,
      heightPercent: defaults.heightPercent,
      rotation: 0,
      zIndex: objectsRef.current.length,
      isLocked: false,
      metadataJson: defaults.metadataJson,
      booth: objectType === 'booth' ? { ...defaults.booth } : null
    };

    setSaveStatus('Saving...');
    setError('');

    try {
      pushUndoSnapshot();
      const data = await createMapObjectRequest(showId, object);
      const persistedObject = fromApiObject(data.object);
      replaceObjects([...objectsRef.current, persistedObject], { markEdit: true });
      setSelectedId(objectKey(persistedObject));
      setSaveStatus('Saved');
    } catch (requestError) {
      setSaveStatus('Save failed');
      setError(requestError.response?.data?.message || 'Unable to create map object.');
    }
  }

  function updateObject(identifier, updates) {
    if (!interactionSnapshotRef.current) {
      pushUndoSnapshot();
    }

    replaceObjects(
      objectsRef.current.map((object) =>
        objectKey(object) === identifier ? clampObject({ ...object, ...updates }) : object
      ),
      { markEdit: true }
    );
    markUnsaved();
  }

  function deleteSelected() {
    if (!selectedObject) return;
    if (editingLabel) return;
    pushUndoSnapshot();
    replaceObjects(
      objectsRef.current.filter((object) => objectKey(object) !== objectKey(selectedObject)),
      { markEdit: true }
    );
    setSelectedId(null);
    markUnsaved();
  }

  function beginLabelEdit(object) {
    setSelectedId(objectKey(object));
    setEditingLabel({
      id: objectKey(object),
      value: object.metadataJson?.displayText || object.label || ''
    });
  }

  function commitLabelEdit() {
    if (!editingLabel || !editingLabelObject) {
      setEditingLabel(null);
      return;
    }

    const nextText = editingLabel.value.trim() || 'Label';
    updateObject(objectKey(editingLabelObject), {
      label: nextText,
      metadataJson: {
        ...(editingLabelObject.metadataJson || {}),
        displayText: nextText
      }
    });
    setEditingLabel(null);
  }

  function cancelLabelEdit() {
    setEditingLabel(null);
  }

  async function duplicateSelected() {
    if (!selectedObject) return;

    if (selectedObject.objectType === 'booth' && selectedObject.booth?.id) {
      setSaveStatus('Saving...');
      setError('');

      try {
        pushUndoSnapshot();
        const data = await duplicateBoothRequest(showId, selectedObject.booth.id);
        const persistedObject = fromApiObject(data.object);
        replaceObjects([...objectsRef.current, persistedObject], { markEdit: true });
        setSelectedId(objectKey(persistedObject));
        setSaveStatus('Saved');
      } catch (requestError) {
        setSaveStatus('Save failed');
        setError(requestError.response?.data?.message || 'Unable to duplicate booth.');
      }
      return;
    }

    const copy = {
      ...selectedObject,
      id: undefined,
      localId: `local-${crypto.randomUUID()}`,
      label: selectedObject.label ? `${selectedObject.label} Copy` : null,
      xPercent: Math.min(selectedObject.xPercent + 2, 100 - selectedObject.widthPercent),
      yPercent: Math.min(selectedObject.yPercent + 2, 100 - selectedObject.heightPercent),
      zIndex: objectsRef.current.length,
      metadataJson: selectedObject.metadataJson
    };

    setSaveStatus('Saving...');
    setError('');

    try {
      pushUndoSnapshot();
      const data = await createMapObjectRequest(showId, toApiObject(copy));
      const persistedObject = fromApiObject(data.object);
      replaceObjects([...objectsRef.current, persistedObject], { markEdit: true });
      setSelectedId(objectKey(persistedObject));
      setSaveStatus('Saved');
    } catch (requestError) {
      setSaveStatus('Save failed');
      setError(requestError.response?.data?.message || 'Unable to duplicate map object.');
    }
  }

  function moveLayer(direction) {
    if (!selectedObject) return;
    pushUndoSnapshot();
    const key = objectKey(selectedObject);
    const sorted = [...objects].sort((a, b) => a.zIndex - b.zIndex);
    const index = sorted.findIndex((object) => objectKey(object) === key);
    const nextIndex = direction === 'forward' ? Math.min(index + 1, sorted.length - 1) : Math.max(index - 1, 0);
    const swapped = [...sorted];
    [swapped[index], swapped[nextIndex]] = [swapped[nextIndex], swapped[index]];
    replaceObjects(swapped.map((object, zIndex) => ({ ...object, zIndex })), { markEdit: true });
    markUnsaved();
  }

  function replaceObjects(nextObjects, options = {}) {
    objectsRef.current = nextObjects;
    if (options.markEdit) editVersionRef.current += 1;
    setObjects(nextObjects);
  }

  function markUnsaved() {
    interactionSnapshotRef.current = null;
    setSaveStatus('Unsaved changes');
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveObjects('Autosaved');
    }, 1200);
  }

  function beginObjectInteraction() {
    interactionSnapshotRef.current = cloneObjects(objectsRef.current);
    pushUndoSnapshot(interactionSnapshotRef.current);
    editVersionRef.current += 1;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaveStatus('Unsaved changes');
  }

  function pushUndoSnapshot(snapshot = objectsRef.current) {
    const clonedSnapshot = cloneObjects(snapshot);
    const lastSnapshot = undoStackRef.current[undoStackRef.current.length - 1];

    if (lastSnapshot && JSON.stringify(lastSnapshot) === JSON.stringify(clonedSnapshot)) {
      return;
    }

    undoStackRef.current = [...undoStackRef.current.slice(-49), clonedSnapshot];
  }

  function undoLastChange() {
    const previousObjects = undoStackRef.current.pop();
    if (!previousObjects) return;

    interactionSnapshotRef.current = null;
    replaceObjects(cloneObjects(previousObjects), { markEdit: true });
    setSelectedId(null);
    markUnsaved();
  }

  async function saveObjects(successText = 'Saved') {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    setSaveStatus('Saving...');
    const saveVersion = editVersionRef.current;
    const payload = objectsRef.current.map(toApiObject);
    try {
      const data = await bulkSaveMapObjectsRequest(showId, payload);

      if (editVersionRef.current === saveVersion) {
        replaceObjects(data.objects.map(fromApiObject));
        setSaveStatus(successText);
      }
    } catch (requestError) {
      setSaveStatus('Save failed');
      setError(requestError.response?.data?.message || 'Unable to save map objects.');
    }
  }

  return (
    <AdminLayout>
      <section className="editor-page">
        <header className="editor-topbar">
          <div>
            <p className="app-kicker">Map Editor</p>
            <h2>{show?.name || 'Floor Map Editor'}</h2>
          </div>
          <div className="page-actions">
            <button
              aria-label={propertiesOpen ? 'Hide properties panel' : 'Show properties panel'}
              className={`properties-toggle ${propertiesOpen ? 'active' : ''}`}
              onClick={() => setPropertiesOpen((current) => !current)}
              title={propertiesOpen ? 'Hide properties' : 'Show properties'}
              type="button"
            />
            <span className={`save-status ${saveStatus.toLowerCase().replaceAll(' ', '-')}`}>{saveStatus}</span>
            <button className="button primary" onClick={() => saveObjects('Saved')} type="button">
              Manual Save
            </button>
            <Link className="button secondary link-button" to={`/admin/shows/${showId}/floor-map`}>
              Floor Map
            </Link>
            <Link className="button secondary link-button" to={`/admin/shows/${showId}/booths`}>
              Booths
            </Link>
          </div>
        </header>

        {status === 'loading' ? <p className="muted">Loading editor...</p> : null}
        {error ? <div className="form-error">{error}</div> : null}

        {status === 'ready' ? (
          <div className={`editor-layout ${propertiesOpen ? 'properties-visible' : 'properties-hidden'}`}>
            <div className="editor-workspace">
              <div className="object-toolbar" aria-label="Map object tools">
                <button type="button" onClick={() => addObject('booth')}>Booth</button>
                <button type="button" onClick={() => addObject('label')}>Label</button>
                <button type="button" onClick={() => addObject('arrow')}>Traffic Arrow</button>
                <button
                  className={snapEnabled ? 'active' : ''}
                  type="button"
                  onClick={() => setSnapEnabled((current) => !current)}
                >
                  Snap
                </button>
                <button type="button" disabled={!selectedObject} onClick={duplicateSelected}>Duplicate</button>
                <button type="button" disabled={!selectedObject} onClick={deleteSelected}>Delete</button>
                <button type="button" disabled={!selectedObject} onClick={() => moveLayer('forward')}>Bring Forward</button>
                <button type="button" disabled={!selectedObject} onClick={() => moveLayer('backward')}>Send Backward</button>
              </div>

              <div className="canvas-panel" ref={containerRef}>
                <div className="konva-stage-wrap" style={{ height: stageSize.height, width: stageSize.width }}>
                  <Stage
                    height={stageSize.height}
                    onMouseDown={(event) => {
                      if (event.target === event.target.getStage()) setSelectedId(null);
                    }}
                    width={stageSize.width}
                  >
                    <Layer>
                      {image ? (
                        <KonvaImage image={image} listening={false} width={stageSize.width} height={stageSize.height} />
                      ) : null}
                      {objects
                        .slice()
                        .sort((a, b) => a.zIndex - b.zIndex)
                        .map((object) => (
                          <MapShape
                            key={objectKey(object)}
                            object={object}
                            selected={objectKey(object) === selectedId}
                            setNode={(node) => {
                              if (node) shapeRefs.current.set(objectKey(object), node);
                            }}
                            stageSize={stageSize}
                            onBeginChange={beginObjectInteraction}
                            onChange={(updates) => updateObject(objectKey(object), updates)}
                            onSelect={() => setSelectedId(objectKey(object))}
                            onSnap={(box) =>
                              snapEnabled ? snapBoxToObjects(objectKey(object), box, stageSize, objectsRef.current) : box
                            }
                            onEditLabel={() => beginLabelEdit(object)}
                            onOpenProperties={() => {
                              setSelectedId(objectKey(object));
                              setPropertiesOverlayOpen(true);
                            }}
                          />
                        ))}
                      <Transformer
                        ref={transformerRef}
                        boundBoxFunc={(oldBox, newBox) => {
                          if (newBox.width < 8 || newBox.height < 8) return oldBox;
                          return newBox;
                        }}
                        rotateEnabled
                      />
                    </Layer>
                  </Stage>
                  {editingLabel && editingLabelObject ? (
                    <InlineLabelEditor
                      object={editingLabelObject}
                      stageSize={stageSize}
                      value={editingLabel.value}
                      onCancel={cancelLabelEdit}
                      onChange={(value) => setEditingLabel((current) => current ? { ...current, value } : current)}
                      onCommit={commitLabelEdit}
                    />
                  ) : null}
                </div>
              </div>
            </div>

            {propertiesOpen ? (
              <PropertiesPanel
                object={selectedObject}
                onClose={() => setPropertiesOpen(false)}
                onChange={(updates) => selectedObject && updateObject(objectKey(selectedObject), updates)}
              />
            ) : null}
          </div>
        ) : null}
        {propertiesOverlayOpen && selectedObject?.objectType === 'booth' ? (
          <div className="properties-overlay" role="dialog" aria-modal="true" aria-label="Booth properties">
            <button
              aria-label="Close booth properties"
              className="properties-overlay-backdrop"
              onClick={() => setPropertiesOverlayOpen(false)}
              type="button"
            />
            <div className="properties-overlay-panel">
              <PropertiesPanel
                object={selectedObject}
                onClose={() => setPropertiesOverlayOpen(false)}
                onChange={(updates) => selectedObject && updateObject(objectKey(selectedObject), updates)}
              />
            </div>
          </div>
        ) : null}
      </section>
    </AdminLayout>
  );
}

function MapShape({ object, selected, setNode, stageSize, onBeginChange, onChange, onSelect, onEditLabel, onOpenProperties, onSnap }) {
  const props = percentToPixels(object, stageSize);
  const commonProps = {
    ...props,
    draggable: !object.isLocked,
    onClick: onSelect,
    onTap: onSelect,
    onDblClick: object.objectType === 'booth' ? onOpenProperties : object.objectType === 'label' ? onEditLabel : undefined,
    onDblTap: object.objectType === 'booth' ? onOpenProperties : object.objectType === 'label' ? onEditLabel : undefined,
    onDragStart: onBeginChange,
    onDragMove: (event) => {
      const snapped = onSnap({
        x: event.target.x(),
        y: event.target.y(),
        width: props.width,
        height: props.height
      });
      event.target.position({ x: snapped.x, y: snapped.y });
    },
    onDragEnd: (event) => {
      onChange(pixelsToPercent({ ...props, x: event.target.x(), y: event.target.y() }, stageSize));
    },
    onTransformStart: onBeginChange,
    onTransformEnd: (event) => {
      const node = event.target;
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      node.scaleX(1);
      node.scaleY(1);
      onChange(
        pixelsToPercent(
          {
            x: node.x(),
            y: node.y(),
            width: Math.max(8, node.width() * scaleX),
            height: Math.max(8, node.height() * scaleY),
            rotation: node.rotation()
          },
          stageSize
        )
      );
    },
    ref: setNode,
    stroke: selected ? '#0e5f49' : '#182332',
    strokeWidth: selected ? 3 : 1
  };

  if (object.objectType === 'label') {
    return (
      <Text
        {...commonProps}
        fill="#182332"
        fontSize={Number(object.metadataJson?.fontSize || 18)}
        text={object.metadataJson?.displayText || object.label || 'Label'}
      />
    );
  }

  if (object.objectType === 'arrow') {
    return (
      <Arrow
        {...commonProps}
        fill="#177a60"
        pointerLength={12}
        pointerWidth={12}
        points={[0, props.height / 2, props.width, props.height / 2]}
        stroke="#177a60"
        strokeWidth={Number(object.metadataJson?.arrowThickness || 4)}
      />
    );
  }

  const fillByType = {
    booth: 'rgba(23, 122, 96, 0.28)',
    door: 'rgba(38, 79, 150, 0.28)',
    restricted_area: 'rgba(180, 35, 24, 0.25)'
  };

  if (object.objectType === 'booth') {
    const boothNumber = object.booth?.boothNumber || object.metadataJson?.boothNumber || object.label || '';
    const boothStyle = boothStatusStyle(object.booth?.status);

    return (
      <Group
        draggable={!object.isLocked}
        onClick={onSelect}
        onDblClick={onOpenProperties}
        onDblTap={onOpenProperties}
        onDragEnd={(event) => {
          onChange(pixelsToPercent({ ...props, x: event.target.x(), y: event.target.y() }, stageSize));
        }}
        onDragStart={onBeginChange}
        onDragMove={(event) => {
          const snapped = onSnap({
            x: event.target.x(),
            y: event.target.y(),
            width: props.width,
            height: props.height
          });
          event.target.position({ x: snapped.x, y: snapped.y });
        }}
        onTap={onSelect}
        onTransformEnd={(event) => {
          const node = event.target;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          onChange(
            pixelsToPercent(
              {
                x: node.x(),
                y: node.y(),
                width: Math.max(8, props.width * scaleX),
                height: Math.max(8, props.height * scaleY),
                rotation: node.rotation()
              },
              stageSize
            )
          );
        }}
        onTransformStart={onBeginChange}
        ref={setNode}
        rotation={props.rotation}
        x={props.x}
        y={props.y}
      >
        <Rect
          fill={boothStyle.fill}
          height={props.height}
          stroke={selected ? '#0e5f49' : boothStyle.stroke}
          strokeWidth={selected ? 3 : 1}
          width={props.width}
          x={0}
          y={0}
        />
        {object.booth?.isFeatured ? (
          <Text
            align="center"
            fill="#7a4d00"
            fontSize={Math.max(12, Math.min(props.height * 0.34, 18))}
            fontStyle="bold"
            height={18}
            listening={false}
            text="*"
            verticalAlign="middle"
            width={18}
            x={Math.max(0, props.width - 20)}
            y={2}
          />
        ) : null}
        {boothNumber ? (
          <Text
            align="center"
            fill="#182332"
            fontSize={Math.max(12, Math.min(props.height * 0.42, 24))}
            fontStyle="bold"
            height={props.height}
            listening={false}
            text={boothNumber}
            verticalAlign="middle"
            width={props.width}
            x={0}
            y={0}
          />
        ) : null}
      </Group>
    );
  }

  return <Rect {...commonProps} fill={fillByType[object.objectType] || 'rgba(24, 35, 50, 0.2)'} />;
}

function InlineLabelEditor({ object, onCancel, onChange, onCommit, stageSize, value }) {
  const inputRef = useRef(null);
  const box = percentToPixels(object, stageSize);
  const fontSize = Number(object.metadataJson?.fontSize || 18);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      aria-label="Edit label text"
      className="inline-label-editor"
      onBlur={onCommit}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onCommit();
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          onCancel();
        }
      }}
      ref={inputRef}
      style={{
        fontSize,
        height: box.height,
        left: box.x,
        lineHeight: `${Math.max(fontSize + 4, box.height)}px`,
        top: box.y,
        transform: `rotate(${box.rotation}deg)`,
        width: box.width
      }}
      value={value}
    />
  );
}

function PropertiesPanel({ object, onChange, onClose }) {
  if (!object) {
    return (
      <aside className="properties-panel">
        <div className="panel-heading">
          <h3>Properties</h3>
          <button aria-label="Hide properties panel" className="panel-close" onClick={onClose} title="Hide properties" type="button" />
        </div>
        <p className="muted">Select an object to edit its properties.</p>
      </aside>
    );
  }

  function updateField(event) {
    const { name, type, checked, value } = event.target;
    onChange({ [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value });
  }

  function updateMetadata(name, value) {
    onChange({ metadataJson: { ...object.metadataJson, [name]: value } });
  }

  function updateBooth(name, value) {
    onChange({ booth: { ...defaultBoothDetails(), ...(object.booth || {}), [name]: value } });
  }

  return (
    <aside className="properties-panel">
      <div className="panel-heading">
        <h3>Properties</h3>
        <button aria-label="Hide properties panel" className="panel-close" onClick={onClose} title="Hide properties" type="button" />
      </div>
      <label>Object type<input readOnly value={titleize(object.objectType)} /></label>
      <label>Label<input name="label" onChange={updateField} value={object.label || ''} /></label>
      <div className="property-grid">
        <label>X<input name="xPercent" onChange={updateField} type="number" value={round(object.xPercent)} /></label>
        <label>Y<input name="yPercent" onChange={updateField} type="number" value={round(object.yPercent)} /></label>
        <label>Width<input name="widthPercent" onChange={updateField} type="number" value={round(object.widthPercent)} /></label>
        <label>Height<input name="heightPercent" onChange={updateField} type="number" value={round(object.heightPercent)} /></label>
        <label>Rotation<input name="rotation" onChange={updateField} type="number" value={round(object.rotation)} /></label>
      </div>
      <label className="checkbox-field">
        <input checked={object.isLocked} name="isLocked" onChange={updateField} type="checkbox" />
        Locked
      </label>
      <h4>Metadata</h4>
      <MetadataFields object={object} updateBooth={updateBooth} updateMetadata={updateMetadata} />
    </aside>
  );
}

function MetadataFields({ object, updateBooth, updateMetadata }) {
  if (object.objectType === 'booth') {
    const booth = { ...defaultBoothDetails(), ...(object.booth || {}) };
    return (
      <>
        <label>Booth number<input readOnly value={booth.boothNumber || ''} /></label>
        <label>Booth name<input value={booth.boothName || ''} onChange={(e) => updateBooth('boothName', e.target.value)} /></label>
        <label>Booth type<select value={booth.boothType} onChange={(e) => updateBooth('boothType', e.target.value)}>{boothTypes.map((type) => <option key={type} value={type}>{titleize(type)}</option>)}</select></label>
        <label>Status<select value={booth.status} onChange={(e) => updateBooth('status', e.target.value)}>{boothStatuses.map((status) => <option key={status} value={status}>{titleize(status)}</option>)}</select></label>
        <div className="property-grid">
          <label>Width label<input value={booth.widthLabel || ''} onChange={(e) => updateBooth('widthLabel', e.target.value)} /></label>
          <label>Depth label<input value={booth.depthLabel || ''} onChange={(e) => updateBooth('depthLabel', e.target.value)} /></label>
        </div>
        <label>Price<input min="0" step="0.01" type="number" value={booth.price ?? ''} onChange={(e) => updateBooth('price', e.target.value === '' ? null : Number(e.target.value))} /></label>
        <label className="checkbox-field"><input checked={Boolean(booth.isFeatured)} type="checkbox" onChange={(e) => updateBooth('isFeatured', e.target.checked)} /> Featured booth</label>
        <label>Notes<textarea value={booth.notes || ''} onChange={(e) => updateBooth('notes', e.target.value)} /></label>
      </>
    );
  }
  if (object.objectType === 'door') {
    return <label>Door type<select value={object.metadataJson?.doorType || 'entrance'} onChange={(e) => updateMetadata('doorType', e.target.value)}>{['entrance', 'exit', 'service', 'emergency', 'other'].map((type) => <option key={type} value={type}>{type}</option>)}</select></label>;
  }
  if (object.objectType === 'label') {
    return (
      <>
        <label>Display text<input value={object.metadataJson?.displayText || ''} onChange={(e) => updateMetadata('displayText', e.target.value)} /></label>
        <label>Font size<input type="number" value={object.metadataJson?.fontSize || 18} onChange={(e) => updateMetadata('fontSize', Number(e.target.value))} /></label>
      </>
    );
  }
  if (object.objectType === 'arrow') {
    return (
      <>
        <label>Direction label<input value={object.metadataJson?.directionLabel || ''} onChange={(e) => updateMetadata('directionLabel', e.target.value)} /></label>
        <label>Arrow thickness<input type="number" value={object.metadataJson?.arrowThickness || 4} onChange={(e) => updateMetadata('arrowThickness', Number(e.target.value))} /></label>
      </>
    );
  }
  return (
    <>
      <label>Area name<input value={object.metadataJson?.areaName || ''} onChange={(e) => updateMetadata('areaName', e.target.value)} /></label>
      <label>Reason or note<textarea value={object.metadataJson?.reason || ''} onChange={(e) => updateMetadata('reason', e.target.value)} /></label>
    </>
  );
}

function percentToPixels(object, stageSize) {
  return {
    x: (object.xPercent / 100) * stageSize.width,
    y: (object.yPercent / 100) * stageSize.height,
    width: (object.widthPercent / 100) * stageSize.width,
    height: (object.heightPercent / 100) * stageSize.height,
    rotation: object.rotation || 0
  };
}

function pixelsToPercent(box, stageSize) {
  return {
    xPercent: clamp((box.x / stageSize.width) * 100, 0, 100),
    yPercent: clamp((box.y / stageSize.height) * 100, 0, 100),
    widthPercent: clamp((box.width / stageSize.width) * 100, 0.1, 100),
    heightPercent: clamp((box.height / stageSize.height) * 100, 0.1, 100),
    rotation: normalizeRotation(box.rotation || 0)
  };
}

function clampObject(object) {
  return {
    ...object,
    rotation: normalizeRotation(object.rotation),
    widthPercent: clamp(object.widthPercent, 0.1, 100),
    heightPercent: clamp(object.heightPercent, 0.1, 100),
    xPercent: clamp(object.xPercent, 0, 100 - object.widthPercent),
    yPercent: clamp(object.yPercent, 0, 100 - object.heightPercent)
  };
}

function fromApiObject(object) {
  return {
    ...object,
    localId: object.id,
    booth: object.objectType === 'booth' ? normalizeBooth(object.booth, object.metadataJson) : object.booth
  };
}

function toApiObject(object) {
  return {
    id: typeof object.id === 'number' ? object.id : undefined,
    objectType: object.objectType,
    label: object.label,
    xPercent: object.xPercent,
    yPercent: object.yPercent,
    widthPercent: object.widthPercent,
    heightPercent: object.heightPercent,
    rotation: object.rotation,
    zIndex: object.zIndex,
    isLocked: object.isLocked,
    metadataJson: object.metadataJson || {},
    booth: object.objectType === 'booth' ? normalizeBooth(object.booth, object.metadataJson) : null
  };
}

function objectKey(object) {
  return object.localId || object.id;
}

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max);
}

function normalizeRotation(value) {
  return ((Number(value || 0) % 360) + 360) % 360;
}

function round(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function cloneObjects(objects) {
  return objects.map((object) => ({
    ...object,
    metadataJson: { ...(object.metadataJson || {}) },
    booth: object.booth ? { ...object.booth } : null
  }));
}

function isTypingTarget(target) {
  const tagName = target?.tagName?.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable;
}

function snapBoxToObjects(activeKey, box, stageSize, objects) {
  const threshold = 8;
  let nextX = box.x;
  let nextY = box.y;
  let bestXDistance = threshold + 1;
  let bestYDistance = threshold + 1;
  const movingXAnchors = [
    { type: 'left', value: box.x, offset: 0 },
    { type: 'center', value: box.x + box.width / 2, offset: box.width / 2 },
    { type: 'right', value: box.x + box.width, offset: box.width }
  ];
  const movingYAnchors = [
    { type: 'top', value: box.y, offset: 0 },
    { type: 'middle', value: box.y + box.height / 2, offset: box.height / 2 },
    { type: 'bottom', value: box.y + box.height, offset: box.height }
  ];

  objects
    .filter((object) => objectKey(object) !== activeKey)
    .forEach((object) => {
      const target = percentToPixels(object, stageSize);
      const targetXAnchors = [target.x, target.x + target.width / 2, target.x + target.width];
      const targetYAnchors = [target.y, target.y + target.height / 2, target.y + target.height];

      movingXAnchors.forEach((movingAnchor) => {
        targetXAnchors.forEach((targetValue) => {
          const distance = Math.abs(movingAnchor.value - targetValue);
          if (distance <= threshold && distance < bestXDistance) {
            bestXDistance = distance;
            nextX = targetValue - movingAnchor.offset;
          }
        });
      });

      movingYAnchors.forEach((movingAnchor) => {
        targetYAnchors.forEach((targetValue) => {
          const distance = Math.abs(movingAnchor.value - targetValue);
          if (distance <= threshold && distance < bestYDistance) {
            bestYDistance = distance;
            nextY = targetValue - movingAnchor.offset;
          }
        });
      });
    });

  return {
    x: clamp(nextX, 0, stageSize.width - box.width),
    y: clamp(nextY, 0, stageSize.height - box.height)
  };
}

const boothStatuses = ['available', 'reserved', 'unavailable', 'assigned'];
const boothTypes = ['standard', 'premium', 'corner', 'double', 'custom'];

function defaultBoothDetails() {
  return {
    boothName: '',
    boothType: 'standard',
    status: 'available',
    widthLabel: '',
    depthLabel: '',
    price: null,
    notes: '',
    isFeatured: false
  };
}

function normalizeBooth(booth, metadata = {}) {
  if (!booth && !metadata?.boothNumber) return { ...defaultBoothDetails() };
  return {
    ...defaultBoothDetails(),
    ...(booth || {}),
    boothNumber: booth?.boothNumber || metadata?.boothNumber || '',
    notes: booth?.notes ?? metadata?.boothNotes ?? '',
    status: booth?.status || (metadata?.available === false ? 'unavailable' : 'available')
  };
}

function boothStatusStyle(status = 'available') {
  const styles = {
    available: { fill: 'rgba(23, 122, 96, 0.28)', stroke: '#177a60' },
    reserved: { fill: 'rgba(192, 133, 23, 0.28)', stroke: '#a46400' },
    unavailable: { fill: 'rgba(180, 35, 24, 0.24)', stroke: '#b42318' },
    assigned: { fill: 'rgba(77, 62, 111, 0.28)', stroke: '#4d3e6f' }
  };
  return styles[status] || styles.available;
}

function titleize(value) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
