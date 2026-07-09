import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import { vendorHelp } from '../controllers/opsController.js';

const router = Router();

router.get('/help', authenticate, authorizeRoles('vendor'), vendorHelp);

export default router;
