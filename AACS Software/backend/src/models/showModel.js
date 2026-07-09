import { pool } from '../config/db.js';
import { tiers } from '../services/showValidationService.js';

const showSelect = `
  SELECT id, name, venue_name, venue_address, start_date, end_date,
    vendor_selection_deadline, timezone, status, selection_paused, created_by,
    created_at, updated_at
  FROM shows
`;

export async function listShows({ status, search }) {
  const where = [];
  const params = [];

  if (status && status !== 'all') {
    where.push('status = ?');
    params.push(status);
  } else {
    where.push("status <> 'archived'");
  }

  if (search) {
    where.push('(name LIKE ? OR venue_name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  const [rows] = await pool.execute(
    `${showSelect}
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY start_date IS NULL, start_date DESC, created_at DESC`,
    params
  );

  return rows.map(toPublicShow);
}

export async function findShowById(id) {
  const [rows] = await pool.execute(`${showSelect} WHERE id = ?`, [id]);
  return rows[0] ? toPublicShow(rows[0]) : null;
}

export async function findShowWithWindows(id) {
  const show = await findShowById(id);
  if (!show) return null;

  const windows = await findTierWindowsByShowId(id);
  return { ...show, tierWindows: windows };
}

export async function createShow(show, createdBy) {
  const [result] = await pool.execute(
    `INSERT INTO shows
      (name, venue_name, venue_address, start_date, end_date, vendor_selection_deadline,
       timezone, status, selection_paused, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      show.name,
      show.venueName,
      show.venueAddress,
      show.startDate,
      show.endDate,
      show.vendorSelectionDeadline,
      show.timezone,
      show.status,
      show.selectionPaused,
      createdBy
    ]
  );

  return findShowWithWindows(result.insertId);
}

export async function updateShow(id, show) {
  await pool.execute(
    `UPDATE shows
     SET name = ?, venue_name = ?, venue_address = ?, start_date = ?, end_date = ?,
       vendor_selection_deadline = ?, timezone = ?, status = ?, selection_paused = ?
     WHERE id = ?`,
    [
      show.name,
      show.venueName,
      show.venueAddress,
      show.startDate,
      show.endDate,
      show.vendorSelectionDeadline,
      show.timezone,
      show.status,
      show.selectionPaused,
      id
    ]
  );

  return findShowWithWindows(id);
}

export async function updateShowStatus(id, status) {
  await pool.execute('UPDATE shows SET status = ? WHERE id = ?', [status, id]);
  return findShowWithWindows(id);
}

export async function deleteShow(id) {
  const [result] = await pool.execute('DELETE FROM shows WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function countShowDependentRecords(id) {
  const [rows] = await pool.execute(
    `SELECT
      (SELECT COUNT(*) FROM show_tier_windows WHERE show_id = ?) AS tier_windows_count,
      (SELECT COUNT(*) FROM show_vendors WHERE show_id = ?) AS show_vendors_count`,
    [id, id]
  );

  return Number(rows[0]?.tier_windows_count || 0) + Number(rows[0]?.show_vendors_count || 0);
}

export async function findTierWindowsByShowId(showId) {
  const [rows] = await pool.execute(
    `SELECT id, show_id, tier, opens_at, created_at, updated_at
     FROM show_tier_windows
     WHERE show_id = ?
     ORDER BY FIELD(tier, 'platinum', 'gold', 'silver', 'bronze')`,
    [showId]
  );

  const windows = tiers.reduce((result, tier) => {
    result[tier] = null;
    return result;
  }, {});

  rows.forEach((row) => {
    windows[row.tier] = toPublicTierWindow(row);
  });

  return windows;
}

export async function upsertTierWindows(showId, windows) {
  const values = tiers
    .filter((tier) => windows[tier])
    .map((tier) => [showId, tier, windows[tier]]);

  if (values.length === 0) {
    return findTierWindowsByShowId(showId);
  }

  await pool.query(
    `INSERT INTO show_tier_windows (show_id, tier, opens_at)
     VALUES ?
     ON DUPLICATE KEY UPDATE opens_at = VALUES(opens_at)`,
    [values]
  );

  return findTierWindowsByShowId(showId);
}

export function toPublicShow(row) {
  return {
    id: row.id,
    name: row.name,
    venueName: row.venue_name,
    venueAddress: row.venue_address,
    startDate: formatDate(row.start_date),
    endDate: formatDate(row.end_date),
    vendorSelectionDeadline: formatDateTime(row.vendor_selection_deadline),
    timezone: row.timezone,
    status: row.status,
    selectionPaused: Boolean(row.selection_paused),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toPublicTierWindow(row) {
  return {
    id: row.id,
    showId: row.show_id,
    tier: row.tier,
    opensAt: formatDateTime(row.opens_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at
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
