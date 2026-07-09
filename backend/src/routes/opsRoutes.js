import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import {
  adminHelp,
  exportQa,
  migrationStatus,
  notifications,
  patchQaItem,
  qaChecklist,
  releaseNotes,
  resetQa,
  search,
  setupStatus
} from '../controllers/opsController.js';

const router = Router();

router.use(authenticate, authorizeRoles('admin'));

router.get('/qa-checklist', qaChecklist);
router.patch('/qa-checklist/:itemKey', patchQaItem);
router.post('/qa-checklist/reset', resetQa);
router.get('/qa-checklist/export.csv', exportQa);
router.get('/setup-status', setupStatus);
router.get('/migration-status', migrationStatus);
router.get('/release-notes', releaseNotes);
router.get('/search', search);
router.get('/notifications', notifications);
router.get('/help', adminHelp);

export default router;
