import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import { vendorLogoUpload } from '../middleware/uploadMiddleware.js';
import {
  assignVendor,
  bulkAssignVendors,
  deleteShowVendor,
  getShowVendors,
  getVendor,
  getVendors,
  patchShowVendor,
  patchVendor,
  patchVendorStatus,
  patchVendorTier,
  postVendor,
  removeVendorLogo,
  resetVendorPassword,
  uploadVendorLogo
} from '../controllers/adminVendorController.js';

const router = Router();

router.use(authenticate, authorizeRoles('admin'));

router.get('/vendors', getVendors);
router.post('/vendors', postVendor);
router.post('/vendors/bulk-assign', bulkAssignVendors);
router.get('/vendors/:vendorId', getVendor);
router.patch('/vendors/:vendorId', patchVendor);
router.patch('/vendors/:vendorId/tier', patchVendorTier);
router.patch('/vendors/:vendorId/status', patchVendorStatus);
router.post('/vendors/:vendorId/reset-password', resetVendorPassword);
router.post('/vendors/:vendorId/assign-show', assignVendor);
router.post('/vendors/:vendorId/logo', vendorLogoUpload.single('logo'), uploadVendorLogo);
router.delete('/vendors/:vendorId/logo', removeVendorLogo);
router.get('/shows/:showId/vendors', getShowVendors);
router.patch('/shows/:showId/vendors/:vendorId', patchShowVendor);
router.delete('/shows/:showId/vendors/:vendorId', deleteShowVendor);

export default router;
