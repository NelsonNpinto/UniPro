// Format integer minor units for display without ever using floating point in
// the value path. The major part is integer division by 100; the minor part is
// the remainder, always two digits.
export function formatMinor(minor, currency = 'INR') {
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const major = Math.floor(abs / 100).toLocaleString(locale);
  const minorPart = String(abs % 100).padStart(2, '0');
  const prefix = currency === 'INR' ? '\u20b9' : `${currency} `;
  return `${negative ? '-' : ''}${prefix}${major}.${minorPart}`;
}

// A short, readable timestamp for order snapshots.
export function formatTimestamp(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}
