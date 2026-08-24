import { ArrowRight, Camera, FileSpreadsheet, Link as LinkIcon, Trash2 } from 'lucide-react';
import CategoryIcon from '../components/CategoryIcon.jsx';
import { CHART_TYPE, CURRENCY } from '../config.js';

/** One person's growing record: a hero total, their own chart, every
 *  receipt, and the Excel action — which becomes a direct "keep this file
 *  updated" link on Chrome/Edge desktop (see src/lib/fileLink.js) once
 *  they've pointed it at a file once. */
export default function PersonScreen({
  person,
  excelBtnLabel,
  excelBusy,
  linkedName,
  syncLabel,
  statusMsg,
  onBack,
  onScanAnother,
  onUpdateExcel,
  onChangeExcelFile,
  onDelete,
}) {
  return (
    <>
      <header style={{ borderBottom: '2px solid var(--rtl-border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button type="button" className="btn btn-icon" onClick={onBack} aria-label="חזרה">
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ font: '700 10px/1 var(--font-heading)', color: 'var(--rtl-muted)' }}>{person.countLabel}</div>
          <div style={{ font: '700 24px/1 var(--font-heading)', letterSpacing: '-.01em', marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {person.name}
          </div>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ background: 'var(--color-accent)', color: '#fff', padding: '24px 20px' }}>
          <div style={{ font: '700 10px/1 var(--font-heading)', opacity: 0.8 }}>סה"כ</div>
          <div style={{ font: '700 46px/1 var(--font-heading)', letterSpacing: '-.02em', marginTop: 12 }}>
            {person.total} <span style={{ fontSize: 24, opacity: 0.75 }}>{CURRENCY}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '2px solid var(--rtl-border)' }}>
          <div style={{ padding: '14px 16px', borderLeft: '2px solid var(--rtl-border)' }}>
            <div style={{ font: '700 10px/1 var(--font-heading)', color: 'var(--rtl-muted)' }}>המובילה</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <CategoryIcon name={person.topIcon} size={14} color={person.topColor} />
              <span style={{ font: '700 14px/1 var(--font-heading)' }}>{person.topCategory}</span>
            </div>
          </div>
          <div style={{ padding: '14px 16px', borderLeft: '2px solid var(--rtl-border)' }}>
            <div style={{ font: '700 10px/1 var(--font-heading)', color: 'var(--rtl-muted)' }}>קבלות</div>
            <div style={{ font: '700 18px/1 var(--font-heading)', letterSpacing: '-.01em', marginTop: 8 }}>{person.count}</div>
          </div>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ font: '700 10px/1 var(--font-heading)', color: 'var(--rtl-muted)' }}>ממוצע</div>
            <div style={{ font: '700 18px/1 var(--font-heading)', letterSpacing: '-.01em', marginTop: 8 }}>{person.avgEntry}</div>
          </div>
        </div>

        {person.hasEntries && (
          <div style={{ padding: 20, borderBottom: '2px solid var(--rtl-border)' }}>
            <div style={{ font: '700 10px/1 var(--font-heading)', color: 'var(--rtl-muted)', marginBottom: 16 }}>
              הוצאה לפי קטגוריה
            </div>

            {CHART_TYPE === 'bar' ? (
              person.breakdown.map((bar) => (
                <div key={bar.category} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, font: '700 11px/1 var(--font-heading)' }}>
                      <CategoryIcon name={bar.icon} size={13} color={bar.color} />
                      {bar.categoryLabel}
                    </div>
                    <div style={{ font: '700 13px/1 var(--font-heading)', letterSpacing: '-.01em' }}>{bar.amount} {CURRENCY}</div>
                  </div>
                  <div style={{ height: 8, background: 'var(--rtl-panel-2)' }}>
                    <div style={{ height: 8, background: bar.color, width: `${bar.pct}%`, transition: 'width .4s ease' }} />
                  </div>
                </div>
              ))
            ) : person.linePoints ? (
              <>
                <svg viewBox="0 0 300 120" style={{ width: '100%', height: 120, display: 'block', transform: 'scaleX(-1)' }} role="img" aria-label="הוצאה מצטברת לאורך זמן">
                  <line x1="0" y1="115" x2="300" y2="115" stroke="var(--rtl-border)" strokeWidth="2" />
                  <polyline points={person.linePoints} fill="none" stroke="var(--color-accent)" strokeWidth="2" />
                </svg>
                <div style={{ fontSize: 11, color: 'var(--rtl-muted)', marginTop: 8 }}>הוצאה מצטברת לאורך זמן</div>
              </>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--rtl-muted)' }}>נדרשות לפחות שתי רשומות כדי להציג מגמה.</div>
            )}
          </div>
        )}

        <div style={{ padding: '20px 20px 8px' }}>
          <div style={{ font: '700 10px/1 var(--font-heading)', color: 'var(--rtl-muted)' }}>רשומות</div>
        </div>

        {!person.hasEntries && (
          <div style={{ padding: 20, borderTop: '2px solid var(--rtl-border)', fontSize: 13, color: 'var(--rtl-muted)' }}>
            עדיין לא תויק דבר עבור {person.name}.
          </div>
        )}

        {person.entries.map((entry) => (
          <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderTop: '2px solid var(--rtl-border)' }}>
            <div style={{ width: 4, alignSelf: 'stretch', background: entry.color, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: '700 15px/1.1 var(--font-heading)', letterSpacing: '-.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.vendor}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, font: '700 10px/1 var(--font-heading)', color: 'var(--rtl-muted)' }}>
                <span>{entry.date}</span><span>·</span><span>{entry.categoryLabel}</span>
              </div>
            </div>
            <div style={{ font: '700 16px/1 var(--font-heading)', letterSpacing: '-.01em', flexShrink: 0 }}>{entry.amount}</div>
            <button
              type="button"
              className="btn btn-icon"
              onClick={() => onDelete(entry)}
              aria-label="מחיקת רשומה"
              style={{ color: 'var(--rtl-muted)', flexShrink: 0 }}
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        ))}
        <div style={{ height: 20, borderTop: '2px solid var(--rtl-border)' }} />
      </div>

      <div style={{ position: 'sticky', bottom: 0, background: 'var(--rtl-bg)', borderTop: '2px solid var(--rtl-border)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          type="button"
          className="btn btn-primary btn-block"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', font: '700 14px var(--font-heading)', padding: '16px 18px' }}
          onClick={onScanAnother}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Camera size={18} aria-hidden="true" />סריקת קבלה נוספת
          </span>
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-block"
          disabled={excelBusy}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', font: '700 14px var(--font-heading)', padding: '16px 18px' }}
          onClick={onUpdateExcel}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileSpreadsheet size={18} aria-hidden="true" />{excelBusy ? 'מעדכן…' : excelBtnLabel}
          </span>
          <span style={{ fontSize: 11, color: 'var(--rtl-muted)' }}>.xlsx</span>
        </button>

        {statusMsg && (
          <div style={{ borderRight: '4px solid var(--color-accent)', padding: '10px 12px', background: 'var(--rtl-panel)', fontSize: 12, lineHeight: 1.35, color: 'var(--rtl-text)' }}>
            {statusMsg}
          </div>
        )}

        {linkedName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, font: '700 10px/1 var(--font-heading)', color: 'var(--rtl-muted)' }}>
            <LinkIcon size={12} color="var(--color-accent-400)" style={{ flexShrink: 0 }} aria-hidden="true" />
            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>
              {linkedName} · {syncLabel}
            </span>
            <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={onChangeExcelFile}>שינוי</span>
          </div>
        )}
      </div>
    </>
  );
}
