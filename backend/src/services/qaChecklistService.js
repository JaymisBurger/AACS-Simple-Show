export const qaChecklistItems = [
  ['Authentication', 'auth-login', 'Admin and vendor login', 'Verifies protected areas are gated.', 'Correct role lands on the correct dashboard.'],
  ['Authentication', 'auth-logout', 'Logout clears session', 'Prevents shared-browser access.', 'Logout returns to login and protected routes redirect.'],
  ['Show setup', 'show-create', 'Create and edit a show', 'Shows drive the whole workflow.', 'Required fields save and validation errors are clear.'],
  ['Floor map upload', 'map-upload', 'Upload floor map', 'Map is required for selection.', 'Image uploads and renders on admin/vendor/public pages.'],
  ['Map editor', 'map-editor', 'Place and move booths', 'Booth placement must be reliable.', 'Booths save, reload, and keep numbers centered.'],
  ['Booth management', 'booths-manage', 'Edit booth details/status', 'Staff rely on accurate booth inventory.', 'Changes appear in booth list, map, and exports.'],
  ['Vendor management', 'vendors-manage', 'Create and edit vendors', 'Admins need clean vendor records.', 'Vendor profile, logo, tier, and active status save.'],
  ['Tier selection windows', 'tier-windows', 'Verify tier schedule', 'Selection access depends on tier timing.', 'Platinum, Gold, Silver, Bronze windows display in order.'],
  ['Vendor exclusions', 'vendor-exclusions', 'Exclude and restore show access', 'Access is inclusive by default with exceptions.', 'Excluded vendors cannot access/select that show.'],
  ['Vendor booth selection', 'vendor-selection', 'Vendor selects a booth', 'Core vendor workflow.', 'Open vendor can select once and receives confirmation.'],
  ['Admin booth assignments', 'admin-assignments', 'Assign, move, swap, release booths', 'Staff need correction tools.', 'Assignment source/history and booth statuses update.'],
  ['Public map and directory', 'public-views', 'Public tokened map/directory', 'Event-day sharing must be safe.', 'Public views load by token and expose no private contact fields.'],
  ['Event-day mode', 'event-day', 'Staff event-day check-in', 'Staff need fast lookup.', 'Search, filters, and check-in toggles work.'],
  ['Exports', 'exports', 'Download CSV reports', 'Exports support operations and records.', 'All report buttons download clean CSV headers.'],
  ['Settings and permissions', 'settings-permissions', 'Admin-only tools are protected', 'Operational tools must not leak.', 'Vendor/public users cannot access admin tools.'],
  ['Audit logs', 'audit-logs', 'Review history/audit placeholders', 'Admin actions need traceability.', 'Assignment history and communication history are visible.'],
  ['Mobile and print checks', 'mobile-print', 'Mobile and print layouts', 'Real users use phones and paper.', 'Key vendor/admin/public screens are usable and printable.']
].map(([area, key, taskName, whyItMatters, expectedResult]) => ({ area, key, taskName, whyItMatters, expectedResult }));

export const qaStatuses = ['not_checked', 'passed', 'failed', 'needs_review'];
