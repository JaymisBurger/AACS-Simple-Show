import { pool } from '../config/db.js';

const assignmentSelect = `
  SELECT
    ba.id, ba.show_id, ba.booth_id, ba.vendor_profile_id, ba.assigned_by_user_id,
    ba.assignment_source, ba.status, ba.previous_booth_status,
    ba.selected_at, ba.confirmed_at, ba.released_at, ba.created_at, ba.updated_at,
    b.booth_number, b.booth_name, b.booth_type, b.width_label, b.depth_label,
    b.price, b.notes, b.status AS booth_status,
    vp.company_name, vp.logo_url, vp.tier, vp.is_profile_complete,
    s.name AS show_name, s.venue_name, s.start_date, s.end_date, s.timezone
  FROM booth_assignments ba
  JOIN booths b ON b.id = ba.booth_id
  JOIN vendor_profiles vp ON vp.id = ba.vendor_profile_id
  JOIN shows s ON s.id = ba.show_id
`;

export async function listAssignments(filters = {}) {
  const where = [];
  const params = [];
  if (filters.showId && filters.showId !== 'all') {
    where.push('ba.show_id = ?');
    params.push(filters.showId);
  }
  if (filters.tier && filters.tier !== 'all') {
    where.push('vp.tier = ?');
    params.push(filters.tier);
  }
  if (filters.source && filters.source !== 'all') {
    where.push('ba.assignment_source = ?');
    params.push(filters.source);
  }
  if (filters.status && filters.status !== 'all') {
    where.push('ba.status = ?');
    params.push(filters.status);
  }
  if (filters.search) {
    where.push('(vp.company_name LIKE ? OR CAST(b.booth_number AS CHAR) LIKE ? OR s.name LIKE ?)');
    params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
  }

  const [rows] = await pool.execute(
    `${assignmentSelect}
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY ba.created_at DESC`,
    params
  );
  return rows.map(toPublicAssignment);
}

export async function findActiveAssignmentForVendor(showId, vendorProfileId, connection = pool) {
  const [rows] = await connection.execute(
    `${assignmentSelect}
     WHERE ba.show_id = ? AND ba.vendor_profile_id = ? AND ba.status = 'active'
     LIMIT 1`,
    [showId, vendorProfileId]
  );
  return rows[0] ? toPublicAssignment(rows[0]) : null;
}

export async function findActiveAssignmentForBooth(showId, boothId, connection = pool) {
  const [rows] = await connection.execute(
    `${assignmentSelect}
     WHERE ba.show_id = ? AND ba.booth_id = ? AND ba.status = 'active'
     LIMIT 1`,
    [showId, boothId]
  );
  return rows[0] ? toPublicAssignment(rows[0]) : null;
}

export async function findAssignmentById(assignmentId, connection = pool) {
  const [rows] = await connection.execute(`${assignmentSelect} WHERE ba.id = ?`, [assignmentId]);
  return rows[0] ? toPublicAssignment(rows[0]) : null;
}

export async function listAssignmentsForShow(showId) {
  return listAssignments({ showId });
}

export async function listAssignmentHistory(showId, assignmentId = null) {
  const params = [showId];
  let assignmentFilter = '';
  if (assignmentId) {
    assignmentFilter = ` AND (ah.booth_id IN (SELECT booth_id FROM booth_assignments WHERE id = ?)
      OR ah.vendor_profile_id IN (SELECT vendor_profile_id FROM booth_assignments WHERE id = ?))`;
    params.push(assignmentId, assignmentId);
  }
  const [rows] = await pool.execute(
    `SELECT ah.id, ah.show_id, ah.booth_id, ah.vendor_profile_id, ah.action,
       ah.performed_by_user_id, ah.previous_booth_id, ah.new_booth_id, ah.notes,
       ah.created_at, b.booth_number, vp.company_name
     FROM assignment_history ah
     LEFT JOIN booths b ON b.id = ah.booth_id
     JOIN vendor_profiles vp ON vp.id = ah.vendor_profile_id
     WHERE ah.show_id = ?${assignmentFilter}
     ORDER BY ah.created_at DESC`,
    params
  );
  return rows.map((row) => ({
    id: row.id,
    showId: row.show_id,
    boothId: row.booth_id,
    vendorProfileId: row.vendor_profile_id,
    action: row.action,
    performedByUserId: row.performed_by_user_id,
    previousBoothId: row.previous_booth_id,
    newBoothId: row.new_booth_id,
    notes: row.notes,
    createdAt: row.created_at,
    boothNumber: row.booth_number,
    companyName: row.company_name
  }));
}

export async function createAssignmentTransaction({
  showId,
  boothId,
  vendorProfileId,
  performedByUserId,
  assignmentSource,
  historyAction,
  notes
}) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [boothRows] = await connection.execute(
      `SELECT id, status
       FROM booths
       WHERE id = ? AND show_id = ?
       FOR UPDATE`,
      [boothId, showId]
    );
    const booth = boothRows[0];
    if (!booth) throw conflictError('Booth not found.', 404);
    if (booth.status !== 'available') throw conflictError(`Booth is ${booth.status}.`, 409);

    const activeVendor = await findActiveAssignmentForVendor(showId, vendorProfileId, connection);
    if (activeVendor) throw conflictError('This vendor already has an active booth for this show.', 409);
    const activeBooth = await findActiveAssignmentForBooth(showId, boothId, connection);
    if (activeBooth) throw conflictError('This booth has already been assigned.', 409);

    const [result] = await connection.execute(
      `INSERT INTO booth_assignments
        (show_id, booth_id, vendor_profile_id, assigned_by_user_id, assignment_source,
         status, previous_booth_status, selected_at, confirmed_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, NOW(), NOW())`,
      [showId, boothId, vendorProfileId, performedByUserId, assignmentSource, booth.status]
    );
    await connection.execute("UPDATE booths SET status = 'assigned' WHERE id = ?", [boothId]);
    await insertHistory(connection, {
      showId,
      boothId,
      vendorProfileId,
      action: historyAction,
      performedByUserId,
      previousBoothId: null,
      newBoothId: boothId,
      notes
    });
    await connection.commit();
    return findAssignmentById(result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function moveAssignmentTransaction({ assignmentId, newBoothId, performedByUserId, notes }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const assignment = await findAssignmentById(assignmentId, connection);
    if (!assignment || assignment.status !== 'active') throw conflictError('Active assignment not found.', 404);
    const [oldRows] = await connection.execute('SELECT id, status FROM booths WHERE id = ? FOR UPDATE', [assignment.boothId]);
    const [newRows] = await connection.execute('SELECT id, status FROM booths WHERE id = ? AND show_id = ? FOR UPDATE', [
      newBoothId,
      assignment.showId
    ]);
    const oldBooth = oldRows[0];
    const newBooth = newRows[0];
    if (!newBooth) throw conflictError('New booth not found.', 404);
    if (newBooth.status !== 'available') throw conflictError(`New booth is ${newBooth.status}.`, 409);

    await connection.execute('UPDATE booths SET status = ? WHERE id = ?', [restoreStatus(assignment.previousBoothStatus), oldBooth.id]);
    await connection.execute("UPDATE booths SET status = 'assigned' WHERE id = ?", [newBooth.id]);
    await connection.execute(
      `UPDATE booth_assignments
       SET booth_id = ?, assignment_source = 'admin_move', previous_booth_status = ?
       WHERE id = ?`,
      [newBooth.id, newBooth.status, assignmentId]
    );
    await insertHistory(connection, {
      showId: assignment.showId,
      boothId: newBooth.id,
      vendorProfileId: assignment.vendorProfileId,
      action: 'moved',
      performedByUserId,
      previousBoothId: oldBooth.id,
      newBoothId: newBooth.id,
      notes
    });
    await connection.commit();
    return findAssignmentById(assignmentId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function releaseAssignmentTransaction({ assignmentId, performedByUserId, notes }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const assignment = await findAssignmentById(assignmentId, connection);
    if (!assignment || assignment.status !== 'active') throw conflictError('Active assignment not found.', 404);
    await connection.execute('UPDATE booths SET status = ? WHERE id = ?', [restoreStatus(assignment.previousBoothStatus), assignment.boothId]);
    await connection.execute(
      "UPDATE booth_assignments SET status = 'released', released_at = NOW() WHERE id = ?",
      [assignmentId]
    );
    await insertHistory(connection, {
      showId: assignment.showId,
      boothId: assignment.boothId,
      vendorProfileId: assignment.vendorProfileId,
      action: 'released',
      performedByUserId,
      previousBoothId: assignment.boothId,
      newBoothId: null,
      notes
    });
    await connection.commit();
    return findAssignmentById(assignmentId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function swapAssignmentsTransaction({ assignmentAId, assignmentBId, performedByUserId, notes }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const a = await findAssignmentById(assignmentAId, connection);
    const b = await findAssignmentById(assignmentBId, connection);
    if (!a || !b || a.status !== 'active' || b.status !== 'active' || a.showId !== b.showId) {
      throw conflictError('Choose two active assignments in the same show.', 409);
    }
    await connection.execute("UPDATE booth_assignments SET status = 'cancelled' WHERE id IN (?, ?)", [a.id, b.id]);
    const [newA] = await connection.execute(
      `INSERT INTO booth_assignments
        (show_id, booth_id, vendor_profile_id, assigned_by_user_id, assignment_source,
         status, previous_booth_status, selected_at, confirmed_at)
       VALUES (?, ?, ?, ?, 'admin_move', 'active', ?, NOW(), NOW())`,
      [a.showId, b.boothId, a.vendorProfileId, performedByUserId, a.previousBoothStatus]
    );
    const [newB] = await connection.execute(
      `INSERT INTO booth_assignments
        (show_id, booth_id, vendor_profile_id, assigned_by_user_id, assignment_source,
         status, previous_booth_status, selected_at, confirmed_at)
       VALUES (?, ?, ?, ?, 'admin_move', 'active', ?, NOW(), NOW())`,
      [b.showId, a.boothId, b.vendorProfileId, performedByUserId, b.previousBoothStatus]
    );
    await insertHistory(connection, {
      showId: a.showId,
      boothId: b.boothId,
      vendorProfileId: a.vendorProfileId,
      action: 'moved',
      performedByUserId,
      previousBoothId: a.boothId,
      newBoothId: b.boothId,
      notes
    });
    await insertHistory(connection, {
      showId: b.showId,
      boothId: a.boothId,
      vendorProfileId: b.vendorProfileId,
      action: 'moved',
      performedByUserId,
      previousBoothId: b.boothId,
      newBoothId: a.boothId,
      notes
    });
    await connection.commit();
    return { assignments: [await findAssignmentById(newA.insertId), await findAssignmentById(newB.insertId)] };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function assignmentStats(showId) {
  const [rows] = await pool.execute(
    `SELECT
      (SELECT COUNT(*) FROM booths WHERE show_id = ?) AS total_booths,
      (SELECT COUNT(*) FROM booths WHERE show_id = ? AND status = 'available') AS available_booths,
      (SELECT COUNT(*) FROM booths WHERE show_id = ? AND status = 'assigned') AS assigned_booths,
      (SELECT COUNT(*) FROM booths WHERE show_id = ? AND status = 'reserved') AS reserved_booths,
      (SELECT COUNT(*) FROM booths WHERE show_id = ? AND status = 'unavailable') AS unavailable_booths,
      (SELECT COUNT(*) FROM vendor_profiles vp JOIN users u ON u.id = vp.user_id WHERE u.is_active = TRUE
        AND NOT EXISTS (SELECT 1 FROM show_vendors sv WHERE sv.show_id = ? AND sv.vendor_profile_id = vp.id AND sv.status = 'excluded')) AS eligible_vendors,
      (SELECT COUNT(*) FROM show_vendors WHERE show_id = ? AND status = 'excluded') AS excluded_vendors,
      (SELECT COUNT(*) FROM booth_assignments WHERE show_id = ? AND status = 'active') AS vendors_with_booths`,
    [showId, showId, showId, showId, showId, showId, showId, showId]
  );
  const row = rows[0] || {};
  return {
    totalBooths: Number(row.total_booths || 0),
    availableBooths: Number(row.available_booths || 0),
    assignedBooths: Number(row.assigned_booths || 0),
    reservedBooths: Number(row.reserved_booths || 0),
    unavailableBooths: Number(row.unavailable_booths || 0),
    eligibleVendors: Number(row.eligible_vendors || 0),
    excludedVendors: Number(row.excluded_vendors || 0),
    vendorsWithBooths: Number(row.vendors_with_booths || 0),
    vendorsWithoutBooths: Math.max(0, Number(row.eligible_vendors || 0) - Number(row.vendors_with_booths || 0))
  };
}

export async function listEligibleVendors(showId) {
  const [rows] = await pool.execute(
    `SELECT vp.id, vp.company_name, vp.logo_url, vp.tier, vp.is_profile_complete,
       u.email, u.is_active,
       ba.id AS assignment_id, ba.booth_id, b.booth_number,
       stw.opens_at AS tier_opens_at, sv.special_access_opens_at
     FROM vendor_profiles vp
     JOIN users u ON u.id = vp.user_id
     LEFT JOIN show_vendors sv ON sv.vendor_profile_id = vp.id AND sv.show_id = ?
     LEFT JOIN booth_assignments ba ON ba.vendor_profile_id = vp.id AND ba.show_id = ? AND ba.status = 'active'
     LEFT JOIN booths b ON b.id = ba.booth_id
     LEFT JOIN show_tier_windows stw ON stw.show_id = ? AND stw.tier = vp.tier
     WHERE u.is_active = TRUE AND (sv.status IS NULL OR sv.status <> 'excluded')
     ORDER BY FIELD(vp.tier, 'platinum', 'gold', 'silver', 'bronze'), vp.company_name ASC`,
    [showId, showId, showId]
  );
  return rows.map((row) => ({
    id: row.id,
    companyName: row.company_name,
    logoUrl: row.logo_url,
    tier: row.tier,
    isProfileComplete: Boolean(row.is_profile_complete),
    email: row.email,
    isActive: Boolean(row.is_active),
    currentAssignmentId: row.assignment_id,
    boothId: row.booth_id,
    boothNumber: row.booth_number,
    specialAccessOpensAt: formatDateTime(row.special_access_opens_at),
    effectiveOpensAt: formatDateTime(row.special_access_opens_at || row.tier_opens_at)
  }));
}

function restoreStatus(status) {
  return status && status !== 'assigned' ? status : 'available';
}

async function insertHistory(connection, entry) {
  await connection.execute(
    `INSERT INTO assignment_history
      (show_id, booth_id, vendor_profile_id, action, performed_by_user_id,
       previous_booth_id, new_booth_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.showId,
      entry.boothId,
      entry.vendorProfileId,
      entry.action,
      entry.performedByUserId,
      entry.previousBoothId,
      entry.newBoothId,
      entry.notes || null
    ]
  );
}

function conflictError(message, status = 409) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function toPublicAssignment(row) {
  return {
    id: row.id,
    showId: row.show_id,
    boothId: row.booth_id,
    vendorProfileId: row.vendor_profile_id,
    assignedByUserId: row.assigned_by_user_id,
    assignmentSource: row.assignment_source,
    status: row.status,
    previousBoothStatus: row.previous_booth_status,
    selectedAt: row.selected_at,
    confirmedAt: row.confirmed_at,
    releasedAt: row.released_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    showName: row.show_name,
    venueName: row.venue_name,
    startDate: formatDate(row.start_date),
    endDate: formatDate(row.end_date),
    timezone: row.timezone,
    booth: {
      id: row.booth_id,
      boothNumber: Number(row.booth_number),
      boothName: row.booth_name,
      boothType: row.booth_type,
      widthLabel: row.width_label,
      depthLabel: row.depth_label,
      price: row.price === null ? null : Number(row.price),
      notes: row.notes,
      status: row.booth_status
    },
    vendor: {
      id: row.vendor_profile_id,
      companyName: row.company_name,
      logoUrl: row.logo_url,
      tier: row.tier,
      isProfileComplete: Boolean(row.is_profile_complete)
    }
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
