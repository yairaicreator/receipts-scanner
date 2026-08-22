import { Camera, ChevronLeft, Download, Trash2 } from 'lucide-react';
import CategoryIcon from '../components/CategoryIcon.jsx';
import { CHART_TYPE, CURRENCY } from '../config.js';

/** One person's growing record: stats, their own chart, and every receipt. */
export default function PersonScreen({ person, exporting, onBack, onScanAnother, onExport, onDelete }) {
  return (
    <>
      <header className="nav sub-header">
        <button type="button" className="btn btn-icon" onClick={onBack} aria-label="Back">
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <div>
          <div className="nav-brand">{person.name}</div>
          <div className="sub-header-meta">
            {person.total} {CURRENCY} · {person.count} entries
          </div>
        </div>
      </header>

      <div className="screen-body">
        <div className="hr" style={{ marginBottom: 'var(--space-4)' }} />

        <div className="stat-grid" style={{ '--person-color': person.color }}>
          <div className="card stat-card">
            <div className="card-kicker">Top category</div>
            <div className="card-title">
              <CategoryIcon name={person.topIcon} size={16} color={person.topColor} />
              {person.topCategory}
            </div>
          </div>
          <div className="card stat-card">
            <div className="card-kicker">This month</div>
            <div className="card-title">{person.monthTotal} {CURRENCY}</div>
          </div>
          <div className="card stat-card">
            <div className="card-kicker">Avg / receipt</div>
            <div className="card-title">{person.avgEntry} {CURRENCY}</div>
          </div>
        </div>

        <div className="section-label">Spend by category</div>

        {CHART_TYPE === 'bar' ? (
          person.breakdown.map((bar) => (
            <div className="bar-row" key={bar.category}>
              <div className="bar-label">
                <CategoryIcon name={bar.icon} size={14} color={bar.color} />
                {bar.category}
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ background: bar.color, width: `${bar.pct}%` }} />
              </div>
              <div className="bar-value">{bar.amount} {CURRENCY}</div>
            </div>
          ))
        ) : person.linePoints ? (
          <>
            <svg className="line-chart" viewBox="0 0 300 120" role="img" aria-label="Cumulative spend over time">
              <line x1="0" y1="115" x2="300" y2="115" stroke="var(--color-divider)" strokeWidth="1" />
              <polyline
                points={person.linePoints}
                fill="none"
                stroke="var(--color-accent-700)"
                strokeWidth="2"
              />
            </svg>
            <div className="chart-note">Cumulative spend over time</div>
          </>
        ) : (
          <div className="chart-empty">Need at least two entries to plot a trend.</div>
        )}

        <div className="hr" style={{ margin: 'var(--space-4) 0' }} />
        <div className="section-label">Entries</div>

        <table className="table entries-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Vendor</th>
              <th className="right">Cost</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {person.entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.date}</td>
                <td>
                  <span className="tag" style={{ '--cat-color': entry.color }}>
                    <CategoryIcon name={entry.icon} size={12} />
                    {entry.category}
                  </span>
                </td>
                <td>{entry.vendor}</td>
                <td className="right">{entry.amount} {CURRENCY}</td>
                <td className="right">
                  <button
                    type="button"
                    className="btn btn-icon delete-btn"
                    aria-label={`Delete the ${entry.category} receipt from ${entry.date}`}
                    onClick={() => onDelete(entry)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sticky-footer stacked">
        <button type="button" className="btn btn-secondary btn-block" onClick={onScanAnother}>
          <Camera size={16} aria-hidden="true" />
          Scan Another Receipt
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={onExport} disabled={exporting}>
          <Download size={16} aria-hidden="true" />
          {exporting ? 'Preparing…' : 'Export To Excel (.xlsx)'}
        </button>
      </div>
    </>
  );
}
