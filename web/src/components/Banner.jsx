export function Banner({ banner, onDismiss }) {
  if (!banner) return null;
  return (
    <div className={`banner banner-${banner.type}`} role="status">
      <span>{banner.text}</span>
      <button className="banner-close" onClick={onDismiss} aria-label="Dismiss message">
        Dismiss
      </button>
    </div>
  );
}
