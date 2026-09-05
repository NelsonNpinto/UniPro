import { formatMinor } from '../format.js';

// One line of a money breakdown: a label and a formatted amount. The variant
// styles the discount and total rows without changing the markup shape.
export function MoneyRow({ label, amountMinor, currency, variant, sign }) {
  const className = variant ? `summary-${variant}` : undefined;
  const prefix = sign === '-' ? '-' : '';
  return (
    <div className={className}>
      <dt>{label}</dt>
      <dd>
        {prefix}
        {formatMinor(amountMinor, currency)}
      </dd>
    </div>
  );
}
