import { useRef, useState } from 'react';
import { Camera, ChevronLeft, Image as ImageIcon } from 'lucide-react';
import { CATEGORIES } from '../../shared/categories.js';
import { CURRENCY, SHOW_VENDOR_FIELD } from '../config.js';

/**
 * capture → processing → review.
 *
 * "Take Photo" opens the phone's real camera (capture="environment"); the
 * photo goes straight to the reader and comes back as pre-filled fields the
 * user can correct before saving.
 */
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

  return (
    <>
      <header className="nav sub-header">
        <button type="button" className="btn btn-icon" onClick={onBack} aria-label="Back">
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <div className="nav-brand">New Scan</div>
      </header>

      <div className="screen-body">
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
                // Clear it so retaking the same file still fires a change.
                event.target.value = '';
              }}
            />

            {photo ? (
              <img className="captured-photo" src={photo} alt="The receipt you photographed" />
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
                <span className="drop-zone-cap">Or drop a receipt photo here</span>
              </button>
            )}

            {notice && <div className="form-error" style={{ marginTop: 'var(--space-3)' }}>{notice}</div>}

            <div className="capture-actions">
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={16} aria-hidden="true" />
                Take Photo
              </button>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="processing">
            <div className="spinner" role="status" aria-label="Reading the invoice" />
            <div className="processing-label">Reading invoice with AI…</div>
          </div>
        )}

        {step === 'review' && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onSave();
            }}
          >
            {notice && <div className="form-error">{notice}</div>}

            <div className="field">
              <label htmlFor="person-name">Person</label>
              <input
                id="person-name"
                className="input"
                type="text"
                value={form.personName}
                placeholder="Who made this purchase?"
                onChange={(event) => onFormChange('personName', event.target.value)}
              />
            </div>

            {names.length > 0 && (
              <div className="name-suggestions">
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

            <div className="field">
              <label htmlFor="scan-date">Date</label>
              <input
                id="scan-date"
                className="input"
                type="date"
                value={form.date}
                onChange={(event) => onFormChange('date', event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="scan-category">Category</label>
              <select
                id="scan-category"
                className="input"
                value={form.category}
                onChange={(event) => onFormChange('category', event.target.value)}
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            {SHOW_VENDOR_FIELD && (
              <div className="field">
                <label htmlFor="scan-vendor">Product / Vendor</label>
                <input
                  id="scan-vendor"
                  className="input"
                  type="text"
                  value={form.vendor}
                  placeholder="e.g. Shell Station"
                  onChange={(event) => onFormChange('vendor', event.target.value)}
                />
              </div>
            )}

            <div className="field last">
              <label htmlFor="scan-amount">Cost ({CURRENCY})</label>
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

            <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
              {saving ? 'Saving…' : "Save To Person's Sheet"}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
