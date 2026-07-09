import { findShowWithWindows } from '../models/showModel.js';
import { findVendorProfileByUserId } from '../models/vendorProfileModel.js';
import { getSelectionStatus } from './selectionStatusService.js';

export async function getVendorShowAccess(userId, showId, connection) {
  const profile = await findVendorProfileByUserId(userId);
  const show = await findShowWithWindows(showId);

  if (!profile) return { allowed: false, reason: 'Vendor profile not found.' };
  if (!profile.is_active) return { allowed: false, reason: 'Vendor account is inactive.', profile, show };
  if (!show) return { allowed: false, reason: 'Show not found.', profile };
  if (show.status === 'archived') return { allowed: false, reason: 'Show is archived.', profile, show };

  const db = connection;
  const [overrideRows] = await db.execute(
    `SELECT status, special_access_opens_at
     FROM show_vendors
     WHERE show_id = ? AND vendor_profile_id = ?
     LIMIT 1`,
    [showId, profile.id]
  );
  const override = overrideRows[0] || null;

  if (override?.status === 'excluded') {
    return { allowed: false, reason: 'You are not eligible for this show.', profile, show, override };
  }

  const tierWindow = show.tierWindows?.[profile.tier]?.opensAt || null;
  const effectiveOpensAt = override?.special_access_opens_at
    ? formatDateTime(override.special_access_opens_at)
    : tierWindow;

  return {
    allowed: true,
    profile,
    show,
    override,
    tierOpensAt: tierWindow,
    specialAccessOpensAt: formatDateTime(override?.special_access_opens_at),
    effectiveOpensAt
  };
}

export function evaluateSelectionReadiness(access, assignment = null) {
  const status = getSelectionStatus({
    show: access.show,
    vendor: {
      ...access.profile,
      isActive: Boolean(access.profile?.is_active),
      isProfileComplete: Boolean(access.profile?.is_profile_complete),
      tierOpensAt: access.tierOpensAt
    },
    override: access.override,
    assignment
  });
  const reasons = [];
  if (!access.allowed) reasons.push(access.reason || 'You are not eligible for this show.');
  if (status.code === 'profile_incomplete') reasons.push('Complete your company name, contact name, and logo before selecting a booth.');
  if (status.code === 'show_closed') reasons.push('Booth selection is closed for this show.');
  if (status.code === 'show_not_published') reasons.push('Booth selection is not available until the show is published.');
  if (status.code === 'selection_paused') reasons.push('Booth selection is paused.');
  if (status.code === 'tier_not_open') reasons.push(status.effectiveOpensAt ? `Booth selection opens on ${status.effectiveOpensAt}.` : 'Your booth selection opening time has not been scheduled.');
  if (status.code === 'deadline_passed') reasons.push('The booth selection deadline has passed.');
  if (status.code === 'already_selected') reasons.push('You already have an active booth for this show.');

  return {
    canSelect: status.canSelect && reasons.length === 0,
    reasons,
    status
  };
}

function formatDateTime(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.replace(' ', 'T').slice(0, 16);
  return value.toISOString().slice(0, 16);
}
