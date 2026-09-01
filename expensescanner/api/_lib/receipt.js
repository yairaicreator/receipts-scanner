// What a receipt read has to produce, and the instructions for producing it.
// Shared by every reader so switching model providers can't quietly change
// what the app asks for or what it accepts back.

import { CATEGORIES } from '../../shared/categories.js';

export const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export const RECEIPT_FIELDS = {
  date: 'The invoice date printed on the receipt, as YYYY-MM-DD.',
  amount: 'The final amount actually paid, as a plain number with no currency symbol.',
  vendor: 'The business the receipt was issued by.',
  // Not shown anywhere in the app — read only to help pick the category
  // (an item line settles a case the vendor name alone can't).
  subject: 'A 2-6 word summary of what was actually bought, read from the item lines, in the receipt\'s own language.',
  category: 'The expense category this purchase belongs to.',
};

// Written against the user's own receipts (Hebrew, RTL, NIS) and refined over
// the design conversation — the day/month order, the "total to pay after
// discount" rule, and the vendor-vs-customer distinction are all fixes for
// specific misreads they reported.
export const PROMPT = `You are an expert receipt/invoice OCR system reading an Israeli receipt (Hebrew, right-to-left, priced in NIS/₪). Examine each region of the image closely before answering — do not guess from a quick glance.

VENDOR: the large bold business name printed at the very top of the receipt (often in a stylized font). Ignore the street address line, the phone number line, and any "לכבוד" (addressed-to) customer name below it — those are NOT the vendor.

DATE: find the line labeled "תאריך" (date). Israeli receipts print dates as DD/MM/YYYY or DD.MM.YYYY — the FIRST number is the day, the SECOND is the month, the THIRD is the year. Convert to YYYY-MM-DD using the year actually printed on the receipt. Never substitute today's date; the date must come from the image.

AMOUNT: an Israeli receipt usually lists several numbers near the bottom — a subtotal, a VAT/מע"מ line, a discount/הנחה line (sometimes negative), and finally the amount actually charged. The correct value is the one on the line labeled "סה\\"כ לתשלום" or "שולם" or "סכום לתשלום" (total to be paid / amount paid) — normally the LAST total-like number before the payment method, and it already includes any discount. Do NOT use the pre-discount subtotal, the VAT-only amount, or the discount amount itself.

SUBJECT: read the ITEM LINES in the middle of the receipt — the printed product/service descriptions, not the totals. Summarize them in 2-6 words, in the receipt's own language. If there are many lines, name the 2-3 biggest ones. If no item lines are legible, describe the business type instead (e.g. "תחנת דלק"). This is read only to help you pick the category below — it is not shown to the user, so favor whatever is most useful for that.

CATEGORY: decide from the SUBJECT first — what was actually bought outranks the business name (a coffee bought at a fuel station is Catering, not Fuel). Only fall back to the vendor name when the item lines are unreadable. Choose exactly one:
- Fuel — דלק / תחנת דלק / פז / סונול / דור אלון
- Taxi — מונית / גט / יאנגו
- Parking — חניה / חניון
- Hosting — אירוח / מלון / Airbnb / hotel
- Catering — מזון / מכולת / סופרמרקט / מיני מרקט / מסעדה / קפה / כיבוד (any food, groceries or dining)
- Other — anything else

This is one receipt, so report exactly one purchase. Re-check the amount and the date against the image before answering — those two are the most commonly misread.

Respond with JSON only: {"date":"YYYY-MM-DD","amount":0,"vendor":"…","subject":"…","category":"…"}`;

/** Pull the JSON object out of a reply that should be nothing but JSON. */
export function parseReply(text) {
  try {
    return JSON.parse(text);
  } catch {
    // Structured output should make this unreachable; keep the fallback so a
    // stray prose wrapper can't cost the user a scan.
    const match = String(text || '').match(/\{[\s\S]*\}/);
    if (!match) throw new Error('The model did not return readable receipt data.');
    return JSON.parse(match[0]);
  }
}

/**
 * Normalize whatever came back into the fields the form expects. Any field
 * the model couldn't make out becomes null, and the form keeps its own value
 * there rather than showing an invented one. `subject` isn't shown anywhere
 * in the review form — it's passed through so the client can carry it into
 * the saved record regardless, in case it's worth surfacing later.
 */
export function normalizeReading(parsed) {
  const amount = typeof parsed.amount === 'string'
    ? Number.parseFloat(parsed.amount.replace(/[^\d.]/g, ''))
    : parsed.amount;

  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : null,
    amount: Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null,
    vendor: typeof parsed.vendor === 'string' && parsed.vendor.trim() ? parsed.vendor.trim() : null,
    subject: typeof parsed.subject === 'string' && parsed.subject.trim() ? parsed.subject.trim() : null,
    category: CATEGORIES.includes(parsed.category) ? parsed.category : null,
  };
}

const READ_TIMEOUT_MS = 20_000;

/** Thrown when a reader doesn't answer within the read timeout. */
export class ReadTimeoutError extends Error {
  constructor(readerName, ms) {
    super(`${readerName} did not respond within ${ms / 1000}s.`);
    this.name = 'ReadTimeoutError';
  }
}

/**
 * Cap one reader call at `ms` so a slow model call fails fast with a clear
 * message instead of the whole function (60s `maxDuration` in vercel.json)
 * getting killed by Vercel's platform gateway with a bare, useless 504.
 */
export function withReadTimeout(promise, readerName, ms = READ_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new ReadTimeoutError(readerName, ms)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

/** Split and check the browser's data URL. */
export function parseDataUrl(image) {
  const match = /^data:([\w./+-]+);base64,(.+)$/s.exec(String(image || ''));
  if (!match) return { error: 'התמונה שהתקבלה אינה תקינה.' };

  const [, mediaType, data] = match;
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    return { error: `סוג התמונה ${mediaType} אינו נתמך.` };
  }
  const bytes = Math.floor((data.length * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) {
    return { error: 'התמונה גדולה מדי — צלמו שוב או חתכו אותה ונסו שוב.' };
  }
  return { mediaType, data };
}
