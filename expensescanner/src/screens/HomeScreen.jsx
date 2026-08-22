import { Camera, Receipt } from 'lucide-react';

/**
 * The staff list. Names, how many receipts each person has, and a strip
 * showing the proportion of their spend by category — deliberately no
 * amounts, per the user's last note on this screen.
 */
export default function HomeScreen({ people, onOpenPerson, onNewScan }) {
  return (
    <>
      <header className="nav home-header">
        <div>
          <div className="nav-brand">Expense Scanner</div>
          <div className="home-header-sub">Scan a receipt, track it per person</div>
        </div>
      </header>

      <div className="screen-body has-footer">
        {people.length > 0 ? (
          people.map((person) => (
            <button
              key={person.id}
              type="button"
              className="card person-card"
              style={{ '--person-color': person.color }}
              onClick={() => onOpenPerson(person.id)}
            >
              <div className="card-kicker">{person.count} entries</div>
              <div className="card-title">{person.name}</div>
              <div className="cat-strip">
                {person.strip.map((segment) => (
                  <span
                    key={segment.category}
                    style={{ background: segment.color, width: `${segment.pct}%` }}
                  />
                ))}
              </div>
            </button>
          ))
        ) : (
          <div className="empty-state">
            <Receipt size={32} aria-hidden="true" />
            <div className="empty-state-text">
              No expenses scanned yet. Tap “New Scan” to log your first receipt.
            </div>
          </div>
        )}
      </div>

      <div className="sticky-footer">
        <button type="button" className="btn btn-primary btn-block" onClick={onNewScan}>
          <Camera size={16} aria-hidden="true" />
          New Scan
        </button>
      </div>
    </>
  );
}
