import { body } from 'express-validator';
import { Router } from 'express';
import {
  activateVendorAccount,
  changeCurrentPassword,
  getCurrentUser,
  login,
  resetPasswordWithToken
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validateRequest.js';

const router = Router();

router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Enter a valid email address.'),
    body('password').isString().notEmpty().withMessage('Password is required.')
  ],
  validateRequest,
  login
);

router.get('/me', authenticate, getCurrentUser);
router.post('/activate-vendor', activateVendorAccount);
router.post('/reset-password', resetPasswordWithToken);
router.post('/change-password', authenticate, changeCurrentPassword);

export default router;
