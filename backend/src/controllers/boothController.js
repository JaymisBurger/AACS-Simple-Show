import {
  boothStats,
  bulkUpdateBooths,
  deleteBooths,
  findBoothById,
  getNextBoothNumber,
  listBooths,
  renumberBooths,
  updateBoothDetails,
  updateBoothStatus
} from '../models/boothModel.js';
import { createMapObject, findMapByShowId, findMapObjectById } from '../models/mapModel.js';
import { findShowWithWindows } from '../models/showModel.js';
import { findActiveAssignmentForBooth } from '../models/assignmentModel.js';
import { boothStatuses, boothTypes, normalizeBoothInput, validateBoothDetails } from '../services/boothValidationService.js';

export async function getBooths(req, res, next) {
  try {
    await requireShow(req.params.showId);
    const booths = await listBooths(req.params.showId, {
      search: req.query.search?.trim() || '',
      status: req.query.status || 'all',
      boothType: req.query.boothType || 'all',
      featured: req.query.featured || 'all',
      sort: req.query.sort || 'booth_number'
    });
    const stats = await boothStats(req.params.showId);
    res.json({ booths, stats });
  } catch (error) {
    next(error);
  }
}

export async function getBooth(req, res, next) {
  try {
    const booth = await requireBooth(req.params.showId, req.params.boothId);
    res.json({ booth });
  } catch (error) {
    next(error);
  }
}

export async function patchBooth(req, res, next) {
  try {
    const booth = await requireBooth(req.params.showId, req.params.boothId);
    const details = normalizeBoothInput({ ...booth, ...req.body });
    const validation = validateBoothDetails(details);
    if (!validation.isValid) return validationResponse(res, validation);

    const updatedBooth = await updateBoothDetails(req.params.showId, req.params.boothId, details);
    res.json({ booth: updatedBooth });
  } catch (error) {
    next(error);
  }
}

export async function patchBoothStatus(req, res, next) {
  try {
    if (!boothStatuses.includes(req.body.status)) {
      return res.status(422).json({ message: 'Please resolve booth issues.', errors: { status: ['Booth status is not supported.'] } });
    }
    const activeAssignment = await findActiveAssignmentForBooth(req.params.showId, req.params.boothId);
    if (activeAssignment && req.body.status !== 'assigned') {
      return res.status(409).json({ message: 'Release or move the active assignment before changing this booth status.' });
    }
    await requireBooth(req.params.showId, req.params.boothId);
    const booth = await updateBoothStatus(req.params.showId, req.params.boothId, req.body.status);
    res.json({ booth });
  } catch (error) {
    next(error);
  }
}

export async function duplicateBooth(req, res, next) {
  try {
    const sourceBooth = await requireBooth(req.params.showId, req.params.boothId);
    const map = await findMapByShowId(req.params.showId);
    const sourceObject = await findMapObjectById(req.params.showId, sourceBooth.showMapId, sourceBooth.mapObjectId);
    const object = {
      ...sourceObject,
      id: undefined,
      xPercent: Math.min(sourceObject.xPercent + 2, 100 - sourceObject.widthPercent),
      yPercent: Math.min(sourceObject.yPercent + 2, 100 - sourceObject.heightPercent),
      zIndex: sourceObject.zIndex + 1,
      booth: {
        boothType: sourceBooth.boothType,
        widthLabel: sourceBooth.widthLabel,
        depthLabel: sourceBooth.depthLabel,
        price: sourceBooth.price,
        notes: sourceBooth.notes,
        isFeatured: sourceBooth.isFeatured,
        status: 'available'
      }
    };
    const createdObject = await createMapObject(req.params.showId, map.id, object);
    res.status(201).json({ object: createdObject, booth: createdObject.booth });
  } catch (error) {
    next(error);
  }
}

export async function destroyBooth(req, res, next) {
  try {
    await requireBooth(req.params.showId, req.params.boothId);
    await deleteBooths(req.params.showId, [Number(req.params.boothId)]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function bulkUpdate(req, res, next) {
  try {
    const boothIds = normalizeIds(req.body.boothIds);
    const updates = {};
    if (req.body.status) updates.status = req.body.status;
    if (req.body.boothType) updates.boothType = req.body.boothType;
    if (typeof req.body.isFeatured === 'boolean') updates.isFeatured = req.body.isFeatured;

    if (updates.status && !boothStatuses.includes(updates.status)) {
      return res.status(422).json({ message: 'Invalid booth status.' });
    }
    if (updates.boothType && !boothTypes.includes(updates.boothType)) {
      return res.status(422).json({ message: 'Invalid booth type.' });
    }

    const booths = await bulkUpdateBooths(req.params.showId, boothIds, updates);
    res.json({ booths });
  } catch (error) {
    next(error);
  }
}

export async function bulkDelete(req, res, next) {
  try {
    await deleteBooths(req.params.showId, normalizeIds(req.body.boothIds));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function nextBoothNumber(req, res, next) {
  try {
    const boothNumber = await getNextBoothNumber(req.params.showId);
    res.json({ boothNumber });
  } catch (error) {
    next(error);
  }
}

export async function locateBooth(req, res, next) {
  try {
    const booth = await requireBooth(req.params.showId, req.params.boothId);
    res.json({ booth, editorPath: `/admin/shows/${req.params.showId}/floor-map/editor?boothId=${booth.id}` });
  } catch (error) {
    next(error);
  }
}

export async function renumber(req, res, next) {
  try {
    const startingNumber = Math.max(1, Number(req.body.startingNumber || 1));
    const direction = req.body.direction || 'left_to_right';
    const booths = await listBooths(req.params.showId);
    const ordered = orderBooths(booths, direction);

    if (req.body.previewOnly) {
      return res.json({
        preview: ordered.map((booth, index) => ({
          boothId: booth.id,
          existingNumber: booth.boothNumber,
          proposedNumber: startingNumber + index
        }))
      });
    }

    const updatedBooths = await renumberBooths(
      req.params.showId,
      ordered.map((booth) => booth.id),
      startingNumber
    );
    res.json({ booths: updatedBooths });
  } catch (error) {
    next(error);
  }
}

async function requireShow(showId) {
  const show = await findShowWithWindows(showId);
  if (!show) {
    const error = new Error('Show not found.');
    error.status = 404;
    throw error;
  }
  return show;
}

async function requireBooth(showId, boothId) {
  const booth = await findBoothById(showId, boothId);
  if (!booth) {
    const error = new Error('Booth not found.');
    error.status = 404;
    throw error;
  }
  return booth;
}

function validationResponse(res, validation) {
  return res.status(422).json({ message: 'Please resolve booth issues.', errors: validation.errors });
}

function normalizeIds(ids = []) {
  return Array.isArray(ids) ? ids.map(Number).filter(Number.isFinite) : [];
}

function orderBooths(booths, direction) {
  return [...booths].sort((a, b) => {
    const ax = a.mapObject.xPercent;
    const ay = a.mapObject.yPercent;
    const bx = b.mapObject.xPercent;
    const by = b.mapObject.yPercent;
    if (direction === 'right_to_left') return bx - ax || ay - by;
    if (direction === 'top_to_bottom') return ay - by || ax - bx;
    if (direction === 'bottom_to_top') return by - ay || ax - bx;
    return ax - bx || ay - by;
  });
}
