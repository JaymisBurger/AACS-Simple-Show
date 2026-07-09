export const releaseNotes = [
  ['0.1', 'Project foundation and login', 'React/Vite frontend, Express API, MySQL schema, JWT auth, roles, seed admin.', '2026-06-18', 'Foundation'],
  ['0.2', 'Show management', 'Admin show creation, editing, publishing rules, tier windows, event details.', '2026-06-18', 'Shows'],
  ['0.3', 'Floor maps and map editor', 'Floor-map upload, object editor, labels, arrows, booth objects.', '2026-06-18', 'Maps'],
  ['0.4', 'Booth management', 'Booth records, statuses, numbering, duplicate/delete, bulk actions.', '2026-06-18', 'Booths'],
  ['0.5', 'Vendor management', 'Vendor accounts, profiles, logos, tiers, invitations, exclusions.', '2026-06-18', 'Vendors'],
  ['0.6', 'Booth selection and assignments', 'Vendor selection, admin assign/move/swap/release, assignment history.', '2026-06-18', 'Assignments'],
  ['0.7', 'Show readiness and communication prep', 'Readiness checks, selection statuses, communication drafts.', '2026-06-18', 'Readiness'],
  ['0.8', 'Public/event-day views and exports', 'Tokened public map/directory, event-day check-in, CSV exports, print views.', '2026-06-18', 'Event Day'],
  ['0.9', 'Settings, permissions, and audit logs', 'Admin-only operational visibility, safer destructive actions, history views.', '2026-06-18', 'Operations']
].map(([version, title, summary, dateAdded, featureArea]) => ({ version, title, summary, dateAdded, featureArea }));
