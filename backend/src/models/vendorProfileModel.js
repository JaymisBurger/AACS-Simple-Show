import { pool } from '../config/db.js';
import { profileComplete } from '../services/vendorValidationService.js';

const vendorSelect = `
  SELECT
    vp.id, vp.user_id, vp.company_name, vp.contact_name, vp.phone, vp.website,
    vp.description, vp.logo_url, vp.tier, vp.is_profile_complete,
    vp.created_at, vp.updated_at,
    u.email, u.is_active, u.requires_password_change, u.created_at AS user_created_at
  FROM vendor_profiles vp
  JOIN users u ON u.id = vp.user_id
`;

export async function findVendorProfileByUserId(userId) {
  const [rows] = await pool.execute(`${vendorSelect} WHERE vp.user_id = ?`, [userId]);
  return rows[0] || null;
}

export async function findVendorById(vendorId) {
  const [rows] = await pool.execute(`${vendorSelect} WHERE vp.id = ?`, [vendorId]);
  if (!rows[0]) return null;
  const [assignments, showActivity] = await Promise.all([
    listVendorShowAssignments(vendorId),
    listVendorShowActivity(vendorId)
  ]);
  return toPublicVendorProfile(rows[0], assignments, showActivity);
}

export async function listVendors(filters = {}) {
  const where = [];
  const params = [];

  if (filters.search) {
    where.push('(vp.company_name LIKE ? OR vp.contact_name LIKE ? OR u.email LIKE ?)');
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }
  if (filters.tier && filters.tier !== 'all') {
    where.push('vp.tier = ?');
    params.push(filters.tier);
  }
  if (filters.active === 'active') where.push('u.is_active = TRUE');
  if (filters.active === 'inactive') where.push('u.is_active = FALSE');
  if (filters.complete === 'complete') where.push('vp.is_profile_complete = TRUE');
  if (filters.complete === 'incomplete') where.push('vp.is_profile_complete = FALSE');
  if (filters.showId && filters.showId !== 'all') {
    where.push(`EXISTS (
      SELECT 1 FROM show_vendors sv
      WHERE sv.vendor_profile_id = vp.id AND sv.show_id = ?
    )`);
    params.push(filters.showId);
  }

  const sortMap = {
    company: 'vp.company_name IS NULL, vp.company_name ASC',
    tier: "FIELD(vp.tier, 'platinum', 'gold', 'silver', 'bronze')",
    created_at: 'vp.created_at DESC'
  };
  const sort = sortMap[filters.sort] || sortMap.company;

  const [rows] = await pool.execute(
    `${vendorSelect}
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY ${sort}`,
    params
  );

  const assignments = await listAssignmentsForVendorIds(rows.map((row) => row.id));
  return rows.map((row) => toPublicVendorProfile(row, assignments.get(Number(row.id)) || []));
}

export async function createVendorProfile(connection, userId, profile) {
  const complete = profileComplete({ ...profile, logoUrl: profile.logoUrl });
  const [result] = await connection.execute(
    `INSERT INTO vendor_profiles
      (user_id, company_name, contact_name, phone, website, description, logo_url, tier, is_profile_complete)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      profile.companyName,
      profile.contactName,
      profile.phone,
      profile.website,
      profile.description,
      profile.logoUrl || null,
      profile.tier || 'bronze',
      complete
    ]
  );
  return result.insertId;
}

export async function updateVendorProfile(vendorId, profile, connection = pool) {
  const existing = await findVendorById(vendorId);
  const next = { ...existing, ...profile, logoUrl: profile.logoUrl ?? existing?.logoUrl };
  const complete = profileComplete(next);
  await connection.execute(
    `UPDATE vendor_profiles
     SET company_name = ?, contact_name = ?, phone = ?, website = ?, description = ?,
       logo_url = ?, is_profile_complete = ?
     WHERE id = ?`,
    [
      next.companyName,
      next.contactName,
      next.phone,
      next.website,
      next.description,
      next.logoUrl,
      complete,
      vendorId
    ]
  );
  return findVendorById(vendorId);
}

export async function updateVendorTier(vendorId, tier) {
  await pool.execute('UPDATE vendor_profiles SET tier = ? WHERE id = ?', [tier, vendorId]);
  return findVendorById(vendorId);
}

export async function updateVendorLogo(vendorId, logoUrl) {
  const vendor = await findVendorById(vendorId);
  await pool.execute('UPDATE vendor_profiles SET logo_url = ?, is_profile_complete = ? WHERE id = ?', [
    logoUrl,
    profileComplete({ ...vendor, logoUrl }),
    vendorId
  ]);
  return findVendorById(vendorId);
}

export async function assignVendorToShow(connection, showId, vendorProfileId, options = {}) {
  const status = options.status || 'excluded';
  await connection.execute(
    `INSERT INTO show_vendors
      (show_id, vendor_profile_id, status, special_access_opens_at, invited_at, activated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE status = VALUES(status),
       special_access_opens_at = VALUES(special_access_opens_at),
       updated_at = CURRENT_TIMESTAMP`,
    [
      showId,
      vendorProfileId,
      status,
      options.specialAccessOpensAt || null,
      status === 'invited' ? new Date() : null,
      status === 'active' ? new Date() : null
    ]
  );
}

export async function listVendorAccessibleShows(vendorProfileId) {
  const [rows] = await pool.execute(
    `SELECT
      NULL AS id,
      s.id AS show_id,
      ? AS vendor_profile_id,
      COALESCE(sv.status, 'available') AS status,
      sv.special_access_opens_at,
      sv.invited_at,
      sv.activated_at,
      sv.created_at,
      sv.updated_at,
      s.name AS show_name,
      s.venue_name,
      s.start_date,
      s.end_date,
      s.timezone,
      s.status AS show_status,
      s.selection_paused,
      s.vendor_selection_deadline,
      stw.opens_at AS tier_opens_at
     FROM vendor_profiles vp
     JOIN shows s ON s.status <> 'archived'
     LEFT JOIN show_tier_windows stw ON stw.show_id = s.id AND stw.tier = vp.tier
     LEFT JOIN show_vendors sv ON sv.show_id = s.id AND sv.vendor_profile_id = vp.id
     WHERE vp.id = ?
       AND (sv.status IS NULL OR sv.status <> 'excluded')
     ORDER BY s.start_date IS NULL, s.start_date ASC, s.name ASC`,
    [vendorProfileId, vendorProfileId]
  );
  return rows.map(toPublicAssignment);
}

export async function listVendorShowAssignments(vendorProfileId) {
  const [rows] = await pool.execute(
    `SELECT ${assignmentFields()}
     FROM show_vendors sv
     JOIN shows s ON s.id = sv.show_id
     LEFT JOIN show_tier_windows stw ON stw.show_id = s.id
       AND stw.tier = (SELECT tier FROM vendor_profiles WHERE id = sv.vendor_profile_id)
     WHERE sv.vendor_profile_id = ?
     ORDER BY s.start_date IS NULL, s.start_date ASC, s.name ASC`,
    [vendorProfileId]
  );
  return rows.map(toPublicAssignment);
}

export async function listVendorShowActivity(vendorProfileId) {
  const [rows] = await pool.execute(
    `SELECT
       ba.id, ba.show_id, ba.booth_id, ba.vendor_profile_id, ba.assignment_source,
       ba.status, ba.selected_at, ba.confirmed_at, ba.created_at,
       b.booth_number, b.booth_name, b.booth_type,
       s.name AS show_name, s.venue_name, s.start_date, s.end_date, s.timezone, s.status AS show_status
     FROM booth_assignments ba
     JOIN booths b ON b.id = ba.booth_id
     JOIN shows s ON s.id = ba.show_id
     WHERE ba.vendor_profile_id = ? AND ba.status = 'active'
     ORDER BY s.start_date IS NULL, s.start_date DESC, s.name ASC`,
    [vendorProfileId]
  );
  return rows.map(toPublicShowActivity);
}

export async function listShowVendorAssignments(showId) {
  const [rows] = await pool.execute(
    `SELECT ${assignmentFields()}, vp.tier, vp.company_name, vp.contact_name, vp.logo_url,
       vp.is_profile_complete, u.email, u.is_active
     FROM show_vendors sv
     JOIN shows s ON s.id = sv.show_id
     JOIN vendor_profiles vp ON vp.id = sv.vendor_profile_id
     JOIN users u ON u.id = vp.user_id
     LEFT JOIN show_tier_windows stw ON stw.show_id = s.id AND stw.tier = vp.tier
     WHERE sv.show_id = ?
     ORDER BY FIELD(vp.tier, 'platinum', 'gold', 'silver', 'bronze'), vp.company_name ASC`,
    [showId]
  );
  return rows.map((row) => ({
    ...toPublicAssignment(row),
    vendor: {
      id: row.vendor_profile_id,
      companyName: row.company_name,
      contactName: row.contact_name,
      logoUrl: row.logo_url,
      tier: row.tier,
      email: row.email,
      isActive: Boolean(row.is_active),
      isProfileComplete: Boolean(row.is_profile_complete)
    }
  }));
}

export async function showVendorStats(showId) {
  const [rows] = await pool.execute(
    `SELECT
      COUNT(*) AS total,
      SUM(vp.tier = 'platinum') AS platinum,
      SUM(vp.tier = 'gold') AS gold,
      SUM(vp.tier = 'silver') AS silver,
      SUM(vp.tier = 'bronze') AS bronze,
      SUM(sv.status = 'excluded') AS excluded,
      SUM(vp.is_profile_complete = FALSE) AS profile_incomplete
     FROM vendor_profiles vp
     LEFT JOIN show_vendors sv ON sv.vendor_profile_id = vp.id AND sv.show_id = ? AND sv.status <> 'removed'`,
    [showId]
  );
  const row = rows[0] || {};
  return {
    total: Number(row.total || 0),
    platinum: Number(row.platinum || 0),
    gold: Number(row.gold || 0),
    silver: Number(row.silver || 0),
    bronze: Number(row.bronze || 0),
    excluded: Number(row.excluded || 0),
    profileIncomplete: Number(row.profile_incomplete || 0)
  };
}

export async function updateShowVendor(showId, vendorProfileId, updates) {
  await pool.execute(
    `UPDATE show_vendors
     SET status = ?, special_access_opens_at = ?, activated_at = CASE WHEN ? = 'active' THEN COALESCE(activated_at, NOW()) ELSE activated_at END
     WHERE show_id = ? AND vendor_profile_id = ?`,
    [updates.status, updates.specialAccessOpensAt || null, updates.status, showId, vendorProfileId]
  );
}

export async function removeVendorFromShow(showId, vendorProfileId) {
  await pool.execute(
    "UPDATE show_vendors SET status = 'removed' WHERE show_id = ? AND vendor_profile_id = ?",
    [showId, vendorProfileId]
  );
}

async function listAssignmentsForVendorIds(vendorIds) {
  const result = new Map();
  if (vendorIds.length === 0) return result;

  const [rows] = await pool.query(
    `SELECT ${assignmentFields()}
     FROM show_vendors sv
     JOIN shows s ON s.id = sv.show_id
     LEFT JOIN vendor_profiles vp ON vp.id = sv.vendor_profile_id
     LEFT JOIN show_tier_windows stw ON stw.show_id = s.id AND stw.tier = vp.tier
     WHERE sv.vendor_profile_id IN (?) AND sv.status <> 'removed'
     ORDER BY s.start_date IS NULL, s.start_date ASC`,
    [vendorIds]
  );

  rows.forEach((row) => {
    const key = Number(row.vendor_profile_id);
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(toPublicAssignment(row));
  });
  return result;
}

function assignmentFields() {
  return `sv.id, sv.show_id, sv.vendor_profile_id, sv.status, sv.special_access_opens_at,
    sv.invited_at, sv.activated_at, sv.created_at, sv.updated_at,
    s.name AS show_name, s.venue_name, s.start_date, s.end_date, s.timezone,
    s.status AS show_status, s.selection_paused, s.vendor_selection_deadline,
    stw.opens_at AS tier_opens_at`;
}

export function toPublicVendorProfile(profile, assignments = [], showActivity = []) {
  if (!profile) return null;
  return {
    id: profile.id,
    userId: profile.user_id,
    email: profile.email,
    companyName: profile.company_name,
    contactName: profile.contact_name,
    phone: profile.phone,
    website: profile.website,
    description: profile.description,
    logoUrl: profile.logo_url,
    tier: profile.tier,
    isProfileComplete: Boolean(profile.is_profile_complete),
    isActive: Boolean(profile.is_active),
    requiresPasswordChange: Boolean(profile.requires_password_change),
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
    assignments,
    showActivity
  };
}

export function toPublicShowActivity(row) {
  return {
    id: row.id,
    showId: row.show_id,
    boothId: row.booth_id,
    vendorProfileId: row.vendor_profile_id,
    assignmentSource: row.assignment_source,
    status: row.status,
    selectedAt: formatDateTime(row.selected_at),
    confirmedAt: formatDateTime(row.confirmed_at),
    assignedAt: formatDateTime(row.created_at),
    showName: row.show_name,
    venueName: row.venue_name,
    startDate: formatDate(row.start_date),
    endDate: formatDate(row.end_date),
    timezone: row.timezone,
    showStatus: row.show_status,
    boothNumber: row.booth_number === null ? null : Number(row.booth_number),
    boothName: row.booth_name,
    boothType: row.booth_type
  };
}

export function toPublicAssignment(row) {
  const effectiveOpensAt = row.special_access_opens_at || row.tier_opens_at || null;
  return {
    id: row.id,
    showId: row.show_id,
    vendorProfileId: row.vendor_profile_id,
    status: row.status,
    specialAccessOpensAt: formatDateTime(row.special_access_opens_at),
    invitedAt: row.invited_at,
    activatedAt: row.activated_at,
    showName: row.show_name,
    venueName: row.venue_name,
    startDate: formatDate(row.start_date),
    endDate: formatDate(row.end_date),
    timezone: row.timezone,
    showStatus: row.show_status,
    selectionPaused: Boolean(row.selection_paused),
    vendorSelectionDeadline: formatDateTime(row.vendor_selection_deadline),
    tierOpensAt: formatDateTime(row.tier_opens_at),
    effectiveOpensAt: formatDateTime(effectiveOpensAt)
  };
}

function formatDate(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.replace(' ', 'T').slice(0, 16);
  return value.toISOString().slice(0, 16);
}
