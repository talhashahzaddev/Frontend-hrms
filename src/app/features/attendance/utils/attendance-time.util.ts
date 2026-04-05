function toMeridiemTime(hour24: number, minute: string): string {
  const ampm = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) {
    hour12 = 12;
  }
  return `${hour12}:${minute} ${ampm}`;
}

export function formatAttendanceTime(
  timeValue: string | null | undefined,
  emptyValue = '--'
): string {
  if (!timeValue) {
    return emptyValue;
  }

  const normalized = String(timeValue).trim();
  if (!normalized) {
    return emptyValue;
  }

  if (/^\d{2}:\d{2}$/.test(normalized)) {
    const [hourPart, minutePart] = normalized.split(':');
    return toMeridiemTime(parseInt(hourPart, 10), minutePart);
  }

  if (normalized.includes('T')) {
    const afterT = normalized.substring(normalized.indexOf('T') + 1);

    if (/[+-]\d{2}:\d{2}$/.test(afterT)) {
      const hhmm = afterT.substring(0, 5);
      const [hourPart, minutePart] = hhmm.split(':');
      return toMeridiemTime(parseInt(hourPart, 10), minutePart);
    }
  }

  const asDate = new Date(normalized);
  if (!isNaN(asDate.getTime())) {
    return asDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  return normalized;
}