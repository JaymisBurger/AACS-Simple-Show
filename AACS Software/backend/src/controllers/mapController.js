import path from 'path';
import {
  bulkSaveMapObjects,
  countObjectsForMap,
  countBoothsForShow,
  createMapObject,
  createShowMap,
  deleteMapObject,
  deleteObjectsForMap,
  deleteShowMap,
  findMapByShowId,
  findMapObjectById,
  listMapObjects,
  replaceShowMap,
  updateMapObject
} from '../models/mapModel.js';
import { findShowWithWindows } from '../models/showModel.js';
import {
  normalizeMapObjectInput,
  validateMapObject
} from '../services/mapObjectValidationService.js';
import { deleteFloorMapFile, saveFloorMapFile } from '../services/uploadStorageService.js';
import { env } from '../config/env.js';

export async function getShowFloorMap(req, res, next) {
  try {
    const show = await requireShow(req.params.showId);
    const map = await findMapByShowId(show.id);
    const objectCount = map ? await countObjectsForMap(map.id) : 0;
    const boothCount = await countBoothsForShow(show.id);

    res.json({ show, map, objectCount, boothCount });
  } catch (error) {
    next(error);
  }
}

export async function uploadShowFloorMap(req, res, next) {
  try {
    const show = await requireShow(req.params.showId);

    if (!req.file) {
      return res.status(400).json({ message: 'Choose a floor-map image to upload.' });
    }

    const existingMap = await findMapByShowId(show.id);
    const keepObjects = String(req.body.keepObjects || 'false') === 'true';
    const savedFile = await saveFloorMapFile(req.file);
    const fileInfo = {
      ...savedFile,
      originalFilename: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size
    };

    let map;
    if (existingMap) {
      map = await replaceShowMap(show.id, fileInfo);
      await deleteFloorMapFile(existingMap.imageUrl);
      if (!keepObjects) {
        await deleteObjectsForMap(show.id, existingMap.id);
      }
    } else {
      map = await createShowMap(show.id, fileInfo);
    }

    const objectCount = await countObjectsForMap(map.id);
    const boothCount = await countBoothsForShow(show.id);
    res.status(existingMap ? 200 : 201).json({ show, map, objectCount, boothCount });
  } catch (error) {
    next(error);
  }
}

export async function deleteShowFloorMap(req, res, next) {
  try {
    const show = await requireShow(req.params.showId);

    if (show.status !== 'draft') {
      return res.status(409).json({ message: 'Floor maps can only be deleted while the show is a draft.' });
    }

    const map = await requireMap(show.id);
    await deleteShowMap(show.id);
    await deleteFloorMapFile(map.imageUrl);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getFloorMapImage(req, res, next) {
  try {
    const show = await requireShow(req.params.showId);
    const map = await requireMap(show.id);
    const filename = path.basename(map.imageUrl);
    res.sendFile(path.join(env.uploadDir, filename));
  } catch (error) {
    next(error);
  }
}

export async function getMapObjects(req, res, next) {
  try {
    const { show, map } = await requireShowAndMap(req.params.showId);
    const objects = await listMapObjects(show.id, map.id);
    res.json({ show, map, objects });
  } catch (error) {
    next(error);
  }
}

export async function postMapObject(req, res, next) {
  try {
    const { show, map } = await requireShowAndMap(req.params.showId);
    const object = normalizeMapObjectInput(req.body);
    const validation = validateMapObject(object);

    if (!validation.isValid) return validationResponse(res, validation);

    const createdObject = await createMapObject(show.id, map.id, object);
    res.status(201).json({ object: createdObject });
  } catch (error) {
    next(error);
  }
}

export async function patchMapObject(req, res, next) {
  try {
    const { show, map } = await requireShowAndMap(req.params.showId);
    await requireObject(show.id, map.id, req.params.objectId);

    const object = normalizeMapObjectInput({ ...req.body, id: req.params.objectId });
    const validation = validateMapObject(object);

    if (!validation.isValid) return validationResponse(res, validation);

    const updatedObject = await updateMapObject(show.id, map.id, req.params.objectId, object);
    res.json({ object: updatedObject });
  } catch (error) {
    next(error);
  }
}

export async function destroyMapObject(req, res, next) {
  try {
    const { show, map } = await requireShowAndMap(req.params.showId);
    await requireObject(show.id, map.id, req.params.objectId);
    await deleteMapObject(show.id, map.id, req.params.objectId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function duplicateMapObject(req, res, next) {
  try {
    const { show, map } = await requireShowAndMap(req.params.showId);
    const object = await requireObject(show.id, map.id, req.params.objectId);
    const copy = {
      ...object,
      id: undefined,
      label: object.label ? `${object.label} Copy` : null,
      xPercent: Math.min(object.xPercent + 2, 100 - object.widthPercent),
      yPercent: Math.min(object.yPercent + 2, 100 - object.heightPercent),
      zIndex: object.zIndex + 1
    };

    const createdObject = await createMapObject(show.id, map.id, copy);
    res.status(201).json({ object: createdObject });
  } catch (error) {
    next(error);
  }
}

export async function bulkSaveObjects(req, res, next) {
  try {
    const { show, map } = await requireShowAndMap(req.params.showId);
    const objects = Array.isArray(req.body.objects) ? req.body.objects : [];
    const normalizedObjects = objects.map(normalizeMapObjectInput);
    const errors = {};

    normalizedObjects.forEach((object, index) => {
      const validation = validateMapObject(object);
      if (!validation.isValid) errors[index] = validation.errors;
    });

    if (Object.keys(errors).length > 0) {
      return res.status(422).json({ message: 'Please resolve map object issues.', errors });
    }

    const savedObjects = await bulkSaveMapObjects(show.id, map.id, normalizedObjects);
    res.json({ objects: savedObjects });
  } catch (error) {
    next(error);
  }
}

export async function reorderObjects(req, res, next) {
  try {
    const { show, map } = await requireShowAndMap(req.params.showId);
    const objects = await listMapObjects(show.id, map.id);
    const order = Array.isArray(req.body.order) ? req.body.order.map(Number) : [];
    const objectById = new Map(objects.map((object) => [Number(object.id), object]));
    const reordered = order
      .filter((id) => objectById.has(id))
      .map((id, index) => ({ ...objectById.get(id), zIndex: index }));

    const savedObjects = await bulkSaveMapObjects(show.id, map.id, reordered);
    res.json({ objects: savedObjects });
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

async function requireMap(showId) {
  const map = await findMapByShowId(showId);

  if (!map) {
    const error = new Error('Floor map not found.');
    error.status = 404;
    throw error;
  }

  return map;
}

async function requireShowAndMap(showId) {
  const show = await requireShow(showId);
  const map = await requireMap(show.id);
  return { show, map };
}

async function requireObject(showId, showMapId, objectId) {
  const object = await findMapObjectById(showId, showMapId, objectId);

  if (!object) {
    const error = new Error('Map object not found.');
    error.status = 404;
    throw error;
  }

  return object;
}

function validationResponse(res, validation) {
  return res.status(422).json({
    message: 'Please resolve map object issues.',
    errors: validation.errors
  });
}
