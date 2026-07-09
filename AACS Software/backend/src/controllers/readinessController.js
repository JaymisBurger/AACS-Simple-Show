import { createCommunication, listCommunications, updateCommunicationStatus } from '../models/communicationModel.js';
import { getShowReadiness, getTierReadiness, listVendorReadiness } from '../models/readinessModel.js';
import { findShowWithWindows } from '../models/showModel.js';
import { renderCommunication } from '../services/communicationTemplateService.js';

export async function getReadinessSummary(req, res, next) {
  try {
    const readiness = await getShowReadiness(req.params.showId);
    if (!readiness) return res.status(404).json({ message: 'Show not found.' });
    res.json({ readiness });
  } catch (error) {
    next(error);
  }
}

export async function getVendorReadiness(req, res, next) {
  try {
    const vendors = await listVendorReadiness(req.params.showId);
    res.json({ vendors });
  } catch (error) {
    next(error);
  }
}

export async function getTierReadinessStats(req, res, next) {
  try {
    const tiers = await getTierReadiness(req.params.showId);
    if (!tiers) return res.status(404).json({ message: 'Show not found.' });
    res.json({ tiers });
  } catch (error) {
    next(error);
  }
}

export async function previewCommunication(req, res, next) {
  try {
    const show = await findShowWithWindows(req.params.showId);
    if (!show) return res.status(404).json({ message: 'Show not found.' });
    const vendors = await listVendorReadiness(req.params.showId);
    const targets = filterTargets(vendors, req.body.target || 'eligible', req.body.tier, req.body.vendorProfileId);
    const previews = targets.map((vendorReadiness) =>
      renderCommunication({
        type: req.body.communicationType || defaultTemplateForTarget(req.body.target),
        show,
        vendorReadiness
      })
    );
    res.json({ previews, targetCount: previews.length });
  } catch (error) {
    next(error);
  }
}

export async function saveCommunicationDraft(req, res, next) {
  try {
    const subject = String(req.body.subject || '').trim();
    const message = String(req.body.message || '').trim();
    if (!subject || !message) return res.status(400).json({ message: 'Subject and message are required.' });
    const communication = await createCommunication({
      showId: Number(req.params.showId),
      vendorProfileId: req.body.vendorProfileId ? Number(req.body.vendorProfileId) : null,
      communicationType: req.body.communicationType || 'custom',
      subject,
      message,
      status: req.body.status || 'drafted',
      createdByUserId: req.user.id
    });
    res.status(201).json({ communication });
  } catch (error) {
    next(error);
  }
}

export async function markCommunicationCopied(req, res, next) {
  try {
    res.json({ communication: await updateCommunicationStatus(req.params.communicationId, 'copied') });
  } catch (error) {
    next(error);
  }
}

export async function markCommunicationSentExternally(req, res, next) {
  try {
    res.json({ communication: await updateCommunicationStatus(req.params.communicationId, 'sent_externally') });
  } catch (error) {
    next(error);
  }
}

export async function getCommunicationHistory(req, res, next) {
  try {
    const communications = await listCommunications(req.params.showId, {
      vendorProfileId: req.query.vendorProfileId,
      status: req.query.status || 'all'
    });
    res.json({ communications });
  } catch (error) {
    next(error);
  }
}

function filterTargets(vendors, target, tier, vendorProfileId) {
  let result = vendors;
  if (target === 'vendor' && vendorProfileId) return vendors.filter((item) => Number(item.vendor.id) === Number(vendorProfileId));
  if (target !== 'excluded') result = result.filter((item) => item.vendor.isActive && !item.excluded);
  if (target === 'tier' && tier) result = result.filter((item) => item.vendor.tier === tier);
  if (target === 'incomplete_profiles') result = result.filter((item) => !item.vendor.isProfileComplete);
  if (target === 'selection_open') result = result.filter((item) => item.selectionStatus.code === 'open');
  if (target === 'without_booths') result = result.filter((item) => !item.assignment);
  if (target === 'confirmed_booths') result = result.filter((item) => item.assignment);
  if (target === 'excluded') result = vendors.filter((item) => item.excluded);
  return result;
}

function defaultTemplateForTarget(target) {
  const map = {
    incomplete_profiles: 'complete_vendor_profile',
    selection_open: 'booth_selection_now_open',
    without_booths: 'booth_selection_reminder',
    confirmed_booths: 'booth_confirmation',
    excluded: 'booth_selection_coming_soon'
  };
  return map[target] || 'booth_selection_coming_soon';
}
