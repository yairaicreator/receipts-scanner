import { useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Image as ImageIcon } from 'lucide-react';
import { CATEGORIES, CATEGORY_LABEL_HE } from '../../shared/categories.js';
import { CURRENCY, SHOW_VENDOR_FIELD } from '../config.js';

/** capture → processing → review, all in Hebrew/RTL.
 *  "צילום תמונה" opens the phone's real camera; the photo goes straight to
 *  the reader and comes back as pre-filled fields the user can correct. */
export default function ScanScreen({
  step,
  photo,
  form,
  names,
  notice,
  saving,
  onBack,
  onPhotoChosen,
  onFormChange,
  onSave,
}) {
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(fileList) {
    const file = fileList?.[0];
    if (file) onPhotoChosen(file);
  }

  const stepNum = step === 'review' ? '2' : '1';
  const stepTitle = step === 'review' ? 'בדיקה' : step === 'processing' ? 'קורא' : 'צילום';

  return (
    <>
      <header style={{ borderBottom: '2px solid var(--rtl-border)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button type="button" className="btn btn-icon" onClick={onBack} aria-label="חזרה">
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        <div>
          <div style={{ font: '700 10px/1 var(--font-heading)', color: 'var(--rtl-muted)' }}>שלב {stepNum} מתוך 2</div>
          <div style={{ font: '700 22px/1 var(--font-heading)', letterSpacing: '-.01em', marginTop: 6 }}>{stepTitle}</div>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {step === 'capture' && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(event) => {
                handleFiles(event.target.files);
                event.target.value = '';
              }}
            />

            <div style={{ border: '2px solid var(--rtl-border)', background: 'var(--rtl-panel)' }}>
              {photo ? (
                <img className="captured-photo" src={photo} alt="הקבלה שצילמתם" />
              ) : (
                <button
                  type="button"
                  className="drop-zone"
                  data-over={dragging ? '' : undefined}
                  onClick={() => fileInputRef.current?.click()}
                  onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
                  onDragOver={(event) => { event.preventDefault(); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    handleFiles(event.dataTransfer.files);
                  }}
                >
                  <ImageIcon size={28} aria-hidden="true" />
                  <span className="drop-zone-cap">גררו לכאן תמונת קבלה</span>
                </button>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--rtl-muted)', marginTop: 12, maxWidth: '34ch' }}>
              החזיקו את הקבלה שטוחה, מלאו את הפריים, הימנעו מצללים על שורת הסכום.
            </div>

            {notice && (
              <div style={{ fontSize: 13, color: 'var(--color-accent)', marginTop: 12 }}>{notice}</div>
            )}

            <button
              type="button"
              className="btn btn-primary btn-block"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', font: '700 14px var(--font-heading)', padding: '16px 18px', marginTop: 20 }}
              onClick={() => fileInputRef.current?.click()}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Camera size={18} aria-hidden="true" />צילום תמונה
              </span>
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
          </>
        )}

        {step === 'processing' && (
          <div style={{ background: 'var(--color-accent)', color: '#fff', padding: '28px 20px' }}>
            <div style={{ font: '700 10px/1 var(--font-heading)', opacity: 0.8 }}>קורא</div>
            <div style={{ font: '700 30px/1.05 var(--font-heading)', letterSpacing: '-.02em', marginTop: 14, maxWidth: '16ch' }}>
              מחלץ תאריך, סכום וספק מהקבלה.
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,.3)', marginTop: 24, overflow: 'hidden' }}>
              <div className="sweep-bar" style={{ height: 4, width: '25%', background: '#fff', animation: 'sweep 1.1s ease-in-out infinite' }} />
            </div>
          </div>
        )}

        {step === 'review' && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSave();
            }}
          >
            <div style={{ font: '700 10px/1 var(--font-heading)', color: 'var(--rtl-muted)', marginBottom: 14 }}>
              בדקו לפני התיוק
            </div>

            {notice && (
              <div style={{ fontSize: 13, color: 'var(--color-accent)', marginBottom: 14 }}>{notice}</div>
            )}

            <div className="field" style={{ marginBottom: 18 }}>
              <label htmlFor="person-name">שם</label>
              <input
                id="person-name"
                className="input"
                type="text"
                value={form.personName}
                placeholder="מי ביצע את הרכישה?"
                onChange={(event) => onFormChange('personName', event.target.value)}
              />
            </div>

            {names.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '-8px 0 20px' }}>
                {names.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="tag tag-outline"
                    onClick={() => onFormChange('personName', name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
              <div className="field">
                <label htmlFor="scan-date">תאריך</label>
                <input
                  id="scan-date"
                  className="input"
                  type="date"
                  value={form.date}
                  onChange={(event) => onFormChange('date', event.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="scan-amount">עלות ({CURRENCY})</label>
                <input
                  id="scan-amount"
                  className="input"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  placeholder="0.00"
                  onChange={(event) => onFormChange('amount', event.target.value)}
                />
              </div>
            </div>

            <div className="field" style={{ marginBottom: 18 }}>
              <label htmlFor="scan-category">קטגוריה</label>
              <select
                id="scan-category"
                className="input"
                value={form.category}
                onChange={(event) => onFormChange('category', event.target.value)}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>{CATEGORY_LABEL_HE[category]}</option>
                ))}
              </select>
            </div>

            {SHOW_VENDOR_FIELD && (
              <div className="field" style={{ marginBottom: 24 }}>
                <label htmlFor="scan-vendor">מוצר / ספק</label>
                <input
                  id="scan-vendor"
                  className="input"
                  type="text"
                  value={form.vendor}
                  placeholder="לדוגמה: תחנת דלק"
                  onChange={(event) => onFormChange('vendor', event.target.value)}
                />
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', font: '700 14px var(--font-heading)', padding: '16px 18px' }}
            >
              <span>{saving ? 'שומר…' : 'שמירת קבלה'}</span>
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
          </form>
        )}
      </div>
    </>
  );
}
