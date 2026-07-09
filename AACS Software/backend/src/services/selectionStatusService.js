export const selectionStatusLabels = {
  profile_incomplete: 'Profile incomplete',
  excluded: 'Excluded',
  show_not_published: 'Show not published',
  selection_paused: 'Selection paused',
  tier_not_open: 'Opens soon',
  open: 'Open now',
  already_selected: 'Booth selected',
  deadline_passed: 'Deadline passed',
  show_closed: 'Show closed',
  vendor_inactive: 'Vendor inactive'
};

export function getSelectionStatus({ show, vendor, override = null, assignment = null, now = new Date() }) {
  const effectiveOpensAt = formatDateTime(override?.special_access_opens_at || override?.specialAccessOpensAt || vendor?.tierOpensAt);
  const deadline = show?.vendorSelectionDeadline || show?.vendor_selection_deadline || null;
  const showStatus = show?.status || show?.showStatus;

  let code = 'open';
  if (!vendor?.isActive && !vendor?.is_active) code = 'vendor_inactive';
  else if (override?.status === 'excluded' || vendor?.isExcluded) code = 'excluded';
  else if (!vendor?.isProfileComplete && !vendor?.is_profile_complete) code = 'profile_incomplete';
  else if (['closed', 'archived'].includes(showStatus)) code = 'show_closed';
  else if (showStatus !== 'published') code = 'show_not_published';
  else if (show?.selectionPaused || show?.selection_paused) code = 'selection_paused';
  else if (deadline && now.getTime() > new Date(deadline).getTime()) code = 'deadline_passed';
  else if (assignment) code = 'already_selected';
  else if (!effectiveOpensAt || now.getTime() < new Date(effectiveOpensAt).getTime()) code = 'tier_not_open';

  return {
    code,
    label: selectionStatusLabels[code] || code,
    canSelect: code === 'open',
    nextAction: nextActionForStatus(code),
    effectiveOpensAt
  };
}

function nextActionForStatus(code) {
  const actions = {
    profile_incomplete: 'complete_profile',
    excluded: 'contact_admin',
    show_not_published: 'wait',
    selection_paused: 'wait',
    tier_not_open: 'wait',
    open: 'select_booth',
    already_selected: 'view_booth',
    deadline_passed: 'contact_admin',
    show_closed: 'view_show',
    vendor_inactive: 'contact_admin'
  };
  return actions[code] || 'view_show';
}

export function formatDateTime(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.replace(' ', 'T').slice(0, 16);
  return value.toISOString().slice(0, 16);
}
