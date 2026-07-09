import { Router } from 'express';
import { getAdminDashboard, getVendorDashboard } from '../controllers/dashboardController.js';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/admin', authenticate, authorizeRoles('admin'), getAdminDashboard);
router.get('/vendor', authenticate, authorizeRoles('vendor'), getVendorDashboard);

export default router;
