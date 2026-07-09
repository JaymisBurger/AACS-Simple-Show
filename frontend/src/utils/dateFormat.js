export function formatDate(value, fallback = 'Not set') {
  if (!value) return fallback;

  const { month, day, year } = dateParts(value);
  if (!month || !day || !year) return String(value);

  return `${month}/${day}/${String(year).slice(-2)}`;
}

export function formatDateRange(startDate, endDate, fallback = 'Not set') {
  if (!startDate && !endDate) return fallback;
  if (startDate && endDate) return `${formatDate(startDate)} to ${formatDate(endDate)}`;
  return formatDate(startDate || endDate);
}

export function formatDateTime(value, timezone, fallback = 'Not set') {
  if (!value) return fallback;

  const normalized = String(value).replace(' ', 'T');
  const [datePart, timePart = ''] = normalized.split('T');
  const formattedDate = formatDate(datePart, fallback);
  const formattedTime = formatTime(timePart);

  return `${formattedDate}${formattedTime ? ` ${formattedTime}` : ''}${timezone ? ` ${timezone}` : ''}`;
}

function dateParts(value) {
  if (value instanceof Date) {
    return {
      month: value.getMonth() + 1,
      day: value.getDate(),
      year: value.getFullYear()
    };
  }

  const [datePart] = String(value).replace(' ', 'T').split('T');
  const [year, month, day] = datePart.split('-').map(Number);

  return { month, day, year };
}

function formatTime(value) {
  if (!value) return '';

  const [hourValue, minuteValue = '0'] = value.slice(0, 5).split(':');
  const hour24 = Number(hourValue);
  const minute = Number(minuteValue);

  if (!Number.isFinite(hour24) || !Number.isFinite(minute)) return '';

  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;

  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}
