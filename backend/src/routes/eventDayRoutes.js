import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import {
  adminArchiveWarnings,
  adminDisablePublicAccess,
  adminEventDayData,
  adminExportCsv,
  adminGetPublicSettings,
  adminRegeneratePublicToken,
  adminUpdateCheckIn,
  adminUpdatePublicSettings
} from '../controllers/eventDayController.js';

const router = Router();

router.use(authenticate, authorizeRoles('admin'));

router.get('/shows/:showId/public-settings', adminGetPublicSettings);
router.patch('/shows/:showId/public-settings', adminUpdatePublicSettings);
router.post('/shows/:showId/public-settings/regenerate-token', adminRegeneratePublicToken);
router.post('/shows/:showId/public-settings/disable', adminDisablePublicAccess);
router.get('/shows/:showId/event-day', adminEventDayData);
router.patch('/shows/:showId/event-day/vendors/:vendorProfileId/check-in', adminUpdateCheckIn);
router.get('/shows/:showId/exports/:type.csv', adminExportCsv);
router.get('/shows/:showId/archive-warnings', adminArchiveWarnings);

export default router;
