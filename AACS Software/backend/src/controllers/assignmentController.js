import { boothStats, listBooths } from '../models/boothModel.js';
import { findMapByShowId, listMapObjects } from '../models/mapModel.js';
import { findShowWithWindows, listShows } from '../models/showModel.js';
import { findVendorProfileByUserId } from '../models/vendorProfileModel.js';
import {
  approveBoothChangeRequest,
  createBoothChangeRequest,
  denyBoothChangeRequest,
  listBoothChangeRequests
} from '../models/boothChangeRequestModel.js';
import {
  assignmentStats,
  createAssignmentTransaction,
  findActiveAssignmentForVendor,
  findAssignmentById,
  listAssignmentHistory,
  listAssignments,
  listAssignmentsForShow,
  listEligibleVendors,
  moveAssignmentTransaction,
  releaseAssignmentTransaction,
  swapAssignmentsTransaction
} from '../models/assignmentModel.js';
import { evaluateSelectionReadiness, getVendorShowAccess } from '../services/selectionAccessService.js';
import { getSelectionStatus } from '../services/selectionStatusService.js';
import { pool } from '../config/db.js';
import { env } from '../config/env.js';
import path from 'path';

export async function vendorShows(req, res, next) {
  try {
    const profile = await findVendorProfileByUserId(req.user.id);
    if (!profile) return res.status(404).json({ message: 'Vendor profile not found.' });
    const shows = await listShows({ status: 'all' });
    const visible = [];
    for (const show of shows.filter((item) => item.status !== 'archived')) {
      const access = await getVendorShowAccess(req.user.id, show.id, pool);
      if (!access.allowed) continue;
      const assignment = await findActiveAssignmentForVendor(show.id, profile.id);
      visible.push(showPayload(access, assignment));
    }
    res.json({ shows: visible });
  } catch (error) {
    next(error);
  }
}

export async function vendorShow(req, res, next) {
  try {
    const access = await getVendorShowAccess(req.user.id, req.params.showId, pool);
    if (!access.allowed) return res.status(403).json({ message: access.reason });
    const assignment = await findActiveAssignmentForVendor(req.params.showId, access.profile.id);
    res.json({ show: showPayload(access, assignment), readiness: evaluateSelectionReadiness(access, assignment) });
  } catch (error) {
    next(error);
  }
}

export async function vendorFloorMap(req, res, next) {
  try {
    const access = await getVendorShowAccess(req.user.id, req.params.showId, pool);
    if (!access.allowed) return res.status(403).json({ message: access.reason });
    const map = await findMapByShowId(req.params.showId);
    if (!map) return res.status(404).json({ message: 'Floor map not found.' });
    const objects = await listMapObjects(req.params.showId, map.id);
    const assignments = await listAssignments({ showId: req.params.showId, status: 'active' });
    const ownAssignment = await findActiveAssignmentForVendor(req.params.showId, access.profile.id);
    res.json({
      show: showPayload(access, ownAssignment),
      map,
      objects,
      assignments: publicMapAssignments(assignments),
      readiness: evaluateSelectionReadiness(access, ownAssignment)
    });
  } catch (error) {
    next(error);
  }
}

export async function vendorBoothChangeRequests(req, res, next) {
  try {
    const access = await getVendorShowAccess(req.user.id, req.params.showId, pool);
    if (!access.allowed) return res.status(403).json({ message: access.reason });
    const requests = await listBoothChangeRequests(req.params.showId, { vendorProfileId: access.profile.id });
    res.json({ requests });
  } catch (error) {
    next(error);
  }
}

export async function vendorCreateBoothChangeRequest(req, res, next) {
  try {
    const requestedBoothId = requiredPositiveInteger(req.body.requestedBoothId, 'Choose a booth.');
    const access = await getVendorShowAccess(req.user.id, req.params.showId, pool);
    if (!access.allowed) return res.status(403).json({ message: access.reason });
    const request = await createBoothChangeRequest({
      showId: Number(req.params.showId),
      vendorProfileId: access.profile.id,
      requestedBoothId,
      message: req.body.message
    });
    res.status(201).json({ request });
  } catch (error) {
    next(error);
  }
}

export async function vendorFloorMapImage(req, res, next) {
  try {
    const access = await getVendorShowAccess(req.user.id, req.params.showId, pool);
    if (!access.allowed) return res.status(403).json({ message: access.reason });
    const map = await findMapByShowId(req.params.showId);
    if (!map) return res.status(404).json({ message: 'Floor map not found.' });
    res.sendFile(path.join(env.uploadDir, path.basename(map.imageUrl)));
  } catch (error) {
    next(error);
  }
}

export async function vendorSelectBooth(req, res, next) {
  try {
    const boothId = requiredPositiveInteger(req.params.boothId, 'Booth is required.');
    const access = await getVendorShowAccess(req.user.id, req.params.showId, pool);
    if (!access.allowed) return res.status(403).json({ message: access.reason });
    const existing = await findActiveAssignmentForVendor(req.params.showId, access.profile.id);
    const readiness = evaluateSelectionReadiness(access, existing);
    if (!readiness.canSelect) return res.status(409).json({ message: readiness.reasons[0], reasons: readiness.reasons });

    const assignment = await createAssignmentTransaction({
      showId: Number(req.params.showId),
      boothId,
      vendorProfileId: access.profile.id,
      performedByUserId: req.user.id,
      assignmentSource: 'vendor_selection',
      historyAction: 'selected',
      notes: 'Vendor confirmed booth selection.'
    });
    res.status(201).json({ assignment });
  } catch (error) {
    next(error);
  }
}

export async function vendorMyBooth(req, res, next) {
  try {
    const access = await getVendorShowAccess(req.user.id, req.params.showId, pool);
    if (!access.allowed) return res.status(403).json({ message: access.reason });
    const assignment = await findActiveAssignmentForVendor(req.params.showId, access.profile.id);
    if (!assignment) return res.status(404).json({ message: 'No booth assignment found for this show.' });
    const map = await findMapByShowId(req.params.showId);
    const objects = map ? await listMapObjects(req.params.showId, map.id) : [];
    res.json({ assignment, map, objects });
  } catch (error) {
    next(error);
  }
}

export async function adminAssignments(req, res, next) {
  try {
    const assignments = await listAssignments({
      search: req.query.search?.trim() || '',
      showId: req.query.showId || 'all',
      tier: req.query.tier || 'all',
      source: req.query.source || 'all',
      status: req.query.status || 'active'
    });
    res.json({ assignments });
  } catch (error) {
    next(error);
  }
}

export async function adminShowAssignments(req, res, next) {
  try {
    const show = await findShowWithWindows(req.params.showId);
    if (!show) return res.status(404).json({ message: 'Show not found.' });
    const map = await findMapByShowId(req.params.showId);
    const objects = map ? await listMapObjects(req.params.showId, map.id) : [];
    const assignments = await listAssignmentsForShow(req.params.showId);
    const history = await listAssignmentHistory(req.params.showId);
    const stats = await assignmentStats(req.params.showId);
    const booths = await listBooths(req.params.showId);
    res.json({ show, map, objects, assignments, history, stats, booths });
  } catch (error) {
    next(error);
  }
}

export async function adminEligibleVendors(req, res, next) {
  try {
    const vendors = await listEligibleVendors(req.params.showId);
    res.json({ vendors });
  } catch (error) {
    next(error);
  }
}

export async function adminCreateAssignment(req, res, next) {
  try {
    const boothId = requiredPositiveInteger(req.body.boothId, 'Choose a booth.');
    const vendorProfileId = requiredPositiveInteger(req.body.vendorProfileId, 'Choose a vendor.');
    const assignment = await createAssignmentTransaction({
      showId: Number(req.params.showId || req.body.showId),
      boothId,
      vendorProfileId,
      performedByUserId: req.user.id,
      assignmentSource: 'admin_assignment',
      historyAction: 'assigned',
      notes: req.body.notes
    });
    res.status(201).json({ assignment });
  } catch (error) {
    next(error);
  }
}

export async function adminMoveAssignment(req, res, next) {
  try {
    const assignmentId = requiredPositiveInteger(req.params.assignmentId, 'Assignment is required.');
    const newBoothId = requiredPositiveInteger(req.body.newBoothId, 'Choose a new booth.');
    const assignment = await moveAssignmentTransaction({
      assignmentId,
      newBoothId,
      performedByUserId: req.user.id,
      notes: req.body.notes
    });
    res.json({ assignment });
  } catch (error) {
    next(error);
  }
}

export async function adminReleaseAssignment(req, res, next) {
  try {
    const assignmentId = requiredPositiveInteger(req.params.assignmentId, 'Assignment is required.');
    const assignment = await releaseAssignmentTransaction({
      assignmentId,
      performedByUserId: req.user.id,
      notes: req.body.notes
    });
    res.json({ assignment });
  } catch (error) {
    next(error);
  }
}

export async function adminSwapAssignments(req, res, next) {
  try {
    const assignmentAId = requiredPositiveInteger(req.body.assignmentAId, 'Choose the first assignment.');
    const assignmentBId = requiredPositiveInteger(req.body.assignmentBId, 'Choose the second assignment.');
    if (assignmentAId === assignmentBId) return res.status(400).json({ message: 'Choose two different assignments to swap.' });
    const result = await swapAssignmentsTransaction({
      assignmentAId,
      assignmentBId,
      performedByUserId: req.user.id,
      notes: req.body.notes
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function adminAssignmentHistory(req, res, next) {
  try {
    const history = await listAssignmentHistory(req.params.showId, req.params.assignmentId);
    res.json({ history });
  } catch (error) {
    next(error);
  }
}

export async function adminBoothChangeRequests(req, res, next) {
  try {
    const show = await findShowWithWindows(req.params.showId);
    if (!show) return res.status(404).json({ message: 'Show not found.' });
    const requests = await listBoothChangeRequests(req.params.showId, { status: req.query.status || 'all' });
    res.json({ requests });
  } catch (error) {
    next(error);
  }
}

export async function adminApproveBoothChangeRequest(req, res, next) {
  try {
    const requestId = requiredPositiveInteger(req.params.requestId, 'Request is required.');
    const request = await approveBoothChangeRequest({ requestId, reviewedByUserId: req.user.id });
    res.json({ request });
  } catch (error) {
    next(error);
  }
}

export async function adminDenyBoothChangeRequest(req, res, next) {
  try {
    const requestId = requiredPositiveInteger(req.params.requestId, 'Request is required.');
    const request = await denyBoothChangeRequest({
      requestId,
      reviewedByUserId: req.user.id,
      reason: req.body.reason
    });
    res.json({ request });
  } catch (error) {
    next(error);
  }
}

function showPayload(access, assignment) {
  const selectionStatus = getSelectionStatus({
    show: access.show,
    vendor: {
      ...access.profile,
      isActive: Boolean(access.profile.is_active),
      isProfileComplete: Boolean(access.profile.is_profile_complete),
      tierOpensAt: access.tierOpensAt
    },
    override: access.override,
    assignment
  });
  return {
    ...access.show,
    vendorTier: access.profile.tier,
    tierOpensAt: access.tierOpensAt,
    specialAccessOpensAt: access.specialAccessOpensAt,
    effectiveOpensAt: access.effectiveOpensAt,
    selectionStatus,
    nextRecommendedAction: selectionStatus.nextAction,
    assignment
  };
}

function publicMapAssignments(assignments) {
  return assignments
    .filter((assignment) => assignment.status === 'active')
    .map((assignment) => ({
      id: assignment.id,
      boothId: assignment.boothId,
      vendorProfileId: assignment.vendorProfileId,
      boothNumber: assignment.booth.boothNumber,
      companyName: assignment.vendor.companyName,
      logoUrl: assignment.vendor.logoUrl
    }));
}

function requiredPositiveInteger(value, message) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    const error = new Error(message);
    error.status = 400;
    throw error;
  }
  return number;
}
