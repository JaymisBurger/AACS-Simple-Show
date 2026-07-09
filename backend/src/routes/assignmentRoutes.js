import { Router } from 'express';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import {
  adminApproveBoothChangeRequest,
  adminAssignmentHistory,
  adminAssignments,
  adminBoothChangeRequests,
  adminCreateAssignment,
  adminDenyBoothChangeRequest,
  adminEligibleVendors,
  adminMoveAssignment,
  adminReleaseAssignment,
  adminShowAssignments,
  adminSwapAssignments,
  vendorBoothChangeRequests,
  vendorCreateBoothChangeRequest,
  vendorFloorMap,
  vendorFloorMapImage,
  vendorMyBooth,
  vendorSelectBooth,
  vendorShow,
  vendorShows
} from '../controllers/assignmentController.js';

const router = Router();

router.get('/vendor/shows', authenticate, authorizeRoles('vendor'), vendorShows);
router.get('/vendor/shows/:showId', authenticate, authorizeRoles('vendor'), vendorShow);
router.get('/vendor/shows/:showId/floor-map', authenticate, authorizeRoles('vendor'), vendorFloorMap);
router.get('/vendor/shows/:showId/floor-map/image', authenticate, authorizeRoles('vendor'), vendorFloorMapImage);
router.post('/vendor/shows/:showId/booths/:boothId/select', authenticate, authorizeRoles('vendor'), vendorSelectBooth);
router.get('/vendor/shows/:showId/my-booth', authenticate, authorizeRoles('vendor'), vendorMyBooth);
router.get('/vendor/shows/:showId/change-requests', authenticate, authorizeRoles('vendor'), vendorBoothChangeRequests);
router.post('/vendor/shows/:showId/change-requests', authenticate, authorizeRoles('vendor'), vendorCreateBoothChangeRequest);

router.get('/admin/booth-assignments', authenticate, authorizeRoles('admin'), adminAssignments);
router.get('/admin/shows/:showId/assignments', authenticate, authorizeRoles('admin'), adminShowAssignments);
router.post('/admin/shows/:showId/assignments', authenticate, authorizeRoles('admin'), adminCreateAssignment);
router.get('/admin/shows/:showId/assignments/eligible-vendors', authenticate, authorizeRoles('admin'), adminEligibleVendors);
router.post('/admin/assignments/:assignmentId/move', authenticate, authorizeRoles('admin'), adminMoveAssignment);
router.post('/admin/assignments/:assignmentId/release', authenticate, authorizeRoles('admin'), adminReleaseAssignment);
router.post('/admin/assignments/swap', authenticate, authorizeRoles('admin'), adminSwapAssignments);
router.get('/admin/shows/:showId/change-requests', authenticate, authorizeRoles('admin'), adminBoothChangeRequests);
router.post('/admin/change-requests/:requestId/approve', authenticate, authorizeRoles('admin'), adminApproveBoothChangeRequest);
router.post('/admin/change-requests/:requestId/deny', authenticate, authorizeRoles('admin'), adminDenyBoothChangeRequest);
router.get('/admin/shows/:showId/assignments/history', authenticate, authorizeRoles('admin'), adminAssignmentHistory);
router.get('/admin/shows/:showId/assignments/:assignmentId/history', authenticate, authorizeRoles('admin'), adminAssignmentHistory);

export default router;
