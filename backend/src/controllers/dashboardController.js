import { findUserById, toPublicUser } from '../models/userModel.js';
import { countBoothsForShow, findMapByShowId } from '../models/mapModel.js';
import {
  findVendorProfileByUserId,
  toPublicVendorProfile
} from '../models/vendorProfileModel.js';

export async function getAdminDashboard(req, res, next) {
  try {
    const user = await findUserById(req.user.id);
    res.json({ user: toPublicUser(user) });
  } catch (error) {
    next(error);
  }
}

export async function getShowChecklist(req, res, next) {
  try {
    const map = await findMapByShowId(req.params.showId);
    const boothCount = await countBoothsForShow(req.params.showId);

    res.json({
      floorMapUploaded: Boolean(map),
      boothsCreated: boothCount > 0
    });
  } catch (error) {
    next(error);
  }
}

export async function getVendorDashboard(req, res, next) {
  try {
    const user = await findUserById(req.user.id);
    const vendorProfile = await findVendorProfileByUserId(req.user.id);

    res.json({
      user: toPublicUser(user),
      vendorProfile: toPublicVendorProfile(vendorProfile)
    });
  } catch (error) {
    next(error);
  }
}
