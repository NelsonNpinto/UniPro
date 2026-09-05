export function QuantityStepper({ label, quantity, onChange, disabled }) {
  return (
    <div className="qty">
      <button
        className="btn btn-small"
        onClick={() => onChange(quantity - 1)}
        disabled={disabled || quantity <= 1}
        aria-label={`Decrease quantity of ${label}`}
      >
        -
      </button>
      <span className="qty-value">{quantity}</span>
      <button
        className="btn btn-small"
        onClick={() => onChange(quantity + 1)}
        disabled={disabled}
        aria-label={`Increase quantity of ${label}`}
      >
        +
      </button>
    </div>
  );
}
