export const boothStatuses = ['available', 'reserved', 'unavailable', 'assigned'];
export const boothTypes = ['standard', 'premium', 'corner', 'double', 'custom'];

export function normalizeBoothInput(input = {}) {
  return {
    boothName: normalizeOptionalString(input.boothName ?? input.booth_name),
    boothType: input.boothType ?? input.booth_type ?? 'standard',
    status: input.status ?? 'available',
    widthLabel: normalizeOptionalString(input.widthLabel ?? input.width_label),
    depthLabel: normalizeOptionalString(input.depthLabel ?? input.depth_label),
    price: normalizePrice(input.price),
    notes: normalizeOptionalString(input.notes),
    isFeatured: Boolean(input.isFeatured ?? input.is_featured)
  };
}

export function validateBoothDetails(booth) {
  const errors = {};

  if (!boothTypes.includes(booth.boothType)) {
    addError(errors, 'boothType', 'Booth type is not supported.');
  }

  if (!boothStatuses.includes(booth.status)) {
    addError(errors, 'status', 'Booth status is not supported.');
  }

  if (booth.price !== null && (!Number.isFinite(booth.price) || booth.price < 0)) {
    addError(errors, 'price', 'Price cannot be negative.');
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

function normalizeOptionalString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizePrice(value) {
  if (value === '' || value === null || value === undefined) return null;
  const price = Number(value);
  return Number.isFinite(price) ? price : Number.NaN;
}

function addError(errors, field, message) {
  if (!errors[field]) errors[field] = [];
  errors[field].push(message);
}
