export function Badge({ status, children }) {
  return <span className={`badge badge-${status}`}>{children ?? status}</span>;
}
