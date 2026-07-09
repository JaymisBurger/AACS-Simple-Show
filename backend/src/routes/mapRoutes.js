import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import { floorMapUpload } from '../middleware/uploadMiddleware.js';
import {
  bulkSaveObjects,
  deleteShowFloorMap,
  destroyMapObject,
  duplicateMapObject,
  getFloorMapImage,
  getMapObjects,
  getShowFloorMap,
  patchMapObject,
  postMapObject,
  reorderObjects,
  uploadShowFloorMap
} from '../controllers/mapController.js';

const router = Router();

router.use(authenticate, authorizeRoles('admin'));

router.get('/:showId/floor-map', getShowFloorMap);
router.post('/:showId/floor-map', floorMapUpload.single('floorMap'), uploadShowFloorMap);
router.delete('/:showId/floor-map', deleteShowFloorMap);
router.get('/:showId/floor-map/image', getFloorMapImage);

router.get('/:showId/floor-map/objects', getMapObjects);
router.post('/:showId/floor-map/objects', postMapObject);
router.patch('/:showId/floor-map/objects/:objectId', patchMapObject);
router.delete('/:showId/floor-map/objects/:objectId', destroyMapObject);
router.post('/:showId/floor-map/objects/:objectId/duplicate', duplicateMapObject);
router.put('/:showId/floor-map/objects/bulk', bulkSaveObjects);
router.put('/:showId/floor-map/objects/reorder', reorderObjects);

export default router;
