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

export function selectionStatusLabel(status) {
  const code = typeof status === 'string' ? status : status?.code;
  return selectionStatusLabels[code] || status?.label || code || 'Unknown';
}

export function selectionStatusClass(status) {
  const code = typeof status === 'string' ? status : status?.code;
  return `selection-status selection-status-${code || 'unknown'}`;
}
