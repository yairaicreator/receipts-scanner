import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

/** Write a name once, every receipt scanned under it files itself there from
 *  then on. Reached two ways: true first launch on a device (no way back —
 *  there's nowhere else yet), or "join with a new name" from the staff list
 *  on a device someone already uses (onBack lets that one cancel). */
export default function WelcomeScreen({ onJoin, onBack }) {
  const [name, setName] = useState('');
  const canJoin = name.trim().length > 1;

  function submit(event) {
    event.preventDefault();
    if (canJoin) onJoin(name.trim());
  }

  return (
    <>
      <div style={{ background: 'var(--color-accent)', color: '#fff', padding: '40px 24px 34px', position: 'relative' }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="חזרה"
            style={{
              position: 'absolute', top: 16, insetInlineStart: 16,
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: '2px solid rgba(255,255,255,0.35)', borderRadius: 10,
              color: '#fff', cursor: 'pointer',
            }}
          >
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        )}
        <div style={{ font: '700 11px/1 var(--font-heading)', letterSpacing: '.04em', opacity: 0.8 }}>
          קופה קטנה
        </div>
        <div style={{ font: '700 44px/0.95 var(--font-heading)', letterSpacing: '-.02em', marginTop: 18 }}>
          ברוכים<br />הבאים
        </div>
        <div style={{ fontSize: 14, opacity: 0.88, marginTop: 16, maxWidth: '28ch' }}>
          הזינו את שמכם פעם אחת. כל קבלה שתסרקו תתויק אוטומטית תחתיו.
        </div>
      </div>

      <form onSubmit={submit} style={{ flex: 1, padding: '28px 24px' }}>
        <div className="field" style={{ marginBottom: 24 }}>
          <label htmlFor="welcome-name">השם שלך</label>
          <input
            id="welcome-name"
            className="input"
            type="text"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="לדוגמה: ריקי לוי"
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={!canJoin}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', font: '700 14px var(--font-heading)', padding: '16px 18px' }}
        >
          <span>הצטרפות</span>
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div style={{ fontSize: 12, color: 'var(--rtl-muted)', marginTop: 16, maxWidth: '34ch' }}>
          נשמר במכשיר זה בלבד. עדיין ניתן לתייק קבלות עבור אחרים.
        </div>
      </form>
    </>
  );
}
