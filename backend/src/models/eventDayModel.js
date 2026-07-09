import crypto from 'crypto';
import { pool } from '../config/db.js';
import { listAssignments, listAssignmentHistory } from './assignmentModel.js';
import { listBooths } from './boothModel.js';
import { listMapObjects, findMapByShowId } from './mapModel.js';
import { findShowWithWindows } from './showModel.js';
import { listVendorReadiness } from './readinessModel.js';

export const defaultPublicDisplayOptions = {
  assignedOnly: true,
  showLogos: true,
  showBoothNumbers: true,
  showBoothTypes: true,
  showUnassignedBooths: false,
  showReservedUnavailable: false,
  showMapObjects: true,
  showDescriptions: true,
  showWebsites: true,
  showTierBadges: false
};

export async function getPublicSettings(showId) {
  const [rows] = await pool.execute(
    `SELECT id, show_id, public_map_enabled, public_directory_enabled, public_share_token,
      public_view_expires_at, display_options, created_at, updated_at
     FROM show_public_settings
     WHERE show_id = ?`,
    [showId]
  );
  if (rows[0]) return toPublicSettings(rows[0]);
  await pool.execute('INSERT INTO show_public_settings (show_id, display_options) VALUES (?, ?)', [
    showId,
    JSON.stringify(defaultPublicDisplayOptions)
  ]);
  return getPublicSettings(showId);
}

export async function updatePublicSettings(showId, updates) {
  const current = await getPublicSettings(showId);
  const options = { ...current.displayOptions, ...(updates.displayOptions || {}) };
  await pool.execute(
    `UPDATE show_public_settings
     SET public_map_enabled = ?, public_directory_enabled = ?, public_view_expires_at = ?, display_options = ?
     WHERE show_id = ?`,
    [
      updates.publicMapEnabled ?? current.publicMapEnabled,
      updates.publicDirectoryEnabled ?? current.publicDirectoryEnabled,
      updates.publicViewExpiresAt || null,
      JSON.stringify(options),
      showId
    ]
  );
  return getPublicSettings(showId);
}

export async function regeneratePublicToken(showId) {
  await getPublicSettings(showId);
  const token = crypto.randomBytes(32).toString('hex');
  await pool.execute('UPDATE show_public_settings SET public_share_token = ? WHERE show_id = ?', [token, showId]);
  return getPublicSettings(showId);
}

export async function disablePublicAccess(showId) {
  await getPublicSettings(showId);
  await pool.execute(
    `UPDATE show_public_settings
     SET public_map_enabled = FALSE, public_directory_enabled = FALSE, public_share_token = NULL
     WHERE show_id = ?`,
    [showId]
  );
  return getPublicSettings(showId);
}

export async function findPublicSettingsByToken(token) {
  const [rows] = await pool.execute(
    `SELECT sps.id, sps.show_id, sps.public_map_enabled, sps.public_directory_enabled,
      sps.public_share_token, sps.public_view_expires_at, sps.display_options,
      sps.created_at, sps.updated_at, s.status AS show_status
     FROM show_public_settings sps
     JOIN shows s ON s.id = sps.show_id
     WHERE sps.public_share_token = ?`,
    [token]
  );
  if (!rows[0]) return null;
  const settings = toPublicSettings(rows[0]);
  if (rows[0].show_status === 'archived') return null;
  if (settings.publicViewExpiresAt && Date.now() > new Date(settings.publicViewExpiresAt).getTime()) return null;
  return settings;
}

export async function getPublicShowMap(token) {
  const settings = await findPublicSettingsByToken(token);
  if (!settings || !settings.publicMapEnabled) return null;
  const show = await findShowWithWindows(settings.showId);
  const map = await findMapByShowId(settings.showId);
  const objects = map ? await listMapObjects(settings.showId, map.id) : [];
  const assignments = await listAssignments({ showId: settings.showId, status: 'active' });
  return {
    show: publicShow(show),
    settings,
    map,
    objects: filterPublicObjects(objects, settings.displayOptions),
    assignments: assignments.map(publicAssignment)
  };
}

export async function getPublicVendorDirectory(token) {
  const settings = await findPublicSettingsByToken(token);
  if (!settings || !settings.publicDirectoryEnabled) return null;
  const vendors = await listVendorReadiness(settings.showId);
  const directory = vendors
    .filter((item) => !item.excluded && (!settings.displayOptions.assignedOnly || item.assignment))
    .map((item) => publicDirectoryVendor(item, settings.displayOptions));
  return { settings, show: publicShow(await findShowWithWindows(settings.showId)), vendors: directory };
}

export async function getEventDayData(showId) {
  const [vendors, booths, assignments, checkIns] = await Promise.all([
    listVendorReadiness(showId),
    listBooths(showId).catch(() => []),
    listAssignments({ showId, status: 'active' }),
    listCheckIns(showId)
  ]);
  const checkInByVendor = new Map(checkIns.map((item) => [Number(item.vendorProfileId), item]));
  return {
    vendors: vendors.map((item) => ({
      ...item,
      checkIn: checkInByVendor.get(Number(item.vendor.id)) || { checkedIn: false }
    })),
    booths,
    assignments,
    checkIns
  };
}

export async function updateCheckIn(showId, vendorProfileId, checkedIn, adminUserId) {
  await pool.execute(
    `INSERT INTO vendor_check_ins (show_id, vendor_profile_id, checked_in, checked_in_at, checked_in_by_user_id)
     VALUES (?, ?, ?, CASE WHEN ? THEN NOW() ELSE NULL END, ?)
     ON DUPLICATE KEY UPDATE checked_in = VALUES(checked_in),
       checked_in_at = CASE WHEN VALUES(checked_in) THEN COALESCE(checked_in_at, NOW()) ELSE NULL END,
       checked_in_by_user_id = CASE WHEN VALUES(checked_in) THEN VALUES(checked_in_by_user_id) ELSE NULL END`,
    [showId, vendorProfileId, checkedIn, checkedIn, adminUserId]
  );
  return listCheckIns(showId);
}

export async function listCheckIns(showId) {
  const [rows] = await pool.execute(
    `SELECT vci.id, vci.show_id, vci.vendor_profile_id, vci.checked_in,
      vci.checked_in_at, vci.checked_in_by_user_id, u.email AS checked_in_by_email
     FROM vendor_check_ins vci
     LEFT JOIN users u ON u.id = vci.checked_in_by_user_id
     WHERE vci.show_id = ?`,
    [showId]
  );
  return rows.map((row) => ({
    id: row.id,
    showId: row.show_id,
    vendorProfileId: row.vendor_profile_id,
    checkedIn: Boolean(row.checked_in),
    checkedInAt: row.checked_in_at,
    checkedInByUserId: row.checked_in_by_user_id,
    checkedInByEmail: row.checked_in_by_email
  }));
}

export async function exportRows(showId, type) {
  const show = await findShowWithWindows(showId);
  const eventData = await getEventDayData(showId);
  const history = await listAssignmentHistory(showId);
  const activeAssignments = eventData.assignments;
  const assignmentByVendor = new Map(activeAssignments.map((item) => [Number(item.vendorProfileId), item]));
  const eligible = eventData.vendors.filter((item) => item.vendor.isActive && !item.excluded);

  const rows = {
    vendor_directory: eligible.filter((item) => item.assignment).map((item) => ({
      'Company name': item.vendor.companyName,
      'Booth number': item.assignment?.boothNumber || '',
      Website: item.vendor.website || '',
      Tier: item.vendor.tier,
      Description: item.vendor.description || ''
    })),
    booth_assignments: activeAssignments.map((item) => ({
      'Booth number': item.booth.boothNumber,
      'Booth name': item.booth.boothName || '',
      'Booth type': item.booth.boothType,
      'Booth status': item.booth.status,
      'Vendor company': item.vendor.companyName,
      'Vendor tier': item.vendor.tier,
      'Assignment source': item.assignmentSource,
      'Selected/assigned date': item.confirmedAt || item.selectedAt || ''
    })),
    check_in: eligible.map((item) => ({
      'Company name': item.vendor.companyName,
      'Contact name': item.vendor.contactName,
      Phone: item.vendor.phone || '',
      'Booth number': item.assignment?.boothNumber || '',
      Tier: item.vendor.tier,
      'Checked in': item.checkIn?.checkedIn ? 'Yes' : 'No',
      'Checked in at': item.checkIn?.checkedInAt || ''
    })),
    vendors_without_booths: eligible.filter((item) => !assignmentByVendor.has(Number(item.vendor.id))).map((item) => ({
      'Company name': item.vendor.companyName,
      'Contact name': item.vendor.contactName,
      Phone: item.vendor.phone || '',
      Tier: item.vendor.tier,
      'Profile complete': item.vendor.isProfileComplete ? 'Yes' : 'No',
      'Effective selection opening time': item.effectiveOpensAt || '',
      'Selection status': item.selectionStatus.label
    })),
    incomplete_profiles: eligible.filter((item) => !item.vendor.isProfileComplete).map((item) => ({
      'Company name': item.vendor.companyName || '',
      'Contact name': item.vendor.contactName || '',
      Phone: item.vendor.phone || '',
      Tier: item.vendor.tier,
      'Missing company name': item.vendor.companyName ? 'No' : 'Yes',
      'Missing contact name': item.vendor.contactName ? 'No' : 'Yes',
      'Missing logo': item.vendor.logoUrl ? 'No' : 'Yes'
    })),
    excluded_vendors: eventData.vendors.filter((item) => item.excluded).map((item) => ({
      'Company name': item.vendor.companyName,
      'Contact name': item.vendor.contactName,
      Tier: item.vendor.tier,
      'Show name': show.name,
      'Exclusion status': 'excluded'
    })),
    booth_inventory: eventData.booths.map((booth) => ({
      'Booth number': booth.boothNumber,
      'Booth name': booth.boothName || '',
      'Booth type': booth.boothType,
      Status: booth.status,
      'Width label': booth.widthLabel || '',
      'Depth label': booth.depthLabel || '',
      Price: booth.price ?? '',
      Featured: booth.isFeatured ? 'Yes' : 'No',
      Notes: booth.notes || ''
    })),
    assignment_history: history.map((item) => ({
      'Date/time': item.createdAt || '',
      Action: item.action,
      'Vendor company': item.companyName || '',
      'Booth number': item.boothNumber || '',
      'Previous booth number': item.previousBoothId || '',
      'New booth number': item.newBoothId || '',
      'Performed by': item.performedByUserId || '',
      Notes: item.notes || ''
    }))
  };
  return { show, rows: rows[type] || [] };
}

export async function archiveWarnings(showId) {
  const [rows] = await pool.execute(
    `SELECT
      (SELECT COUNT(*) FROM booth_assignments WHERE show_id = ? AND status = 'active') AS active_assignments,
      (SELECT COUNT(*) FROM show_public_settings WHERE show_id = ? AND public_share_token IS NOT NULL AND (public_map_enabled OR public_directory_enabled)) AS public_links,
      (SELECT COUNT(*) FROM vendor_communications WHERE show_id = ? AND status = 'drafted') AS communication_drafts,
      (SELECT COUNT(*) FROM assignment_history WHERE show_id = ?) AS assignment_history`,
    [showId, showId, showId, showId]
  );
  const row = rows[0] || {};
  return {
    activeAssignments: Number(row.active_assignments || 0),
    publicLinks: Number(row.public_links || 0),
    communicationDrafts: Number(row.communication_drafts || 0),
    assignmentHistory: Number(row.assignment_history || 0)
  };
}

function toPublicSettings(row) {
  return {
    id: row.id,
    showId: row.show_id,
    publicMapEnabled: Boolean(row.public_map_enabled),
    publicDirectoryEnabled: Boolean(row.public_directory_enabled),
    publicShareToken: row.public_share_token,
    publicViewExpiresAt: row.public_view_expires_at,
    displayOptions: { ...defaultPublicDisplayOptions, ...parseJson(row.display_options) },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function publicShow(show) {
  return {
    id: show.id,
    name: show.name,
    venueName: show.venueName,
    startDate: show.startDate,
    endDate: show.endDate,
    timezone: show.timezone
  };
}

function filterPublicObjects(objects, options) {
  return objects.filter((object) => {
    if (object.objectType !== 'booth') return options.showMapObjects;
    if (object.booth?.status === 'assigned') return true;
    if (['reserved', 'unavailable'].includes(object.booth?.status)) return options.showReservedUnavailable;
    return options.showUnassignedBooths;
  });
}

function publicAssignment(assignment) {
  return {
    boothId: assignment.boothId,
    boothNumber: assignment.booth.boothNumber,
    companyName: assignment.vendor.companyName,
    logoUrl: assignment.vendor.logoUrl,
    website: assignment.vendor.website || null
  };
}

function publicDirectoryVendor(item, options) {
  return {
    id: item.vendor.id,
    companyName: item.vendor.companyName,
    logoUrl: options.showLogos ? item.vendor.logoUrl : null,
    website: options.showWebsites ? item.vendor.website : null,
    description: options.showDescriptions ? item.vendor.description : null,
    tier: options.showTierBadges ? item.vendor.tier : null,
    boothNumber: item.assignment?.boothNumber || null,
    boothType: item.assignment?.boothType || null
  };
}

function parseJson(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return {}; }
}
