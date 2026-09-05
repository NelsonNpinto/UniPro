import { useState } from 'react';
import { api } from '../api.js';
import { formatMinor } from '../format.js';
import { messageFor } from '../errorMessages.js';

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

export function Admin() {
  const [token, setToken] = useState('dev-admin-token');
  const [report, setReport] = useState(null);
  const [message, setMessage] = useState(null);

  async function loadReport() {
    setMessage(null);
    try {
      setReport(await api.getReport(token));
    } catch (error) {
      setMessage({ type: 'error', text: messageFor(error) });
    }
  }

  async function generate() {
    setMessage(null);
    try {
      const coupon = await api.generateCoupon(token);
      setMessage({
        type: 'success',
        text: `Generated ${coupon.code} (${coupon.percentOff}% off) for milestone ${coupon.milestone}.`,
      });
      await loadReport();
    } catch (error) {
      setMessage({ type: 'error', text: messageFor(error) });
    }
  }

  const currency = report?.currency ?? 'INR';

  return (
    <section>
      <h2>Admin</h2>
      <label className="field">
        <span>Admin token</span>
        <input type="password" value={token} onChange={(event) => setToken(event.target.value)} />
      </label>

      <div className="row">
        <button className="btn" onClick={generate}>
          Generate coupon
        </button>
        <button className="btn" onClick={loadReport}>
          Refresh report
        </button>
      </div>

      {message && (
        <p className={message.type === 'error' ? 'inline-error' : 'inline-success'}>{message.text}</p>
      )}

      {report && (
        <div className="report">
          <div className="stat-row">
            <Stat label="Orders placed" value={report.ordersPlaced} />
            <Stat label="Gross revenue" value={formatMinor(report.grossRevenueMinor, currency)} />
            <Stat label="Discounts" value={formatMinor(report.totalDiscountsMinor, currency)} />
            <Stat label="Net revenue" value={formatMinor(report.netRevenueMinor, currency)} />
          </div>
          <div className="stat-row">
            <Stat label="Coupons generated" value={report.coupons.generated} />
            <Stat label="Available" value={report.coupons.available} />
            <Stat label="Redeemed" value={report.coupons.redeemed} />
          </div>

          <h3>Units by product</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th className="num">Units</th>
              </tr>
            </thead>
            <tbody>
              {report.unitsByProduct.length === 0 ? (
                <tr>
                  <td colSpan="2" className="muted">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                report.unitsByProduct.map((entry) => (
                  <tr key={entry.productId}>
                    <td>{entry.name}</td>
                    <td className="num">{entry.quantity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
