import { useState } from 'react';

// Shows a code prominently with a copy button. Copy feedback resets after a
// short delay. Falls back gracefully if the clipboard API is unavailable.
export function CopyableCode({ code }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="coupon-code">
      <code>{code}</code>
      <button className="btn btn-small" onClick={copy}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
