import { pool } from '../config/db.js';
import { createBoothRecord, updateBoothDetailsForMapObject } from './boothModel.js';

export async function findMapByShowId(showId) {
  const [rows] = await pool.execute(
    `SELECT id, show_id, image_url, original_filename, mime_type, file_size,
       image_width, image_height, created_at, updated_at
     FROM show_maps
     WHERE show_id = ?`,
    [showId]
  );

  return rows[0] ? toPublicMap(rows[0]) : null;
}

export async function createShowMap(showId, fileInfo) {
  const [result] = await pool.execute(
    `INSERT INTO show_maps
      (show_id, image_url, original_filename, mime_type, file_size, image_width, image_height)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      showId,
      fileInfo.imageUrl,
      fileInfo.originalFilename,
      fileInfo.mimeType,
      fileInfo.fileSize,
      fileInfo.imageWidth,
      fileInfo.imageHeight
    ]
  );

  return findMapById(result.insertId);
}

export async function replaceShowMap(showId, fileInfo) {
  await pool.execute(
    `UPDATE show_maps
     SET image_url = ?, original_filename = ?, mime_type = ?, file_size = ?,
       image_width = ?, image_height = ?
     WHERE show_id = ?`,
    [
      fileInfo.imageUrl,
      fileInfo.originalFilename,
      fileInfo.mimeType,
      fileInfo.fileSize,
      fileInfo.imageWidth,
      fileInfo.imageHeight,
      showId
    ]
  );

  return findMapByShowId(showId);
}

export async function deleteShowMap(showId) {
  const [result] = await pool.execute('DELETE FROM show_maps WHERE show_id = ?', [showId]);
  return result.affectedRows > 0;
}

export async function findMapById(id) {
  const [rows] = await pool.execute(
    `SELECT id, show_id, image_url, original_filename, mime_type, file_size,
       image_width, image_height, created_at, updated_at
     FROM show_maps
     WHERE id = ?`,
    [id]
  );

  return rows[0] ? toPublicMap(rows[0]) : null;
}

export async function countObjectsForMap(showMapId) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS object_count FROM map_objects WHERE show_map_id = ?',
    [showMapId]
  );
  return Number(rows[0]?.object_count || 0);
}

export async function countBoothsForShow(showId) {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS booth_count FROM booths WHERE show_id = ?',
    [showId]
  );
  return Number(rows[0]?.booth_count || 0);
}

export async function listMapObjects(showId, showMapId) {
  const [rows] = await pool.execute(
    `${mapObjectSelect()}
     WHERE mo.show_id = ? AND mo.show_map_id = ?
     ORDER BY mo.z_index ASC, mo.id ASC`,
    [showId, showMapId]
  );

  return rows.map(toPublicObject);
}

export async function findMapObjectById(showId, showMapId, objectId) {
  const [rows] = await pool.execute(
    `${mapObjectSelect()}
     WHERE mo.show_id = ? AND mo.show_map_id = ? AND mo.id = ?`,
    [showId, showMapId, objectId]
  );

  return rows[0] ? toPublicObject(rows[0]) : null;
}

export async function createMapObject(showId, showMapId, object) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO map_objects
        (show_id, show_map_id, object_type, label, x_percent, y_percent,
         width_percent, height_percent, rotation, z_index, is_locked, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      objectParams(showId, showMapId, object)
    );

    if (object.objectType === 'booth') {
      const details = object.booth || {};
      await createBoothRecord(connection, showId, showMapId, result.insertId, details);
    }

    await connection.commit();
    return findMapObjectById(showId, showMapId, result.insertId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateMapObject(showId, showMapId, objectId, object) {
  await pool.execute(
    `UPDATE map_objects
     SET object_type = ?, label = ?, x_percent = ?, y_percent = ?,
       width_percent = ?, height_percent = ?, rotation = ?, z_index = ?,
       is_locked = ?, metadata_json = ?
     WHERE show_id = ? AND show_map_id = ? AND id = ?`,
    [
      object.objectType,
      object.label,
      object.xPercent,
      object.yPercent,
      object.widthPercent,
      object.heightPercent,
      object.rotation,
      object.zIndex,
      object.isLocked,
      JSON.stringify(object.metadataJson || {}),
      showId,
      showMapId,
      objectId
    ]
  );

  return findMapObjectById(showId, showMapId, objectId);
}

export async function deleteMapObject(showId, showMapId, objectId) {
  const [result] = await pool.execute(
    'DELETE FROM map_objects WHERE show_id = ? AND show_map_id = ? AND id = ?',
    [showId, showMapId, objectId]
  );
  return result.affectedRows > 0;
}

export async function deleteObjectsForMap(showId, showMapId) {
  await pool.execute('DELETE FROM map_objects WHERE show_id = ? AND show_map_id = ?', [
    showId,
    showMapId
  ]);
}

export async function bulkSaveMapObjects(showId, showMapId, objects) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const existingIds = objects
      .filter((object) => object.id)
      .map((object) => Number(object.id));

    if (existingIds.length > 0) {
      await connection.query(
        `DELETE FROM map_objects
         WHERE show_id = ? AND show_map_id = ? AND id NOT IN (?)`,
        [showId, showMapId, existingIds]
      );
    } else {
      await connection.execute('DELETE FROM map_objects WHERE show_id = ? AND show_map_id = ?', [
        showId,
        showMapId
      ]);
    }

    for (const object of objects) {
      if (object.id) {
        const [updateResult] = await connection.execute(
          `UPDATE map_objects
           SET object_type = ?, label = ?, x_percent = ?, y_percent = ?,
             width_percent = ?, height_percent = ?, rotation = ?, z_index = ?,
             is_locked = ?, metadata_json = ?
           WHERE show_id = ? AND show_map_id = ? AND id = ?`,
          [
            object.objectType,
            object.label,
            object.xPercent,
            object.yPercent,
            object.widthPercent,
            object.heightPercent,
            object.rotation,
            object.zIndex,
            object.isLocked,
            JSON.stringify(object.metadataJson || {}),
            showId,
            showMapId,
            object.id
          ]
        );

        if (updateResult.affectedRows === 0) {
          const [insertResult] = await connection.execute(
            `INSERT INTO map_objects
              (show_id, show_map_id, object_type, label, x_percent, y_percent,
               width_percent, height_percent, rotation, z_index, is_locked, metadata_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            objectParams(showId, showMapId, object)
          );
          if (object.objectType === 'booth') {
            await createBoothRecord(connection, showId, showMapId, insertResult.insertId, object.booth || {});
          }
        } else if (object.objectType === 'booth') {
          const boothRows = await updateBoothDetailsForMapObject(connection, showId, object.id, object.booth || {});
          if (boothRows === 0) {
            await createBoothRecord(connection, showId, showMapId, object.id, object.booth || {});
          }
        }
      } else {
        const [insertResult] = await connection.execute(
          `INSERT INTO map_objects
            (show_id, show_map_id, object_type, label, x_percent, y_percent,
             width_percent, height_percent, rotation, z_index, is_locked, metadata_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          objectParams(showId, showMapId, object)
        );
        if (object.objectType === 'booth') {
          await createBoothRecord(connection, showId, showMapId, insertResult.insertId, object.booth || {});
        }
      }
    }

    await connection.commit();
    return listMapObjects(showId, showMapId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

function objectParams(showId, showMapId, object) {
  return [
    showId,
    showMapId,
    object.objectType,
    object.label,
    object.xPercent,
    object.yPercent,
    object.widthPercent,
    object.heightPercent,
    object.rotation,
    object.zIndex,
    object.isLocked,
    JSON.stringify(object.metadataJson || {})
  ];
}

function mapObjectSelect() {
  return `SELECT
    mo.id, mo.show_id, mo.show_map_id, mo.object_type, mo.label,
    mo.x_percent, mo.y_percent, mo.width_percent, mo.height_percent,
    mo.rotation, mo.z_index, mo.is_locked, mo.metadata_json,
    mo.created_at, mo.updated_at,
    b.id AS booth_id, b.booth_number, b.booth_name, b.booth_type,
    b.status AS booth_status, b.width_label, b.depth_label, b.price,
    b.notes AS booth_notes, b.is_featured, b.updated_at AS booth_updated_at
   FROM map_objects mo
   LEFT JOIN booths b ON b.map_object_id = mo.id`;
}

export function toPublicMap(row) {
  return {
    id: row.id,
    showId: row.show_id,
    imageUrl: row.image_url,
    originalFilename: row.original_filename,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size),
    imageWidth: row.image_width,
    imageHeight: row.image_height,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toPublicObject(row) {
  return {
    id: row.id,
    showId: row.show_id,
    showMapId: row.show_map_id,
    objectType: row.object_type,
    label: row.label,
    xPercent: Number(row.x_percent),
    yPercent: Number(row.y_percent),
    widthPercent: Number(row.width_percent),
    heightPercent: Number(row.height_percent),
    rotation: Number(row.rotation),
    zIndex: Number(row.z_index),
    isLocked: Boolean(row.is_locked),
    metadataJson: parseMetadata(row.metadata_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    booth: row.booth_id
      ? {
          id: row.booth_id,
          boothNumber: Number(row.booth_number),
          boothName: row.booth_name,
          boothType: row.booth_type,
          status: row.booth_status,
          widthLabel: row.width_label,
          depthLabel: row.depth_label,
          price: row.price === null ? null : Number(row.price),
          notes: row.booth_notes,
          isFeatured: Boolean(row.is_featured),
          updatedAt: row.booth_updated_at
        }
      : null
  };
}

function parseMetadata(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
}
