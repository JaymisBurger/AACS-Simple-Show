import path from 'path';
import { env } from '../config/env.js';
import {
  archiveWarnings,
  disablePublicAccess,
  exportRows,
  findPublicSettingsByToken,
  getEventDayData,
  getPublicSettings,
  getPublicShowMap,
  getPublicVendorDirectory,
  regeneratePublicToken,
  updateCheckIn,
  updatePublicSettings
} from '../models/eventDayModel.js';
import { findMapByShowId } from '../models/mapModel.js';
import { findShowWithWindows } from '../models/showModel.js';

export async function adminGetPublicSettings(req, res, next) {
  try {
    res.json({ settings: await getPublicSettings(req.params.showId) });
  } catch (error) {
    next(error);
  }
}

export async function adminUpdatePublicSettings(req, res, next) {
  try {
    res.json({ settings: await updatePublicSettings(req.params.showId, normalizeSettings(req.body)) });
  } catch (error) {
    next(error);
  }
}

export async function adminRegeneratePublicToken(req, res, next) {
  try {
    res.json({ settings: await regeneratePublicToken(req.params.showId) });
  } catch (error) {
    next(error);
  }
}

export async function adminDisablePublicAccess(req, res, next) {
  try {
    res.json({ settings: await disablePublicAccess(req.params.showId) });
  } catch (error) {
    next(error);
  }
}

export async function adminEventDayData(req, res, next) {
  try {
    const show = await findShowWithWindows(req.params.showId);
    if (!show) return res.status(404).json({ message: 'Show not found.' });
    res.json({ show, ...(await getEventDayData(req.params.showId)) });
  } catch (error) {
    next(error);
  }
}

export async function adminUpdateCheckIn(req, res, next) {
  try {
    const vendorProfileId = Number(req.params.vendorProfileId);
    if (!Number.isInteger(vendorProfileId) || vendorProfileId <= 0) return res.status(400).json({ message: 'Vendor is required.' });
    const checkIns = await updateCheckIn(req.params.showId, vendorProfileId, Boolean(req.body.checkedIn), req.user.id);
    res.json({ checkIns });
  } catch (error) {
    next(error);
  }
}

export async function adminExportCsv(req, res, next) {
  try {
    const type = req.params.type;
    const { show, rows } = await exportRows(req.params.showId, type);
    const csv = toCsv(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${slug(show.name)}-${type}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

export async function adminArchiveWarnings(req, res, next) {
  try {
    res.json({ warnings: await archiveWarnings(req.params.showId) });
  } catch (error) {
    next(error);
  }
}

export async function publicShowMap(req, res, next) {
  try {
    const data = await getPublicShowMap(req.params.token);
    if (!data) return res.status(404).json({ message: 'Public map is not available.' });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function publicShowMapImage(req, res, next) {
  try {
    const settings = await findPublicSettingsByToken(req.params.token);
    if (!settings?.publicMapEnabled) return res.status(404).json({ message: 'Public map is not available.' });
    const map = await findMapByShowId(settings.showId);
    if (!map) return res.status(404).json({ message: 'Floor map not found.' });
    res.sendFile(path.join(env.uploadDir, path.basename(map.imageUrl)));
  } catch (error) {
    next(error);
  }
}

export async function publicVendorDirectory(req, res, next) {
  try {
    const data = await getPublicVendorDirectory(req.params.token);
    if (!data) return res.status(404).json({ message: 'Public vendor directory is not available.' });
    res.json(data);
  } catch (error) {
    next(error);
  }
}

function normalizeSettings(body) {
  return {
    publicMapEnabled: Boolean(body.publicMapEnabled),
    publicDirectoryEnabled: Boolean(body.publicDirectoryEnabled),
    publicViewExpiresAt: body.publicViewExpiresAt || null,
    displayOptions: body.displayOptions || {}
  };
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvCell(row[header])).join(','));
  }
  return lines.join('\n');
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function slug(value) {
  return String(value || 'show').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
