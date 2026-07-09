export const showStatuses = ['draft', 'published', 'closed', 'archived'];
export const tiers = ['platinum', 'gold', 'silver', 'bronze'];

const tierLabels = {
  platinum: 'Platinum',
  gold: 'Gold',
  silver: 'Silver',
  bronze: 'Bronze'
};

export function normalizeShowInput(input) {
  return {
    name: normalizeString(input.name),
    venueName: normalizeString(input.venueName),
    venueAddress: normalizeOptionalString(input.venueAddress),
    startDate: normalizeDate(input.startDate),
    endDate: normalizeDate(input.endDate),
    vendorSelectionDeadline: normalizeDateTime(input.vendorSelectionDeadline),
    timezone: normalizeString(input.timezone),
    status: input.status || 'draft',
    selectionPaused: Boolean(input.selectionPaused)
  };
}

export function normalizeTierWindowsInput(input = {}) {
  return tiers.reduce((windows, tier) => {
    windows[tier] = normalizeDateTime(input[tier]);
    return windows;
  }, {});
}

export function validateShowPayload(show, windows = {}, options = {}) {
  const errors = {};
  const missingSetupItems = [];

  if (show.status && !showStatuses.includes(show.status)) {
    addError(errors, 'status', 'Status must be draft, published, closed, or archived.');
  }

  if (show.status === 'published' || options.requirePublishReady) {
    if (!show.name) addError(errors, 'name', 'Show name is required before publishing.');
    if (!show.venueName) addError(errors, 'venueName', 'Venue name is required before publishing.');
    if (!show.startDate) addError(errors, 'startDate', 'Start date is required before publishing.');
    if (!show.endDate) addError(errors, 'endDate', 'End date is required before publishing.');
    if (!show.timezone) addError(errors, 'timezone', 'Timezone is required before publishing.');
  }

  if (!show.name) missingSetupItems.push('Show name');
  if (!show.venueName) missingSetupItems.push('Venue name');
  if (!show.startDate) missingSetupItems.push('Start date');
  if (!show.endDate) missingSetupItems.push('End date');
  if (!show.timezone) missingSetupItems.push('Timezone');

  validateDateOrder(show, errors);
  validateTierWindows(windows, show.vendorSelectionDeadline, errors, missingSetupItems, {
    requireAll: show.status === 'published' || options.requirePublishReady
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    missingSetupItems
  };
}

export function getMissingTierWindows(windows = {}) {
  return tiers.filter((tier) => !windows[tier]).map((tier) => `${tierLabels[tier]} tier opening time`);
}

function validateDateOrder(show, errors) {
  if (show.startDate && show.endDate && show.endDate < show.startDate) {
    addError(errors, 'endDate', 'End date cannot be before start date.');
  }

  if (
    show.vendorSelectionDeadline &&
    show.startDate &&
    show.vendorSelectionDeadline.slice(0, 10) > show.startDate
  ) {
    addError(errors, 'vendorSelectionDeadline', 'Vendor selection deadline cannot be after the show starts.');
  }
}

function validateTierWindows(windows, deadline, errors, missingSetupItems, options) {
  const missingTiers = getMissingTierWindows(windows);
  missingSetupItems.push(...missingTiers);

  if (options.requireAll && missingTiers.length > 0) {
    addError(errors, 'tierWindows', 'All four tier opening times are required before publishing.');
  }

  tiers.forEach((tier) => {
    if (deadline && windows[tier] && windows[tier] > deadline) {
      addError(
        errors,
        tier,
        `${tierLabels[tier]} opening time cannot be after the vendor selection deadline.`
      );
    }
  });

  for (let index = 1; index < tiers.length; index += 1) {
    const previousTier = tiers[index - 1];
    const tier = tiers[index];

    if (windows[previousTier] && windows[tier] && windows[tier] <= windows[previousTier]) {
      addError(
        errors,
        tier,
        `${tierLabels[tier]} must open after ${tierLabels[previousTier]}.`
      );
    }
  }
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptionalString(value) {
  const trimmed = normalizeString(value);
  return trimmed || null;
}

function normalizeDate(value) {
  if (!value) return null;
  return String(value).slice(0, 10);
}

function normalizeDateTime(value) {
  if (!value) return null;
  return String(value).trim().replace('T', ' ').slice(0, 19);
}

function addError(errors, field, message) {
  if (!errors[field]) errors[field] = [];
  errors[field].push(message);
}
