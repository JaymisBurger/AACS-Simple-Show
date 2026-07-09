import { pool } from '../config/db.js';
import { findActiveAssignmentForVendor, findAssignmentById, moveAssignmentTransaction } from './assignmentModel.js';

const requestSelect = `
  SELECT bcr.id, bcr.show_id, bcr.vendor_profile_id, bcr.current_assignment_id,
    bcr.current_booth_id, bcr.requested_booth_id, bcr.message, bcr.status,
    bcr.admin_response, bcr.reviewed_by_user_id, bcr.reviewed_at,
    bcr.created_at, bcr.updated_at,
    vp.company_name, vp.contact_name, vp.logo_url, vp.tier,
    u.email AS vendor_email,
    cb.booth_number AS current_booth_number,
    rb.booth_number AS requested_booth_number,
    reviewer.email AS reviewed_by_email
  FROM booth_change_requests bcr
  JOIN vendor_profiles vp ON vp.id = bcr.vendor_profile_id
  JOIN users u ON u.id = vp.user_id
  JOIN booths cb ON cb.id = bcr.current_booth_id
  JOIN booths rb ON rb.id = bcr.requested_booth_id
  LEFT JOIN users reviewer ON reviewer.id = bcr.reviewed_by_user_id
`;

export async function listBoothChangeRequests(showId, filters = {}) {
  const where = ['bcr.show_id = ?'];
  const params = [showId];
  if (filters.vendorProfileId) {
    where.push('bcr.vendor_profile_id = ?');
    params.push(filters.vendorProfileId);
  }
  if (filters.status && filters.status !== 'all') {
    where.push('bcr.status = ?');
    params.push(filters.status);
  }
  const [rows] = await pool.execute(
    `${requestSelect}
     WHERE ${where.join(' AND ')}
     ORDER BY FIELD(bcr.status, 'pending', 'approved', 'denied', 'cancelled'), bcr.created_at DESC`,
    params
  );
  return rows.map(toPublicRequest);
}

export async function createBoothChangeRequest({ showId, vendorProfileId, requestedBoothId, message }) {
  const assignment = await findActiveAssignmentForVendor(showId, vendorProfileId);
  if (!assignment) throw requestError('You need an assigned booth before requesting a change.', 409);
  if (Number(assignment.boothId) === Number(requestedBoothId)) throw requestError('Choose a different booth.', 422);

  const [pendingRows] = await pool.execute(
    "SELECT id FROM booth_change_requests WHERE show_id = ? AND vendor_profile_id = ? AND status = 'pending' LIMIT 1",
    [showId, vendorProfileId]
  );
  if (pendingRows[0]) throw requestError('You already have a pending booth change request.', 409);

  const [boothRows] = await pool.execute('SELECT id, status FROM booths WHERE id = ? AND show_id = ?', [requestedBoothId, showId]);
  const booth = boothRows[0];
  if (!booth) throw requestError('Requested booth was not found.', 404);
  if (booth.status !== 'available') throw requestError(`Booth is ${booth.status}.`, 409);

  const [result] = await pool.execute(
    `INSERT INTO booth_change_requests
      (show_id, vendor_profile_id, current_assignment_id, current_booth_id, requested_booth_id, message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [showId, vendorProfileId, assignment.id, assignment.boothId, requestedBoothId, normalizeMessage(message)]
  );
  return findBoothChangeRequestById(result.insertId);
}

export async function findBoothChangeRequestById(requestId) {
  const [rows] = await pool.execute(`${requestSelect} WHERE bcr.id = ?`, [requestId]);
  return rows[0] ? toPublicRequest(rows[0]) : null;
}

export async function approveBoothChangeRequest({ requestId, reviewedByUserId }) {
  const request = await findBoothChangeRequestById(requestId);
  if (!request) throw requestError('Change request not found.', 404);
  if (request.status !== 'pending') throw requestError('This request has already been reviewed.', 409);

  const assignment = await findAssignmentById(request.currentAssignmentId);
  if (!assignment || assignment.status !== 'active') throw requestError('Active assignment not found.', 409);
  if (Number(assignment.boothId) !== Number(request.currentBoothId)) {
    throw requestError('The vendor assignment has changed since this request was submitted.', 409);
  }

  await moveAssignmentTransaction({
    assignmentId: request.currentAssignmentId,
    newBoothId: request.requestedBoothId,
    performedByUserId: reviewedByUserId,
    notes: 'Approved vendor booth change request.'
  });
  await pool.execute(
    "UPDATE booth_change_requests SET status = 'approved', reviewed_by_user_id = ?, reviewed_at = NOW(), admin_response = NULL WHERE id = ?",
    [reviewedByUserId, requestId]
  );
  return findBoothChangeRequestById(requestId);
}

export async function denyBoothChangeRequest({ requestId, reviewedByUserId, reason }) {
  const cleanReason = normalizeMessage(reason);
  if (!cleanReason) throw requestError('Denial reason is required.', 422);
  const request = await findBoothChangeRequestById(requestId);
  if (!request) throw requestError('Change request not found.', 404);
  if (request.status !== 'pending') throw requestError('This request has already been reviewed.', 409);
  await pool.execute(
    "UPDATE booth_change_requests SET status = 'denied', reviewed_by_user_id = ?, reviewed_at = NOW(), admin_response = ? WHERE id = ?",
    [reviewedByUserId, cleanReason, requestId]
  );
  return findBoothChangeRequestById(requestId);
}

function toPublicRequest(row) {
  return {
    id: row.id,
    showId: row.show_id,
    vendorProfileId: row.vendor_profile_id,
    currentAssignmentId: row.current_assignment_id,
    currentBoothId: row.current_booth_id,
    requestedBoothId: row.requested_booth_id,
    message: row.message,
    status: row.status,
    adminResponse: row.admin_response,
    reviewedByUserId: row.reviewed_by_user_id,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    vendor: {
      id: row.vendor_profile_id,
      companyName: row.company_name,
      contactName: row.contact_name,
      email: row.vendor_email,
      logoUrl: row.logo_url,
      tier: row.tier
    },
    currentBooth: { id: row.current_booth_id, boothNumber: row.current_booth_number },
    requestedBooth: { id: row.requested_booth_id, boothNumber: row.requested_booth_number },
    reviewedByEmail: row.reviewed_by_email
  };
}

function normalizeMessage(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function requestError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}
