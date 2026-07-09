import { pool } from '../config/db.js';
import { qaChecklistItems } from '../services/qaChecklistService.js';
import { releaseNotes } from '../services/releaseNotesService.js';
import { adminHelp, vendorHelp } from '../services/helpContentService.js';
import { getMigrationStatus, runSetupChecks } from '../services/setupCheckService.js';
import { listVendorReadiness } from './readinessModel.js';

export async function getQaChecklist() {
  const [rows] = await pool.query('SELECT item_key, status, notes, checked_by_user_id, checked_at, updated_at FROM qa_checklist_results');
  const resultByKey = new Map(rows.map((row) => [row.item_key, row]));
  return qaChecklistItems.map((item) => {
    const result = resultByKey.get(item.key);
    return {
      ...item,
      status: result?.status || 'not_checked',
      notes: result?.notes || '',
      checkedByUserId: result?.checked_by_user_id || null,
      checkedAt: result?.checked_at || null,
      updatedAt: result?.updated_at || null
    };
  });
}

export async function updateQaItem(itemKey, input, userId) {
  const status = ['not_checked', 'passed', 'failed', 'needs_review'].includes(input.status) ? input.status : 'not_checked';
  const notes = input.notes || '';
  await pool.execute(
    `INSERT INTO qa_checklist_results (item_key, status, notes, checked_by_user_id, checked_at)
     VALUES (?, ?, ?, ?, CASE WHEN ? = 'not_checked' THEN NULL ELSE NOW() END)
     ON DUPLICATE KEY UPDATE status = VALUES(status), notes = VALUES(notes),
       checked_by_user_id = VALUES(checked_by_user_id), checked_at = VALUES(checked_at)`,
    [itemKey, status, notes, status === 'not_checked' ? null : userId, status]
  );
  return getQaChecklist();
}

export async function resetQaChecklist() {
  await pool.query('DELETE FROM qa_checklist_results');
  return getQaChecklist();
}

export async function globalAdminSearch(query) {
  const search = `%${query}%`;
  if (!query || query.trim().length < 2) return [];
  const [shows] = await pool.execute(
    `SELECT 'Show' AS type, id, name AS title, venue_name AS context, CONCAT('/admin/shows/', id) AS url
     FROM shows WHERE name LIKE ? OR venue_name LIKE ? LIMIT 8`,
    [search, search]
  );
  const [vendors] = await pool.execute(
    `SELECT 'Vendor' AS type, vp.id, COALESCE(vp.company_name, u.email) AS title, vp.tier AS context,
       CONCAT('/admin/vendors/', vp.id) AS url
     FROM vendor_profiles vp JOIN users u ON u.id = vp.user_id
     WHERE vp.company_name LIKE ? OR vp.contact_name LIKE ? OR u.email LIKE ? LIMIT 8`,
    [search, search, search]
  );
  const [booths] = await pool.execute(
    `SELECT 'Booth' AS type, b.id, CONCAT('Booth ', b.booth_number) AS title, s.name AS context,
       CONCAT('/admin/shows/', b.show_id, '/booths') AS url
     FROM booths b JOIN shows s ON s.id = b.show_id
     WHERE CAST(b.booth_number AS CHAR) LIKE ? OR b.booth_name LIKE ? LIMIT 8`,
    [search, search]
  );
  const [assignments] = await pool.execute(
    `SELECT 'Assignment' AS type, ba.id,
       CONCAT(COALESCE(vp.company_name, 'Vendor'), ' assigned to Booth ', b.booth_number) AS title,
       s.name AS context, CONCAT('/admin/shows/', ba.show_id, '/assignments') AS url
     FROM booth_assignments ba
     JOIN booths b ON b.id = ba.booth_id
     JOIN vendor_profiles vp ON vp.id = ba.vendor_profile_id
     JOIN shows s ON s.id = ba.show_id
     WHERE ba.status = 'active' AND (vp.company_name LIKE ? OR CAST(b.booth_number AS CHAR) LIKE ? OR s.name LIKE ?)
     LIMIT 8`,
    [search, search, search]
  );
  return [...shows, ...vendors, ...booths, ...assignments].map((row) => ({
    type: row.type,
    id: row.id,
    title: row.title,
    context: row.context,
    url: row.url
  }));
}

export async function notificationSummary() {
  const notices = [];
  const [draftShows] = await pool.query("SELECT id, name FROM shows WHERE status = 'draft' LIMIT 10");
  draftShows.forEach((show) => notices.push({ type: 'readiness', severity: 'review', title: `${show.name} is still a draft`, url: `/admin/shows/${show.id}/readiness` }));

  const [incompleteVendors] = await pool.query('SELECT id, company_name FROM vendor_profiles WHERE is_profile_complete = FALSE LIMIT 10');
  incompleteVendors.forEach((vendor) => notices.push({ type: 'vendor', severity: 'review', title: `${vendor.company_name || 'Vendor'} has an incomplete profile`, url: `/admin/vendors/${vendor.id}` }));

  const [publicLinks] = await pool.query(`SELECT s.id, s.name FROM show_public_settings sps JOIN shows s ON s.id = sps.show_id WHERE sps.public_share_token IS NOT NULL AND (sps.public_map_enabled OR sps.public_directory_enabled) LIMIT 10`);
  publicLinks.forEach((show) => notices.push({ type: 'public', severity: 'info', title: `${show.name} has public links enabled`, url: `/admin/shows/${show.id}/readiness` }));

  const [publishedShows] = await pool.query("SELECT id, name FROM shows WHERE status = 'published' LIMIT 20");
  for (const show of publishedShows) {
    const vendors = await listVendorReadiness(show.id);
    const withoutBooths = vendors.filter((item) => item.vendor.isActive && !item.excluded && !item.assignment);
    if (withoutBooths.length) notices.push({ type: 'assignment', severity: 'review', title: `${show.name} has ${withoutBooths.length} vendor(s) without booths`, url: `/admin/shows/${show.id}/assignments` });
  }

  const setup = await runSetupChecks();
  setup.checks.filter((item) => item.status === 'fail').slice(0, 5).forEach((item) => notices.push({ type: 'setup', severity: 'warning', title: item.name, context: item.message, url: '/admin/qa-checklist' }));

  return { count: notices.length, notices };
}

export async function systemStatus() {
  return runSetupChecks();
}

export async function migrations() {
  return getMigrationStatus();
}

export function getReleaseNotes() {
  return releaseNotes;
}

export function getVendorHelp() {
  return vendorHelp.map(([title, body]) => ({ title, body }));
}

export function getAdminHelp() {
  return adminHelp.map(([title, body]) => ({ title, body }));
}
