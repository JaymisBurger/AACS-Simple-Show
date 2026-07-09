export const vendorTiers = ['platinum', 'gold', 'silver', 'bronze'];
export const showVendorStatuses = ['invited', 'active', 'declined', 'removed', 'excluded'];

export function normalizeVendorInput(input = {}) {
  return {
    email: normalizeEmail(input.email),
    temporaryPassword: normalizeOptionalString(input.temporaryPassword),
    creationMode: input.creationMode === 'invitation' ? 'invitation' : 'temporary_password',
    companyName: normalizeOptionalString(input.companyName ?? input.company_name),
    contactName: normalizeOptionalString(input.contactName ?? input.contact_name),
    phone: normalizeOptionalString(input.phone),
    website: normalizeOptionalString(input.website),
    description: normalizeOptionalString(input.description),
    tier: input.tier || 'bronze',
    isActive: Boolean(input.isActive ?? input.is_active ?? true)
  };
}

export function normalizeVendorProfileInput(input = {}) {
  return {
    companyName: normalizeOptionalString(input.companyName ?? input.company_name),
    contactName: normalizeOptionalString(input.contactName ?? input.contact_name),
    phone: normalizeOptionalString(input.phone),
    website: normalizeOptionalString(input.website),
    description: normalizeOptionalString(input.description)
  };
}

export function validateVendorCreate(vendor) {
  const errors = {};
  if (!vendor.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendor.email)) {
    addError(errors, 'email', 'Enter a valid email address.');
  }
  if (vendor.creationMode === 'temporary_password' && (!vendor.temporaryPassword || vendor.temporaryPassword.length < 8)) {
    addError(errors, 'temporaryPassword', 'Temporary password must be at least 8 characters.');
  }
  if (!vendorTiers.includes(vendor.tier)) addError(errors, 'tier', 'Vendor tier is not supported.');
  return { isValid: Object.keys(errors).length === 0, errors };
}

export function validateVendorProfile(profile) {
  const errors = {};
  if (profile.website && !/^https?:\/\//i.test(profile.website)) {
    addError(errors, 'website', 'Website must start with http:// or https://.');
  }
  return { isValid: Object.keys(errors).length === 0, errors };
}

export function profileComplete(profile) {
  return Boolean(profile?.companyName && profile?.contactName && profile?.logoUrl);
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeOptionalString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function addError(errors, field, message) {
  if (!errors[field]) errors[field] = [];
  errors[field].push(message);
}
