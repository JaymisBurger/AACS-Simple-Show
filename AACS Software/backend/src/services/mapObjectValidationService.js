import { normalizeBoothInput, validateBoothDetails } from './boothValidationService.js';

export const mapObjectTypes = ['booth', 'door', 'label', 'arrow', 'restricted_area'];

export function normalizeMapObjectInput(input = {}) {
  return {
    id: input.id ? Number(input.id) : undefined,
    objectType: input.objectType || input.object_type || 'booth',
    label: normalizeOptionalString(input.label),
    xPercent: normalizeNumber(input.xPercent ?? input.x_percent, 5),
    yPercent: normalizeNumber(input.yPercent ?? input.y_percent, 5),
    widthPercent: normalizeNumber(input.widthPercent ?? input.width_percent, 10),
    heightPercent: normalizeNumber(input.heightPercent ?? input.height_percent, 8),
    rotation: normalizeRotation(input.rotation),
    zIndex: Number(input.zIndex ?? input.z_index ?? 0),
    isLocked: Boolean(input.isLocked ?? input.is_locked),
    metadataJson: normalizeMetadata(input.metadataJson ?? input.metadata_json),
    booth: input.booth ? normalizeBoothInput(input.booth) : null
  };
}

export function validateMapObject(object) {
  const errors = {};

  if (!mapObjectTypes.includes(object.objectType)) {
    addError(errors, 'objectType', 'Object type is not supported.');
  }

  validateRange(object.xPercent, 'xPercent', errors);
  validateRange(object.yPercent, 'yPercent', errors);
  validateRange(object.widthPercent, 'widthPercent', errors, { minExclusive: 0 });
  validateRange(object.heightPercent, 'heightPercent', errors, { minExclusive: 0 });

  if (object.xPercent + object.widthPercent > 100) {
    addError(errors, 'xPercent', 'Object must remain within the map width.');
  }

  if (object.yPercent + object.heightPercent > 100) {
    addError(errors, 'yPercent', 'Object must remain within the map height.');
  }

  if (!Number.isFinite(object.rotation)) {
    addError(errors, 'rotation', 'Rotation must be a number.');
  }

  if (object.objectType === 'booth' && object.booth) {
    const boothValidation = validateBoothDetails(object.booth);
    if (!boothValidation.isValid) {
      errors.booth = boothValidation.errors;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export function normalizeRotation(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return ((number % 360) + 360) % 360;
}

function validateRange(value, field, errors, options = {}) {
  if (!Number.isFinite(value)) {
    addError(errors, field, 'Value must be a number.');
    return;
  }

  if (options.minExclusive === 0 ? value <= 0 : value < 0) {
    addError(errors, field, options.minExclusive === 0 ? 'Value must be greater than zero.' : 'Value cannot be negative.');
  }

  if (value > 100) {
    addError(errors, field, 'Value cannot exceed 100%.');
  }
}

function normalizeNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeOptionalString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeMetadata(value) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return {};
    }
  }
  return typeof value === 'object' ? value : {};
}

function addError(errors, field, message) {
  if (!errors[field]) errors[field] = [];
  errors[field].push(message);
}
