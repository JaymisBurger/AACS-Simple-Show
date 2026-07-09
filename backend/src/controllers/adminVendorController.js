import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import { findUserByEmail, updateUserAccount } from '../models/userModel.js';
import {
  assignVendorToShow,
  createVendorProfile,
  findVendorById,
  listShowVendorAssignments,
  listVendors,
  removeVendorFromShow,
  showVendorStats,
  updateShowVendor,
  updateVendorLogo,
  updateVendorProfile,
  updateVendorTier
} from '../models/vendorProfileModel.js';
import { hashPassword } from '../services/passwordService.js';
import { saveVendorLogoFile, deleteUploadedFile } from '../services/uploadStorageService.js';
import {
  buildActivationUrl,
  buildResetUrl,
  createSecureToken,
  hoursFromNow,
  logInvitation
} from '../services/invitationService.js';
import {
  normalizeVendorInput,
  normalizeVendorProfileInput,
  showVendorStatuses,
  validateVendorCreate,
  validateVendorProfile,
  vendorTiers
} from '../services/vendorValidationService.js';

export async function getVendors(req, res, next) {
  try {
    const vendors = await listVendors({
      search: req.query.search?.trim() || '',
      tier: req.query.tier || 'all',
      active: req.query.active || 'all',
      complete: req.query.complete || 'all',
      showId: req.query.showId || 'all',
      sort: req.query.sort || 'company'
    });
    res.json({ vendors });
  } catch (error) {
    next(error);
  }
}

export async function getVendor(req, res, next) {
  try {
    const vendor = await requireVendor(req.params.vendorId);
    res.json({ vendor });
  } catch (error) {
    next(error);
  }
}

export async function postVendor(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const vendor = normalizeVendorInput(req.body);
    const validation = validateVendorCreate(vendor);
    if (!validation.isValid) return validationResponse(res, validation);

    const existing = await findUserByEmail(vendor.email);
    if (existing) {
      return res.status(409).json({ message: 'A user with that email already exists.', errors: { email: ['Email is already in use.'] } });
    }

    const password = vendor.creationMode === 'invitation' ? createSecureToken().token : vendor.temporaryPassword;
    const passwordHash = await hashPassword(password);
    let activationUrl = null;

    await connection.beginTransaction();
    const [userResult] = await connection.execute(
      `INSERT INTO users (email, password_hash, role, is_active, requires_password_change)
       VALUES (?, ?, 'vendor', ?, ?)`,
      [vendor.email, passwordHash, vendor.isActive, true]
    );

    const vendorProfileId = await createVendorProfile(connection, userResult.insertId, {
      ...vendor,
      logoUrl: null
    });

    if (vendor.creationMode === 'invitation') {
      const activation = createSecureToken();
      await updateUserAccount(userResult.insertId, {
        activationTokenHash: activation.tokenHash,
        activationExpiresAt: hoursFromNow(env.invitationTokenExpiresHours)
      }, connection);
      activationUrl = buildActivationUrl(activation.token);
      logInvitation(vendor.email, activationUrl);
    }

    await connection.commit();
    const createdVendor = await findVendorById(vendorProfileId);
    res.status(201).json({ vendor: createdVendor, activationUrl });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

export async function patchVendor(req, res, next) {
  try {
    const vendor = await requireVendor(req.params.vendorId);
    const profile = normalizeVendorProfileInput(req.body);
    const validation = validateVendorProfile(profile);
    if (!validation.isValid) return validationResponse(res, validation);
    const nextEmail = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : vendor.email;
    if (!nextEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      return res.status(422).json({ message: 'Please resolve profile issues.', errors: { email: ['Enter a valid email address.'] } });
    }
    if (nextEmail !== vendor.email) {
      const existing = await findUserByEmail(nextEmail);
      if (existing && Number(existing.id) !== Number(vendor.userId)) {
        return res.status(409).json({ message: 'A user with that email already exists.', errors: { email: ['Email is already in use.'] } });
      }
      await updateUserAccount(vendor.userId, { email: nextEmail });
    }
    const updatedVendor = await updateVendorProfile(req.params.vendorId, profile);
    res.json({ vendor: updatedVendor });
  } catch (error) {
    next(error);
  }
}

export async function patchVendorTier(req, res, next) {
  try {
    if (!vendorTiers.includes(req.body.tier)) {
      return res.status(422).json({ message: 'Invalid vendor tier.', errors: { tier: ['Vendor tier is not supported.'] } });
    }
    await requireVendor(req.params.vendorId);
    const vendor = await updateVendorTier(req.params.vendorId, req.body.tier);
    res.json({ vendor });
  } catch (error) {
    next(error);
  }
}

export async function patchVendorStatus(req, res, next) {
  try {
    const vendor = await requireVendor(req.params.vendorId);
    await updateUserAccount(vendor.userId, { isActive: Boolean(req.body.isActive) });
    res.json({ vendor: await findVendorById(req.params.vendorId) });
  } catch (error) {
    next(error);
  }
}

export async function resetVendorPassword(req, res, next) {
  try {
    const vendor = await requireVendor(req.params.vendorId);
    if (req.body.mode === 'link') {
      const reset = createSecureToken();
      await updateUserAccount(vendor.userId, {
        resetTokenHash: reset.tokenHash,
        resetExpiresAt: hoursFromNow(env.passwordResetTokenExpiresHours)
      });
      return res.json({ resetUrl: buildResetUrl(reset.token) });
    }

    if (!req.body.temporaryPassword || req.body.temporaryPassword.length < 8) {
      return res.status(422).json({ message: 'Temporary password must be at least 8 characters.' });
    }
    await updateUserAccount(vendor.userId, {
      passwordHash: await hashPassword(req.body.temporaryPassword),
      requiresPasswordChange: true,
      resetTokenHash: null,
      resetExpiresAt: null
    });
    res.json({ message: 'Temporary password set.' });
  } catch (error) {
    next(error);
  }
}

export async function uploadVendorLogo(req, res, next) {
  try {
    const vendor = await requireVendor(req.params.vendorId);
    if (!req.file) return res.status(400).json({ message: 'Choose a logo to upload.' });
    const saved = await saveVendorLogoFile(req.file);
    const updated = await updateVendorLogo(req.params.vendorId, saved.imageUrl);
    if (vendor.logoUrl) await deleteUploadedFile(vendor.logoUrl);
    res.json({ vendor: updated });
  } catch (error) {
    next(error);
  }
}

export async function removeVendorLogo(req, res, next) {
  try {
    const vendor = await requireVendor(req.params.vendorId);
    const updated = await updateVendorLogo(req.params.vendorId, null);
    if (vendor.logoUrl) await deleteUploadedFile(vendor.logoUrl);
    res.json({ vendor: updated });
  } catch (error) {
    next(error);
  }
}

export async function assignVendor(req, res, next) {
  const connection = await pool.getConnection();
  try {
    await requireVendor(req.params.vendorId);
    await connection.beginTransaction();
    await assignVendorToShow(connection, req.body.showId, req.params.vendorId, {
      status: req.body.status || 'excluded',
      specialAccessOpensAt: req.body.specialAccessOpensAt || null
    });
    await connection.commit();
    res.json({ vendor: await findVendorById(req.params.vendorId) });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

export async function bulkAssignVendors(req, res, next) {
  const connection = await pool.getConnection();
  try {
    const vendorIds = Array.isArray(req.body.vendorIds) ? req.body.vendorIds.map(Number).filter(Number.isFinite) : [];
    await connection.beginTransaction();
    for (const vendorId of vendorIds) {
      await assignVendorToShow(connection, req.body.showId, vendorId, { status: req.body.status || 'excluded' });
    }
    await connection.commit();
    res.json({ message: 'Vendors assigned.' });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

export async function patchShowVendor(req, res, next) {
  try {
    if (!showVendorStatuses.includes(req.body.status)) {
      return res.status(422).json({ message: 'Invalid show-vendor status.' });
    }
    await updateShowVendor(req.params.showId, req.params.vendorId, {
      status: req.body.status,
      specialAccessOpensAt: req.body.specialAccessOpensAt || null
    });
    res.json({ assignments: await listShowVendorAssignments(req.params.showId) });
  } catch (error) {
    next(error);
  }
}

export async function deleteShowVendor(req, res, next) {
  try {
    await removeVendorFromShow(req.params.showId, req.params.vendorId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function getShowVendors(req, res, next) {
  try {
    const assignments = await listShowVendorAssignments(req.params.showId);
    const stats = await showVendorStats(req.params.showId);
    res.json({ assignments, stats });
  } catch (error) {
    next(error);
  }
}

async function requireVendor(vendorId) {
  const vendor = await findVendorById(vendorId);
  if (!vendor) {
    const error = new Error('Vendor not found.');
    error.status = 404;
    throw error;
  }
  return vendor;
}

function validationResponse(res, validation) {
  return res.status(422).json({ message: 'Please resolve vendor issues.', errors: validation.errors });
}
