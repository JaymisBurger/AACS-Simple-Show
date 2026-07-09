import {
  countShowDependentRecords,
  createShow,
  deleteShow,
  findShowWithWindows,
  listShows,
  updateShow,
  updateShowStatus,
  upsertTierWindows
} from '../models/showModel.js';
import {
  normalizeShowInput,
  normalizeTierWindowsInput,
  tiers,
  validateShowPayload
} from '../services/showValidationService.js';
import { archiveWarnings, disablePublicAccess } from '../models/eventDayModel.js';

export async function getShows(req, res, next) {
  try {
    const shows = await listShows({
      status: req.query.status || 'all',
      search: req.query.search?.trim() || ''
    });

    res.json({ shows });
  } catch (error) {
    next(error);
  }
}

export async function getShow(req, res, next) {
  try {
    const show = await requireShow(req.params.id);
    res.json(withSetupStatus(show));
  } catch (error) {
    next(error);
  }
}

export async function postShow(req, res, next) {
  try {
    const showInput = normalizeShowInput(req.body);
    const windowsInput = normalizeTierWindowsInput(req.body.tierWindows);
    const validation = validateShowPayload(showInput, windowsInput, {
      requirePublishReady: showInput.status === 'published'
    });

    if (!validation.isValid) {
      return validationResponse(res, validation);
    }

    const show = await createShow(showInput, req.user.id);
    if (hasAnyWindow(windowsInput)) {
      await upsertTierWindows(show.id, windowsInput);
    }

    const createdShow = await findShowWithWindows(show.id);
    res.status(201).json(withSetupStatus(createdShow));
  } catch (error) {
    next(error);
  }
}

export async function patchShow(req, res, next) {
  try {
    const existingShow = await requireShow(req.params.id);
    ensureEditable(existingShow);

    const mergedInput = normalizeShowInput({ ...existingShow, ...req.body });
    const windowsInput = normalizeTierWindowsInput(req.body.tierWindows);
    const mergedWindows = {
      ...tierWindowsToInput(existingShow.tierWindows),
      ...removeEmptyWindowValues(windowsInput)
    };
    const validation = validateShowPayload(mergedInput, mergedWindows, {
      requirePublishReady: mergedInput.status === 'published'
    });

    if (!validation.isValid) {
      return validationResponse(res, validation);
    }

    const updatedShow = await updateShow(existingShow.id, mergedInput);
    if (req.body.tierWindows) {
      await upsertTierWindows(existingShow.id, removeEmptyWindowValues(windowsInput));
    }

    const show = await findShowWithWindows(updatedShow.id);
    res.json(withSetupStatus(show));
  } catch (error) {
    next(error);
  }
}

export async function publishShow(req, res, next) {
  try {
    const show = await requireShow(req.params.id);
    ensureEditable(show);

    const showInput = normalizeShowInput({ ...show, status: 'published' });
    const windowsInput = tierWindowsToInput(show.tierWindows);
    const validation = validateShowPayload(showInput, windowsInput, { requirePublishReady: true });

    if (!validation.isValid) {
      return validationResponse(res, validation);
    }

    const updatedShow = await updateShowStatus(show.id, 'published');
    res.json(withSetupStatus(updatedShow));
  } catch (error) {
    next(error);
  }
}

export async function closeShow(req, res, next) {
  try {
    const show = await requireShow(req.params.id);
    ensureEditable(show);

    const updatedShow = await updateShowStatus(show.id, 'closed');
    res.json(withSetupStatus(updatedShow));
  } catch (error) {
    next(error);
  }
}

export async function archiveShow(req, res, next) {
  try {
    const show = await requireShow(req.params.id);
    const warnings = await archiveWarnings(show.id);
    if (!req.body?.confirmArchive && Object.values(warnings).some((value) => Number(value) > 0)) {
      return res.status(409).json({
        message: 'This show has active records. Confirm archive to continue.',
        warnings
      });
    }
    await disablePublicAccess(show.id);
    const updatedShow = await updateShowStatus(show.id, 'archived');
    res.json(withSetupStatus(updatedShow));
  } catch (error) {
    next(error);
  }
}

export async function restoreShow(req, res, next) {
  try {
    const show = await requireShow(req.params.id);
    const updatedShow = await updateShowStatus(show.id, 'draft');
    res.json(withSetupStatus(updatedShow));
  } catch (error) {
    next(error);
  }
}

export async function putTierWindows(req, res, next) {
  try {
    const show = await requireShow(req.params.id);
    ensureEditable(show);

    const windowsInput = normalizeTierWindowsInput(req.body.tierWindows || req.body);
    const mergedWindows = {
      ...tierWindowsToInput(show.tierWindows),
      ...removeEmptyWindowValues(windowsInput)
    };
    const validation = validateShowPayload(normalizeShowInput(show), mergedWindows, {
      requirePublishReady: show.status === 'published'
    });

    if (!validation.isValid) {
      return validationResponse(res, validation);
    }

    const tierWindows = await upsertTierWindows(show.id, removeEmptyWindowValues(windowsInput));
    const updatedShow = await findShowWithWindows(show.id);
    res.json({ ...withSetupStatus(updatedShow), tierWindows });
  } catch (error) {
    next(error);
  }
}

export async function destroyShow(req, res, next) {
  try {
    const show = await requireShow(req.params.id);
    const dependentRecords = await countShowDependentRecords(show.id);

    if (dependentRecords > 0) {
      return res.status(409).json({
        message: 'Show cannot be permanently deleted while dependent records exist.'
      });
    }

    await deleteShow(show.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

async function requireShow(id) {
  const show = await findShowWithWindows(id);

  if (!show) {
    const error = new Error('Show not found.');
    error.status = 404;
    throw error;
  }

  return show;
}

function ensureEditable(show) {
  if (show.status === 'archived') {
    const error = new Error('Archived shows cannot be edited. Restore the show first.');
    error.status = 409;
    throw error;
  }
}

function validationResponse(res, validation) {
  return res.status(422).json({
    message: 'Please resolve the show setup issues.',
    errors: validation.errors,
    missingSetupItems: validation.missingSetupItems
  });
}

function withSetupStatus(show) {
  const windowsInput = tierWindowsToInput(show.tierWindows);
  const validation = validateShowPayload(normalizeShowInput(show), windowsInput, {
    requirePublishReady: show.status === 'published'
  });

  return {
    show,
    missingSetupItems: validation.missingSetupItems
  };
}

function tierWindowsToInput(tierWindows = {}) {
  return tiers.reduce((result, tier) => {
    result[tier] = tierWindows[tier]?.opensAt || null;
    return result;
  }, {});
}

function removeEmptyWindowValues(windows) {
  return tiers.reduce((result, tier) => {
    if (windows[tier]) result[tier] = windows[tier];
    return result;
  }, {});
}

function hasAnyWindow(windows) {
  return tiers.some((tier) => Boolean(windows[tier]));
}
