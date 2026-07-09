import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import {
  getCommunicationHistory,
  getReadinessSummary,
  getTierReadinessStats,
  getVendorReadiness,
  markCommunicationCopied,
  markCommunicationSentExternally,
  previewCommunication,
  saveCommunicationDraft
} from '../controllers/readinessController.js';

const router = Router();

router.use(authenticate, authorizeRoles('admin'));

router.get('/shows/:showId/readiness', getReadinessSummary);
router.get('/shows/:showId/readiness/vendors', getVendorReadiness);
router.get('/shows/:showId/readiness/tiers', getTierReadinessStats);
router.post('/shows/:showId/communications/preview', previewCommunication);
router.post('/shows/:showId/communications', saveCommunicationDraft);
router.get('/shows/:showId/communications', getCommunicationHistory);
router.patch('/communications/:communicationId/copied', markCommunicationCopied);
router.patch('/communications/:communicationId/sent-externally', markCommunicationSentExternally);

export default router;
