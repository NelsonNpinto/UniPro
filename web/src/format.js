// Format integer minor units for display without ever using floating point in
// the value path. Division is integer division; the remainder is the minor part.
export function formatMinor(minor, currency = 'INR') {
  const negative = minor < 0;
  const abs = Math.abs(minor);
  const major = Math.floor(abs / 100).toLocaleString('en-IN');
  const minorPart = String(abs % 100).padStart(2, '0');
  const prefix = currency === 'INR' ? '₹' : `${currency} `;
  return `${negative ? '-' : ''}${prefix}${major}.${minorPart}`;
}
