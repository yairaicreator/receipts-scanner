import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

/** First launch on this device: write your name once, every receipt you
 *  scan files itself under it from then on. */
export default function WelcomeScreen({ onJoin }) {
  const [name, setName] = useState('');
  const canJoin = name.trim().length > 1;

  function submit(event) {
    event.preventDefault();
    if (canJoin) onJoin(name.trim());
  }

  return (
    <>
      <div style={{ background: 'var(--color-accent)', color: '#fff', padding: '40px 24px 34px' }}>
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
