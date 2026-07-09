import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import {
  bulkDelete,
  bulkUpdate,
  destroyBooth,
  duplicateBooth,
  getBooth,
  getBooths,
  locateBooth,
  nextBoothNumber,
  patchBooth,
  patchBoothStatus,
  renumber
} from '../controllers/boothController.js';

const router = Router();

router.use(authenticate, authorizeRoles('admin'));

router.get('/:showId/booths', getBooths);
router.get('/:showId/booths/next-number', nextBoothNumber);
router.post('/:showId/booths/bulk-update', bulkUpdate);
router.post('/:showId/booths/bulk-delete', bulkDelete);
router.post('/:showId/booths/renumber', renumber);
router.get('/:showId/booths/:boothId', getBooth);
router.patch('/:showId/booths/:boothId', patchBooth);
router.patch('/:showId/booths/:boothId/status', patchBoothStatus);
router.post('/:showId/booths/:boothId/duplicate', duplicateBooth);
router.delete('/:showId/booths/:boothId', destroyBooth);
router.get('/:showId/booths/:boothId/locate', locateBooth);

export default router;
