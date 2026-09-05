import { useEffect, useState } from 'react';
import { api, defaultAdminToken } from '../api.js';
import { formatMinor } from '../format.js';
import { messageFor } from '../errorMessages.js';
import { Stat } from '../components/Stat.jsx';
import { Badge } from '../components/Badge.jsx';
import { CopyableCode } from '../components/CopyableCode.jsx';

function milestoneProgress(report, coupons) {
  const n = report.milestoneInterval;
  const placed = report.ordersPlaced;
  const currentMilestone = Math.floor(placed / n);
  const rewarded = new Set(coupons.map((coupon) => coupon.milestone));
  const eligible = currentMilestone >= 1 && !rewarded.has(currentMilestone);
  const ordersUntilNext = (currentMilestone + 1) * n - placed;
  const intoCurrent = placed % n;
  const fillPercent = eligible ? 100 : Math.round((intoCurrent / n) * 100);
  return { n, placed, currentMilestone, eligible, ordersUntilNext, fillPercent };
}

export function Admin() {
  const [token, setToken] = useState(defaultAdminToken);
  const [report, setReport] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [lastCoupon, setLastCoupon] = useState(null);
  const [message, setMessage] = useState(null);

  async function loadAll() {
    setMessage(null);
    try {
      const [nextReport, nextCoupons] = await Promise.all([
        api.getReport(token),
        api.listCoupons(token),
      ]);
      setReport(nextReport);
      setCoupons(nextCoupons);
    } catch (error) {
      setMessage({ type: 'error', text: messageFor(error) });
    }
  }

  useEffect(() => {
    loadAll();
    // Load once on mount; the refresh button re-reads after a token change.
  }, []);

  async function generate() {
    setMessage(null);
    try {
      const coupon = await api.generateCoupon(token);
      setLastCoupon(coupon);
      setMessage({ type: 'success', text: `Generated a coupon for milestone ${coupon.milestone}.` });
      await loadAll();
    } catch (error) {
      setMessage({ type: 'error', text: messageFor(error) });
    }
  }

  const currency = report?.currency ?? 'INR';
  const progress = report ? milestoneProgress(report, coupons) : null;

  return (
    <section>
      <h2>
        Admin
        {/* <span className="admin-tag">stub token, not real auth</span> */}
      </h2>

      <label className="field">
        <span>Admin token</span>
        <input type="password" value={token} onChange={(event) => setToken(event.target.value)} />
      </label>

      <div className="row">
        <button className="btn btn-primary" onClick={generate}>
          Generate coupon
        </button>
        <button className="btn" onClick={loadAll}>
          Refresh report
        </button>
      </div>

      {message && (
        <p className={message.type === 'error' ? 'inline-error' : 'inline-success'}>{message.text}</p>
      )}

      {progress && (
        <div className="panel">
          <h3>Milestone progress</h3>
          <div className="stat-row">
            <Stat label="Orders placed" value={progress.placed} />
            <Stat label="Orders per milestone (N)" value={progress.n} />
            <Stat
              label="Orders until next milestone"
              value={progress.ordersUntilNext}
            />
          </div>
          <div className="progress" aria-hidden="true">
            <div className="progress-fill" style={{ width: `${progress.fillPercent}%` }} />
          </div>
          {progress.eligible ? (
            <p>
              <Badge status="eligible">eligible</Badge>{' '}
              Milestone {progress.currentMilestone} is reached and not yet rewarded. Generate its coupon now.
            </p>
          ) : (
            <p className="note">
              {progress.ordersUntilNext} more order
              {progress.ordersUntilNext === 1 ? '' : 's'} until milestone {progress.currentMilestone + 1}
              {' '}becomes eligible.
            </p>
          )}
        </div>
      )}

      {lastCoupon && (
        <div className="panel panel-accent">
          <h3>New coupon</h3>
          <CopyableCode code={lastCoupon.code} />
          <div className="coupon-meta">
            <span>{lastCoupon.percentOff}% off</span>
            <span>Milestone {lastCoupon.milestone}</span>
            <Badge status={lastCoupon.status}>{lastCoupon.status}</Badge>
          </div>
          <p className="note">Copy this code into the Checkout coupon field to apply the discount.</p>
        </div>
      )}

      <div className="panel">
        <h3>Coupons</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th className="num">Percent off</th>
              <th className="num">Milestone</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 ? (
              <tr>
                <td colSpan="4" className="muted">
                  No coupons generated yet.
                </td>
              </tr>
            ) : (
              coupons.map((coupon) => (
                <tr key={coupon.code}>
                  <td>
                    <code>{coupon.code}</code>
                  </td>
                  <td className="num">{coupon.percentOff}%</td>
                  <td className="num">{coupon.milestone}</td>
                  <td>
                    <Badge status={coupon.status}>{coupon.status}</Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {report && (
        <div className="panel">
          <h3>Report</h3>
          <div className="stat-row">
            <Stat label="Total orders" value={report.ordersPlaced} />
            <Stat label="Gross revenue" value={formatMinor(report.grossRevenueMinor, currency)} />
            <Stat label="Total discounts" value={formatMinor(report.totalDiscountsMinor, currency)} />
            <Stat label="Net revenue" value={formatMinor(report.netRevenueMinor, currency)} />
          </div>
          <div className="stat-row">
            <Stat label="Coupons generated" value={report.coupons.generated} />
            <Stat label="Available" value={report.coupons.available} />
            <Stat label="Redeemed" value={report.coupons.redeemed} />
          </div>

          <h3 className="section-gap">Units by product</h3>
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
          <p className="note">This report is read-only. Refreshing it never changes any state.</p>
        </div>
      )}
    </section>
  );
}
