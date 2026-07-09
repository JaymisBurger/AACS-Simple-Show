import { pool } from '../config/db.js';

const boothSelect = `
  SELECT
    b.id, b.show_id, b.show_map_id, b.map_object_id, b.booth_number,
    b.booth_name, b.booth_type, b.status, b.width_label, b.depth_label,
    b.price, b.notes, b.is_featured, b.created_at, b.updated_at,
    mo.x_percent, mo.y_percent, mo.width_percent, mo.height_percent, mo.rotation, mo.z_index, mo.is_locked
  FROM booths b
  JOIN map_objects mo ON mo.id = b.map_object_id
`;

export async function listBooths(showId, filters = {}) {
  const where = ['b.show_id = ?'];
  const params = [showId];

  if (filters.status && filters.status !== 'all') {
    where.push('b.status = ?');
    params.push(filters.status);
  }

  if (filters.boothType && filters.boothType !== 'all') {
    where.push('b.booth_type = ?');
    params.push(filters.boothType);
  }

  if (filters.featured === 'featured') {
    where.push('b.is_featured = TRUE');
  } else if (filters.featured === 'not_featured') {
    where.push('b.is_featured = FALSE');
  }

  if (filters.search) {
    where.push('(CAST(b.booth_number AS CHAR) LIKE ? OR b.booth_name LIKE ?)');
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  const sortMap = {
    booth_number: 'b.booth_number ASC',
    price: 'b.price IS NULL, b.price ASC',
    status: 'b.status ASC, b.booth_number ASC',
    updated_at: 'b.updated_at DESC'
  };
  const sort = sortMap[filters.sort] || sortMap.booth_number;

  const [rows] = await pool.execute(
    `${boothSelect}
     WHERE ${where.join(' AND ')}
     ORDER BY ${sort}`,
    params
  );

  return rows.map(toPublicBooth);
}

export async function findBoothById(showId, boothId) {
  const [rows] = await pool.execute(`${boothSelect} WHERE b.show_id = ? AND b.id = ?`, [
    showId,
    boothId
  ]);
  return rows[0] ? toPublicBooth(rows[0]) : null;
}

export async function findBoothByMapObjectId(showId, mapObjectId, connection = pool) {
  const [rows] = await connection.execute(`${boothSelect} WHERE b.show_id = ? AND b.map_object_id = ?`, [
    showId,
    mapObjectId
  ]);
  return rows[0] ? toPublicBooth(rows[0]) : null;
}

export async function boothStats(showId) {
  const [rows] = await pool.execute(
    `SELECT
      COUNT(*) AS total,
      SUM(status = 'available') AS available,
      SUM(status = 'reserved') AS reserved,
      SUM(status = 'unavailable') AS unavailable,
      SUM(status = 'assigned') AS assigned,
      SUM(is_featured = TRUE) AS featured,
      COUNT(DISTINCT booth_number) AS unique_numbers,
      SUM(booth_number IS NULL OR booth_number < 1) AS invalid_numbers
     FROM booths
     WHERE show_id = ?`,
    [showId]
  );
  const row = rows[0] || {};
  const total = Number(row.total || 0);

  return {
    total,
    available: Number(row.available || 0),
    reserved: Number(row.reserved || 0),
    unavailable: Number(row.unavailable || 0),
    assigned: Number(row.assigned || 0),
    featured: Number(row.featured || 0),
    allNumbered: total > 0 && Number(row.unique_numbers || 0) === total && Number(row.invalid_numbers || 0) === 0
  };
}

export async function getNextBoothNumber(showId, connection = pool) {
  const [rows] = await connection.execute(
    `SELECT booth_number
     FROM booths
     WHERE show_id = ?
     ORDER BY booth_number ASC
     FOR UPDATE`,
    [showId]
  );
  const used = new Set(rows.map((row) => Number(row.booth_number)));
  let next = 1;
  while (used.has(next)) next += 1;
  return next;
}

export async function createBoothRecord(connection, showId, showMapId, mapObjectId, details = {}) {
  const boothNumber = await getNextBoothNumber(showId, connection);
  await connection.execute(
    `INSERT INTO booths
      (show_id, show_map_id, map_object_id, booth_number, booth_name, booth_type,
       status, width_label, depth_label, price, notes, is_featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      showId,
      showMapId,
      mapObjectId,
      boothNumber,
      details.boothName || null,
      details.boothType || 'standard',
      details.status || 'available',
      details.widthLabel || null,
      details.depthLabel || null,
      details.price ?? null,
      details.notes || null,
      Boolean(details.isFeatured)
    ]
  );
  return findBoothByMapObjectId(showId, mapObjectId, connection);
}

export async function updateBoothDetails(showId, boothId, details) {
  await pool.execute(
    `UPDATE booths
     SET booth_name = ?, booth_type = ?, status = ?, width_label = ?,
       depth_label = ?, price = ?, notes = ?, is_featured = ?
     WHERE show_id = ? AND id = ?`,
    [
      details.boothName,
      details.boothType,
      details.status,
      details.widthLabel,
      details.depthLabel,
      details.price,
      details.notes,
      details.isFeatured,
      showId,
      boothId
    ]
  );
  return findBoothById(showId, boothId);
}

export async function updateBoothDetailsForMapObject(connection, showId, mapObjectId, details = {}) {
  const [result] = await connection.execute(
    `UPDATE booths
     SET booth_name = ?, booth_type = ?, status = ?, width_label = ?,
       depth_label = ?, price = ?, notes = ?, is_featured = ?
     WHERE show_id = ? AND map_object_id = ?`,
    [
      details.boothName || null,
      details.boothType || 'standard',
      details.status || 'available',
      details.widthLabel || null,
      details.depthLabel || null,
      details.price ?? null,
      details.notes || null,
      Boolean(details.isFeatured),
      showId,
      mapObjectId
    ]
  );
  return result.affectedRows;
}

export async function updateBoothStatus(showId, boothId, status) {
  await pool.execute('UPDATE booths SET status = ? WHERE show_id = ? AND id = ?', [
    status,
    showId,
    boothId
  ]);
  return findBoothById(showId, boothId);
}

export async function bulkUpdateBooths(showId, boothIds, updates) {
  const fields = [];
  const params = [];

  if (updates.status) {
    fields.push('status = ?');
    params.push(updates.status);
  }
  if (updates.boothType) {
    fields.push('booth_type = ?');
    params.push(updates.boothType);
  }
  if (typeof updates.isFeatured === 'boolean') {
    fields.push('is_featured = ?');
    params.push(updates.isFeatured);
  }

  if (fields.length === 0 || boothIds.length === 0) return listBooths(showId);

  await pool.query(
    `UPDATE booths SET ${fields.join(', ')} WHERE show_id = ? AND id IN (?)`,
    [...params, showId, boothIds]
  );
  return listBooths(showId);
}

export async function deleteBooths(showId, boothIds) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      'SELECT map_object_id FROM booths WHERE show_id = ? AND id IN (?)',
      [showId, boothIds]
    );
    const mapObjectIds = rows.map((row) => row.map_object_id);
    if (mapObjectIds.length > 0) {
      await connection.query('DELETE FROM map_objects WHERE show_id = ? AND id IN (?)', [
        showId,
        mapObjectIds
      ]);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function renumberBooths(showId, orderedBoothIds, startingNumber) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const offset = 1000000;
    for (const boothId of orderedBoothIds) {
      await connection.execute('UPDATE booths SET booth_number = booth_number + ? WHERE show_id = ? AND id = ?', [
        offset,
        showId,
        boothId
      ]);
    }
    for (let index = 0; index < orderedBoothIds.length; index += 1) {
      await connection.execute('UPDATE booths SET booth_number = ? WHERE show_id = ? AND id = ?', [
        startingNumber + index,
        showId,
        orderedBoothIds[index]
      ]);
    }
    await connection.commit();
    return listBooths(showId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export function toPublicBooth(row) {
  return {
    id: row.id,
    showId: row.show_id,
    showMapId: row.show_map_id,
    mapObjectId: row.map_object_id,
    boothNumber: Number(row.booth_number),
    boothName: row.booth_name,
    boothType: row.booth_type,
    status: row.status,
    widthLabel: row.width_label,
    depthLabel: row.depth_label,
    price: row.price === null ? null : Number(row.price),
    notes: row.notes,
    isFeatured: Boolean(row.is_featured),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    mapObject: {
      xPercent: Number(row.x_percent),
      yPercent: Number(row.y_percent),
      widthPercent: Number(row.width_percent),
      heightPercent: Number(row.height_percent),
      rotation: Number(row.rotation),
      zIndex: Number(row.z_index),
      isLocked: Boolean(row.is_locked)
    }
  };
}
