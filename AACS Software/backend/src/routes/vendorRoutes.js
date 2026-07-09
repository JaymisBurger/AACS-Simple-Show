import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import { vendorLogoUpload } from '../middleware/uploadMiddleware.js';
import {
  getVendorDashboard,
  removeOwnVendorLogo,
  updateOwnVendorProfile,
  uploadOwnVendorLogo
} from '../controllers/vendorController.js';

const router = Router();

router.use(authenticate, authorizeRoles('vendor'));
router.get('/dashboard', getVendorDashboard);
router.patch('/profile', updateOwnVendorProfile);
router.post('/profile/logo', vendorLogoUpload.single('logo'), uploadOwnVendorLogo);
router.delete('/profile/logo', removeOwnVendorLogo);

export default router;
