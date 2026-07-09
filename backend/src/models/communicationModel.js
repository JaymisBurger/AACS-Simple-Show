import { pool } from '../config/db.js';

const communicationSelect = `
  SELECT vc.id, vc.show_id, vc.vendor_profile_id, vc.communication_type,
    vc.subject, vc.message, vc.status, vc.created_by_user_id, vc.created_at, vc.updated_at,
    vp.company_name, vp.contact_name, vp.logo_url, vp.tier,
    u.email AS vendor_email,
    creator.email AS created_by_email
  FROM vendor_communications vc
  LEFT JOIN vendor_profiles vp ON vp.id = vc.vendor_profile_id
  LEFT JOIN users u ON u.id = vp.user_id
  JOIN users creator ON creator.id = vc.created_by_user_id
`;

export async function listCommunications(showId, filters = {}) {
  const where = ['vc.show_id = ?'];
  const params = [showId];
  if (filters.vendorProfileId) {
    where.push('vc.vendor_profile_id = ?');
    params.push(filters.vendorProfileId);
  }
  if (filters.status && filters.status !== 'all') {
    where.push('vc.status = ?');
    params.push(filters.status);
  }
  const [rows] = await pool.execute(
    `${communicationSelect}
     WHERE ${where.join(' AND ')}
     ORDER BY vc.created_at DESC`,
    params
  );
  return rows.map(toPublicCommunication);
}

export async function createCommunication(input) {
  const [result] = await pool.execute(
    `INSERT INTO vendor_communications
      (show_id, vendor_profile_id, communication_type, subject, message, status, created_by_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      input.showId,
      input.vendorProfileId || null,
      input.communicationType,
      input.subject,
      input.message,
      input.status || 'drafted',
      input.createdByUserId
    ]
  );
  return findCommunicationById(result.insertId);
}

export async function findCommunicationById(id) {
  const [rows] = await pool.execute(`${communicationSelect} WHERE vc.id = ?`, [id]);
  return rows[0] ? toPublicCommunication(rows[0]) : null;
}

export async function updateCommunicationStatus(id, status) {
  await pool.execute('UPDATE vendor_communications SET status = ? WHERE id = ?', [status, id]);
  return findCommunicationById(id);
}

export async function countCommunicationsForShow(showId) {
  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS total FROM vendor_communications WHERE show_id = ? AND status <> 'cancelled'",
    [showId]
  );
  return Number(rows[0]?.total || 0);
}

function toPublicCommunication(row) {
  return {
    id: row.id,
    showId: row.show_id,
    vendorProfileId: row.vendor_profile_id,
    communicationType: row.communication_type,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdByUserId: row.created_by_user_id,
    createdByEmail: row.created_by_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    vendor: row.vendor_profile_id
      ? {
          id: row.vendor_profile_id,
          companyName: row.company_name,
          contactName: row.contact_name,
          logoUrl: row.logo_url,
          tier: row.tier,
          email: row.vendor_email
        }
      : null
  };
}
