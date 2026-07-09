import { comparePassword, hashPassword } from '../services/passwordService.js';
import { signToken } from '../services/tokenService.js';
import {
  findUserByActivationTokenHash,
  findUserById,
  findUserByEmail,
  findUserByResetTokenHash,
  toPublicUser,
  updateUserAccount
} from '../models/userModel.js';
import {
  findVendorProfileByUserId,
  toPublicVendorProfile
} from '../models/vendorProfileModel.js';
import { hashToken } from '../services/invitationService.js';

async function buildAuthPayload(user) {
  const publicUser = toPublicUser(user);
  const vendorProfile =
    user.role === 'vendor'
      ? toPublicVendorProfile(await findVendorProfileByUserId(user.id))
      : null;

  return { user: publicUser, vendorProfile };
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await findUserByEmail(email.toLowerCase());

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const passwordMatches = await comparePassword(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signToken(user);
    const payload = await buildAuthPayload(user);

    res.json({ token, ...payload });
  } catch (error) {
    next(error);
  }
}

export async function activateVendorAccount(req, res, next) {
  try {
    const user = await findUserByActivationTokenHash(hashToken(req.body.token || ''));
    if (!user || !user.activation_expires_at || new Date(user.activation_expires_at).getTime() < Date.now()) {
      return res.status(410).json({ message: 'Activation link is invalid or expired.' });
    }
    if (!req.body.password || req.body.password.length < 8) {
      return res.status(422).json({ message: 'Password must be at least 8 characters.' });
    }
    await updateUserAccount(user.id, {
      passwordHash: await hashPassword(req.body.password),
      isActive: true,
      requiresPasswordChange: false,
      activationTokenHash: null,
      activationExpiresAt: null
    });
    res.json({ message: 'Vendor account activated.' });
  } catch (error) {
    next(error);
  }
}

export async function resetPasswordWithToken(req, res, next) {
  try {
    const user = await findUserByResetTokenHash(hashToken(req.body.token || ''));
    if (!user || !user.reset_expires_at || new Date(user.reset_expires_at).getTime() < Date.now()) {
      return res.status(410).json({ message: 'Reset link is invalid or expired.' });
    }
    if (!req.body.password || req.body.password.length < 8) {
      return res.status(422).json({ message: 'Password must be at least 8 characters.' });
    }
    await updateUserAccount(user.id, {
      passwordHash: await hashPassword(req.body.password),
      requiresPasswordChange: false,
      resetTokenHash: null,
      resetExpiresAt: null
    });
    res.json({ message: 'Password reset.' });
  } catch (error) {
    next(error);
  }
}

export async function changeCurrentPassword(req, res, next) {
  try {
    if (!req.body.password || req.body.password.length < 8) {
      return res.status(422).json({ message: 'Password must be at least 8 characters.' });
    }
    await updateUserAccount(req.user.id, {
      passwordHash: await hashPassword(req.body.password),
      requiresPasswordChange: false
    });
    res.json({ message: 'Password changed.' });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentUser(req, res, next) {
  try {
    const user = await findUserById(req.user.id);

    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid or expired session.' });
    }

    const payload = await buildAuthPayload(user);
    res.json(payload);
  } catch (error) {
    next(error);
  }
}
