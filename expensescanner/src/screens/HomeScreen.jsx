import { ArrowLeft, Camera, Receipt } from 'lucide-react';

/** The staff list: a numbered row per person, a strip showing the shape of
 *  their spend by category, and the running totals across everyone at top. */
export default function HomeScreen({ userName, people, peopleCount, receiptCount, lastScan, onOpenPerson, onNewScan }) {
  return (
    <>
      <header style={{ background: 'var(--color-accent)', color: '#fff', padding: '22px 20px 18px' }}>
        <div style={{ font: '700 11px/1 var(--font-heading)', letterSpacing: '.04em', opacity: 0.8 }}>
          קופה קטנה
        </div>
        <div style={{ font: '700 40px/0.95 var(--font-heading)', letterSpacing: '-.02em', marginTop: 14 }}>
          סורק<br />הוצאות
        </div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 12, maxWidth: '26ch' }}>
          שלום {userName} — צלמו קבלה והיא תתויק אוטומטית.
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '2px solid var(--rtl-border)' }}>
        <div style={{ padding: '14px 16px', borderLeft: '2px solid var(--rtl-border)' }}>
          <div style={{ font: '700 10px/1 var(--font-heading)', color: 'var(--rtl-muted)' }}>אנשים</div>
          <div style={{ font: '700 26px/1 var(--font-heading)', letterSpacing: '-.01em', marginTop: 8 }}>{peopleCount}</div>
        </div>
        <div style={{ padding: '14px 16px', borderLeft: '2px solid var(--rtl-border)' }}>
          <div style={{ font: '700 10px/1 var(--font-heading)', color: 'var(--rtl-muted)' }}>קבלות</div>
          <div style={{ font: '700 26px/1 var(--font-heading)', letterSpacing: '-.01em', marginTop: 8 }}>{receiptCount}</div>
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ font: '700 10px/1 var(--font-heading)', color: 'var(--rtl-muted)' }}>סריקה אחרונה</div>
          <div style={{ font: '700 26px/1 var(--font-heading)', letterSpacing: '-.01em', marginTop: 8 }}>{lastScan}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24 }}>
        {people.length > 0 ? (
          people.map((person) => (
            <div
              key={person.id}
              className="hover-row rise-in"
              style={{ borderBottom: '2px solid var(--rtl-border)', padding: '18px 20px', cursor: 'pointer' }}
              onClick={() => onOpenPerson(person.id)}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <div style={{ font: '700 12px/1 var(--font-heading)', color: 'var(--color-accent-400)', width: 24, flexShrink: 0 }}>
                  {person.num}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '700 24px/1.05 var(--font-heading)', letterSpacing: '-.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {person.name}
                  </div>
                  <div style={{ font: '700 10px/1 var(--font-heading)', color: 'var(--rtl-muted)', marginTop: 8 }}>
                    {person.countLabel}
                  </div>
                </div>
                <ArrowLeft size={18} color="var(--rtl-muted)" style={{ flexShrink: 0 }} aria-hidden="true" />
              </div>
              <div style={{ display: 'flex', height: 6, marginTop: 14, gap: 2 }}>
                {person.strip.map((segment) => (
                  <div key={segment.category} style={{ height: 6, background: segment.color, width: `${segment.pct}%` }} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '48px 20px', borderBottom: '2px solid var(--rtl-border)' }}>
            <Receipt size={28} color="var(--color-accent)" aria-hidden="true" />
            <div style={{ font: '700 20px/1.15 var(--font-heading)', letterSpacing: '-.01em', marginTop: 16, maxWidth: '20ch' }}>
              עדיין לא תויקה קבלה.
            </div>
            <div style={{ fontSize: 13, color: 'var(--rtl-muted)', marginTop: 8 }}>
              הקישו על סריקה חדשה כדי לתעד את הקבלה הראשונה.
            </div>
          </div>
        )}
      </div>

      <div style={{ position: 'sticky', bottom: 0, background: 'var(--rtl-bg)', borderTop: '2px solid var(--rtl-border)', padding: '14px 16px' }}>
        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', font: '700 14px var(--font-heading)', padding: '16px 18px' }}
          onClick={onNewScan}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Camera size={18} aria-hidden="true" />סריקה חדשה
          </span>
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
      </div>
    </>
  );
}
