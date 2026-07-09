import { pool } from '../config/db.js';
import { boothStats, listBooths } from './boothModel.js';
import { countCommunicationsForShow } from './communicationModel.js';
import { findMapByShowId } from './mapModel.js';
import { findShowWithWindows } from './showModel.js';
import { getSelectionStatus, formatDateTime } from '../services/selectionStatusService.js';

export const tiers = ['platinum', 'gold', 'silver', 'bronze'];

export async function getShowReadiness(showId) {
  const show = await findShowWithWindows(showId);
  if (!show) return null;

  const [map, booths, stats, vendors, communicationCount] = await Promise.all([
    findMapByShowId(showId),
    listBooths(showId).catch(() => []),
    boothStats(showId).catch(() => null),
    listVendorReadiness(showId),
    countCommunicationsForShow(showId)
  ]);

  const tierStats = buildTierStats(show, vendors);
  const vendorStats = buildVendorStats(vendors);
  const missingDetails = booths.filter((booth) => !booth.boothNumber || !booth.boothType || !booth.status);
  const boothWarnings = {
    withoutDimensions: booths.filter((booth) => !booth.widthLabel || !booth.depthLabel).length,
    withoutPrice: booths.filter((booth) => booth.price === null).length,
    withoutNotes: booths.filter((booth) => !booth.notes).length,
    missingImportantDetails: missingDetails.length
  };

  const checklist = buildChecklist({ show, map, boothStats: stats, vendors, communicationCount });

  return {
    show,
    setup: {
      showName: Boolean(show.name),
      venueName: Boolean(show.venueName),
      venueAddress: Boolean(show.venueAddress),
      startDate: Boolean(show.startDate),
      endDate: Boolean(show.endDate),
      timezone: Boolean(show.timezone),
      vendorSelectionDeadline: Boolean(show.vendorSelectionDeadline),
      showStatus: show.status
    },
    floorMap: {
      exists: Boolean(map),
      map,
      boothStats: stats,
      boothWarnings
    },
    tierStats,
    vendors,
    vendorStats,
    checklist,
    communication: {
      prepared: communicationCount > 0,
      draftCount: communicationCount
    },
    assignmentProgress: {
      eligibleVendors: vendorStats.eligibleVendors,
      vendorsWithBooths: vendorStats.vendorsWithBooths,
      vendorsWithoutBooths: Math.max(0, vendorStats.eligibleVendors - vendorStats.vendorsWithBooths),
      blockedVendors: vendorStats.blockedFromSelecting
    }
  };
}

export async function listVendorReadiness(showId) {
  const show = await findShowWithWindows(showId);
  if (!show) return [];

  const [rows] = await pool.execute(
    `SELECT
      vp.id, vp.user_id, vp.company_name, vp.contact_name, vp.phone, vp.website, vp.description,
      vp.logo_url, vp.tier,
      vp.is_profile_complete, u.email, u.is_active,
      sv.status AS show_vendor_status, sv.special_access_opens_at,
      stw.opens_at AS tier_opens_at,
      ba.id AS assignment_id, ba.booth_id, b.booth_number, b.booth_type
     FROM vendor_profiles vp
     JOIN users u ON u.id = vp.user_id
     LEFT JOIN show_vendors sv ON sv.show_id = ? AND sv.vendor_profile_id = vp.id AND sv.status <> 'removed'
     LEFT JOIN show_tier_windows stw ON stw.show_id = ? AND stw.tier = vp.tier
     LEFT JOIN booth_assignments ba ON ba.show_id = ? AND ba.vendor_profile_id = vp.id AND ba.status = 'active'
     LEFT JOIN booths b ON b.id = ba.booth_id
     ORDER BY FIELD(vp.tier, 'platinum', 'gold', 'silver', 'bronze'), vp.company_name ASC, u.email ASC`,
    [showId, showId, showId]
  );

  return rows.map((row) => {
    const vendor = {
      id: row.id,
      userId: row.user_id,
      email: row.email,
      companyName: row.company_name,
      contactName: row.contact_name,
      phone: row.phone,
      website: row.website,
      description: row.description,
      logoUrl: row.logo_url,
      tier: row.tier,
      isProfileComplete: Boolean(row.is_profile_complete),
      isActive: Boolean(row.is_active),
      tierOpensAt: formatDateTime(row.tier_opens_at),
      isExcluded: row.show_vendor_status === 'excluded'
    };
    const override = {
      status: row.show_vendor_status,
      special_access_opens_at: row.special_access_opens_at
    };
    const assignment = row.assignment_id
      ? {
          id: row.assignment_id,
          boothId: row.booth_id,
          boothNumber: row.booth_number,
          boothType: row.booth_type
        }
      : null;
    const selectionStatus = getSelectionStatus({ show, vendor, override, assignment });

    return {
      vendor,
      excluded: row.show_vendor_status === 'excluded',
      specialAccessOpensAt: formatDateTime(row.special_access_opens_at),
      effectiveOpensAt: selectionStatus.effectiveOpensAt,
      selectionStatus,
      assignment
    };
  });
}

export async function getTierReadiness(showId) {
  const show = await findShowWithWindows(showId);
  if (!show) return null;
  return buildTierStats(show, await listVendorReadiness(showId));
}

function buildVendorStats(vendors) {
  const active = vendors.filter((item) => item.vendor.isActive);
  const eligible = active.filter((item) => !item.excluded);
  return {
    totalActiveVendors: active.length,
    eligibleVendors: eligible.length,
    excludedVendors: active.filter((item) => item.excluded).length,
    incompleteProfiles: eligible.filter((item) => !item.vendor.isProfileComplete).length,
    missingLogos: eligible.filter((item) => !item.vendor.logoUrl).length,
    completedProfiles: eligible.filter((item) => item.vendor.isProfileComplete).length,
    specialAccess: eligible.filter((item) => item.specialAccessOpensAt).length,
    blockedFromSelecting: vendors.filter((item) => item.selectionStatus.code !== 'open').length,
    vendorsWithBooths: eligible.filter((item) => item.assignment).length
  };
}

function buildTierStats(show, vendors) {
  return tiers.map((tier) => {
    const tierVendors = vendors.filter((item) => item.vendor.isActive && !item.excluded && item.vendor.tier === tier);
    const opensAt = show.tierWindows?.[tier]?.opensAt || null;
    const state = tierWindowState(show, opensAt);
    return {
      tier,
      opensAt,
      state,
      activeVendors: tierVendors.length,
      completedProfiles: tierVendors.filter((item) => item.vendor.isProfileComplete).length,
      vendorsWithBooths: tierVendors.filter((item) => item.assignment).length,
      vendorsWithoutBooths: tierVendors.filter((item) => !item.assignment).length
    };
  });
}

function buildChecklist({ show, map, boothStats, vendors, communicationCount }) {
  const activeEligible = vendors.filter((item) => item.vendor.isActive && !item.excluded);
  const tierComplete = tiers.every((tier) => show.tierWindows?.[tier]?.opensAt);
  const showDetailsComplete = Boolean(
    show.name && show.venueName && show.venueAddress && show.startDate && show.endDate && show.timezone && show.vendorSelectionDeadline
  );
  return [
    { key: 'show_details_completed', label: 'Event details completed', complete: showDetailsComplete },
    { key: 'tier_schedule_completed', label: 'Tier schedule completed', complete: tierComplete },
    { key: 'floor_map_uploaded', label: 'Floor map uploaded', complete: Boolean(map) },
    { key: 'booths_created', label: 'Booths created', complete: Number(boothStats?.total || 0) > 0 },
    { key: 'all_booths_numbered', label: 'All booths numbered', complete: Boolean(boothStats?.allNumbered) },
    { key: 'vendors_available', label: 'Vendors available', complete: activeEligible.length > 0 },
    {
      key: 'vendor_profiles_ready',
      label: 'Vendor profiles ready',
      complete: activeEligible.length > 0 && activeEligible.every((item) => item.vendor.isProfileComplete)
    },
    {
      key: 'booth_selection_ready',
      label: 'Booth selection ready',
      complete: Boolean(show.status === 'published' && map && Number(boothStats?.total || 0) > 0 && boothStats?.allNumbered && tierComplete)
    },
    { key: 'communication_prepared', label: 'Communication prepared', complete: communicationCount > 0 },
    { key: 'show_published', label: 'Show published', complete: show.status === 'published' }
  ];
}

function tierWindowState(show, opensAt) {
  if (!opensAt) return 'not_scheduled';
  if (show.selectionPaused || ['closed', 'archived'].includes(show.status)) return 'closed';
  const now = Date.now();
  const deadline = show.vendorSelectionDeadline ? new Date(show.vendorSelectionDeadline).getTime() : null;
  if (deadline && now > deadline) return 'closed';
  if (now < new Date(opensAt).getTime()) return 'upcoming';
  return 'open';
}
