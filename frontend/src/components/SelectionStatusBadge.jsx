import { selectionStatusClass, selectionStatusLabel } from '../utils/selectionStatus.js';

export function SelectionStatusBadge({ status }) {
  return <span className={selectionStatusClass(status)}>{selectionStatusLabel(status)}</span>;
}
