import { findUserByEmail, findUserById, toPublicUser, updateUserAccount } from '../models/userModel.js';
import {
  findVendorProfileByUserId,
  listVendorAccessibleShows,
  listVendorShowActivity,
  toPublicVendorProfile,
  updateVendorLogo,
  updateVendorProfile
} from '../models/vendorProfileModel.js';
import { normalizeVendorProfileInput, validateVendorProfile } from '../services/vendorValidationService.js';
import { deleteUploadedFile, saveVendorLogoFile } from '../services/uploadStorageService.js';

export async function getVendorDashboard(req, res, next) {
  try {
    const user = await findUserById(req.user.id);
    const profile = await findVendorProfileByUserId(req.user.id);
    const [assignments, showActivity] = profile
      ? await Promise.all([listVendorAccessibleShows(profile.id), listVendorShowActivity(profile.id)])
      : [[], []];
    res.json({
      user: toPublicUser(user),
      vendorProfile: toPublicVendorProfile(profile, assignments, showActivity)
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOwnVendorProfile(req, res, next) {
  try {
    const profile = await requireOwnProfile(req.user.id);
    const nextProfile = normalizeVendorProfileInput(req.body);
    const validation = validateVendorProfile(nextProfile);
    if (!validation.isValid) {
      return res.status(422).json({ message: 'Please resolve profile issues.', errors: validation.errors });
    }
    const nextEmail = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : profile.email;
    if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      return res.status(422).json({ message: 'Please resolve profile issues.', errors: { email: ['Enter a valid email address.'] } });
    }
    if (nextEmail !== profile.email) {
      const existing = await findUserByEmail(nextEmail);
      if (existing && Number(existing.id) !== Number(profile.user_id)) {
        return res.status(409).json({ message: 'A user with that email already exists.', errors: { email: ['Email is already in use.'] } });
      }
      await updateUserAccount(profile.user_id, { email: nextEmail });
    }
    const vendorProfile = await updateVendorProfile(profile.id, nextProfile);
    res.json({ vendorProfile });
  } catch (error) {
    next(error);
  }
}

export async function uploadOwnVendorLogo(req, res, next) {
  try {
    const profile = await requireOwnProfile(req.user.id);
    if (!req.file) return res.status(400).json({ message: 'Choose a logo to upload.' });
    const saved = await saveVendorLogoFile(req.file);
    const vendorProfile = await updateVendorLogo(profile.id, saved.imageUrl);
    if (profile.logo_url) await deleteUploadedFile(profile.logo_url);
    res.json({ vendorProfile });
  } catch (error) {
    next(error);
  }
}

export async function removeOwnVendorLogo(req, res, next) {
  try {
    const profile = await requireOwnProfile(req.user.id);
    const vendorProfile = await updateVendorLogo(profile.id, null);
    if (profile.logo_url) await deleteUploadedFile(profile.logo_url);
    res.json({ vendorProfile });
  } catch (error) {
    next(error);
  }
}

async function requireOwnProfile(userId) {
  const profile = await findVendorProfileByUserId(userId);
  if (!profile) {
    const error = new Error('Vendor profile not found.');
    error.status = 404;
    throw error;
  }
  return profile;
}
