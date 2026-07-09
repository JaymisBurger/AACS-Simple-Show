import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import {
  archiveShow,
  closeShow,
  destroyShow,
  getShow,
  getShows,
  patchShow,
  postShow,
  publishShow,
  putTierWindows,
  restoreShow
} from '../controllers/showController.js';

const router = Router();

router.use(authenticate, authorizeRoles('admin'));

router.get('/', getShows);
router.post('/', postShow);
router.get('/:id', getShow);
router.patch('/:id', patchShow);
router.delete('/:id', destroyShow);
router.post('/:id/tier-windows', putTierWindows);
router.put('/:id/tier-windows', putTierWindows);
router.post('/:id/publish', publishShow);
router.post('/:id/close', closeShow);
router.post('/:id/archive', archiveShow);
router.post('/:id/restore', restoreShow);

export default router;
