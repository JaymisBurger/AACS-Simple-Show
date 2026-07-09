import {
  getAdminHelp,
  getQaChecklist,
  getReleaseNotes,
  getVendorHelp,
  globalAdminSearch,
  migrations,
  notificationSummary,
  resetQaChecklist,
  systemStatus,
  updateQaItem
} from '../models/opsModel.js';

export async function qaChecklist(req, res, next) {
  try { res.json({ items: await getQaChecklist() }); } catch (error) { next(error); }
}

export async function patchQaItem(req, res, next) {
  try { res.json({ items: await updateQaItem(req.params.itemKey, req.body, req.user.id) }); } catch (error) { next(error); }
}

export async function resetQa(req, res, next) {
  try { res.json({ items: await resetQaChecklist() }); } catch (error) { next(error); }
}

export async function exportQa(req, res, next) {
  try {
    const rows = await getQaChecklist();
    const headers = ['Area', 'Task', 'Status', 'Why it matters', 'Expected result', 'Notes', 'Checked at'];
    const csv = [headers.join(','), ...rows.map((row) => [
      row.area, row.taskName, row.status, row.whyItMatters, row.expectedResult, row.notes, row.checkedAt || ''
    ].map(csvCell).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="qa-checklist.csv"');
    res.send(csv);
  } catch (error) { next(error); }
}

export async function setupStatus(req, res, next) {
  try { res.json(await systemStatus()); } catch (error) { next(error); }
}

export async function migrationStatus(req, res, next) {
  try { res.json({ migrationStatus: await migrations() }); } catch (error) { next(error); }
}

export async function releaseNotes(req, res, next) {
  try { res.json({ releaseNotes: getReleaseNotes() }); } catch (error) { next(error); }
}

export async function search(req, res, next) {
  try { res.json({ results: await globalAdminSearch(String(req.query.q || '').trim()) }); } catch (error) { next(error); }
}

export async function notifications(req, res, next) {
  try { res.json(await notificationSummary()); } catch (error) { next(error); }
}

export async function adminHelp(req, res, next) {
  try { res.json({ help: getAdminHelp() }); } catch (error) { next(error); }
}

export async function vendorHelp(req, res, next) {
  try { res.json({ help: getVendorHelp() }); } catch (error) { next(error); }
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
