// POST /api/scan — read a receipt photo with Claude's vision.
//
// The API key stays here, on the server; the browser only ever posts the
// photo. The prototype called the model directly from the page, which a real
// deployment can't do without publishing the key.

import Anthropic from '@anthropic-ai/sdk';
import { CATEGORIES } from '../shared/categories.js';
import { fail, methodNotAllowed, readJsonBody, sendJson } from './_lib/http.js';

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';
const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

// One row per photo: a receipt is a single purchase on a single date.
const RECEIPT_SCHEMA = {
  type: 'object',
  properties: {
    date: {
      type: 'string',
      description: 'The invoice date printed on the receipt, as YYYY-MM-DD.',
    },
    amount: {
      type: 'number',
      description: 'The final amount actually paid, as a plain number with no currency symbol.',
    },
    vendor: {
      type: 'string',
      description: 'The business the receipt was issued by.',
    },
    category: {
      type: 'string',
      enum: CATEGORIES,
      description: 'The expense category this purchase belongs to.',
    },
  },
  required: ['date', 'amount', 'vendor', 'category'],
  additionalProperties: false,
};

// Written against the user's own receipts (Hebrew, RTL, NIS) and refined over
// the design conversation — the day/month order, the "total to pay after
// discount" rule, and the vendor-vs-customer distinction are all fixes for
// specific misreads they reported.
const PROMPT = `You are an expert receipt/invoice OCR system reading an Israeli receipt (Hebrew, right-to-left, priced in NIS/₪). Examine each region of the image closely before answering — do not guess from a quick glance.

VENDOR: the large bold business name printed at the very top of the receipt (often in a stylized font). Ignore the street address line, the phone number line, and any "לכבוד" (addressed-to) customer name below it — those are NOT the vendor.

DATE: find the line labeled "תאריך" (date). Israeli receipts print dates as DD/MM/YYYY or DD.MM.YYYY — the FIRST number is the day, the SECOND is the month, the THIRD is the year. Convert to YYYY-MM-DD using the year actually printed on the receipt. Never substitute today's date; the date must come from the image.

AMOUNT: an Israeli receipt usually lists several numbers near the bottom — a subtotal, a VAT/מע"מ line, a discount/הנחה line (sometimes negative), and finally the amount actually charged. The correct value is the one on the line labeled "סה\\"כ לתשלום" or "שולם" or "סכום לתשלום" (total to be paid / amount paid) — normally the LAST total-like number before the payment method, and it already includes any discount. Do NOT use the pre-discount subtotal, the VAT-only amount, or the discount amount itself.

CATEGORY: classify from the vendor name and the item lines:
- Fuel — דלק / תחנת דלק / פז / סונול / דור אלון
- Taxi — מונית / גט / יאנגו
- Parking — חניה / חניון
- Hosting — אירוח / מלון / Airbnb / hotel
- Catering — מזון / מכולת / סופרמרקט / מיני מרקט / מסעדה / קפה / כיבוד (any food, groceries or dining)
- Other — anything else

This is one receipt, so report exactly one purchase. Re-check the amount and the date against the image before answering — those two are the most commonly misread.`;

let client = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

function parseDataUrl(image) {
  const match = /^data:([\w./+-]+);base64,(.+)$/s.exec(String(image || ''));
  if (!match) return { error: 'Expected a base64 data URL for the photo.' };
  const [, mediaType, data] = match;
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    return { error: `Unsupported image type ${mediaType}.` };
  }
  const bytes = Math.floor((data.length * 3) / 4);
  if (bytes > MAX_IMAGE_BYTES) {
    return { error: 'That photo is too large — retake it or crop it and try again.' };
  }
  return { mediaType, data };
}

function extractJson(message) {
  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
  try {
    return JSON.parse(text);
  } catch {
    // Structured output should make this unreachable; keep the fallback so a
    // stray prose wrapper can't cost the user a scan.
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('The model did not return readable receipt data.');
    return JSON.parse(match[0]);
  }
}

async function readReceipt({ mediaType, data }) {
  const message = await getClient().messages.create({
    model: MODEL,
    max_tokens: 4000,
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: RECEIPT_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
          { type: 'text', text: PROMPT },
        ],
      },
    ],
  });

  if (message.stop_reason === 'refusal') {
    throw new Error('The model declined to read this image.');
  }

  const parsed = extractJson(message);
  const amount = typeof parsed.amount === 'string'
    ? parseFloat(parsed.amount.replace(/[^\d.]/g, ''))
    : parsed.amount;

  return {
    date: /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : null,
    amount: Number.isFinite(amount) ? Math.round(amount * 100) / 100 : null,
    vendor: typeof parsed.vendor === 'string' && parsed.vendor.trim() ? parsed.vendor.trim() : null,
    category: CATEGORIES.includes(parsed.category) ? parsed.category : null,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  if (!process.env.ANTHROPIC_API_KEY) {
    return sendJson(res, 503, {
      error: 'Receipt reading is not configured on the server (ANTHROPIC_API_KEY is missing). Fill the fields in by hand.',
    });
  }

  const body = await readJsonBody(req);
  const image = parseDataUrl(body.image);
  if (image.error) return sendJson(res, 400, { error: image.error });

  // One automatic retry: a single dropped call shouldn't cost the user a
  // re-shoot of the receipt.
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return sendJson(res, 200, await readReceipt(image));
    } catch (err) {
      lastError = err;
      if (err instanceof Anthropic.BadRequestError || err instanceof Anthropic.AuthenticationError) {
        break; // retrying an invalid request or a bad key never helps
      }
    }
  }

  return fail(
    res,
    lastError,
    'Could not read the receipt automatically — please fill in the fields by hand.',
    502,
  );
}
