// POST /api/scan — read a receipt photo.
//
// The API key stays here, on the server; the browser only ever posts the
// photo. The prototype called the model directly from the page, which a real
// deployment can't do without publishing the key.
//
// Gemini reads the receipt by default. Set SCAN_PROVIDER=claude to use Claude
// instead — same prompt, same fields, so the two can be compared on real
// receipts without touching anything else.

import * as claude from './_lib/readers/claude.js';
import * as gemini from './_lib/readers/gemini.js';
import { parseDataUrl } from './_lib/receipt.js';
import { fail, methodNotAllowed, readJsonBody, sendJson } from './_lib/http.js';

const READERS = { gemini, claude };
const DEFAULT_PROVIDER = 'gemini';

function pickReader() {
  const requested = (process.env.SCAN_PROVIDER || '').trim().toLowerCase();
  if (requested && READERS[requested]) return READERS[requested];
  if (requested) {
    console.warn(`Unknown SCAN_PROVIDER "${requested}"; falling back to ${DEFAULT_PROVIDER}.`);
  }
  // With no provider named, use whichever one actually has a key — so setting
  // just one of the two is enough to get scanning working.
  if (!requested && !READERS[DEFAULT_PROVIDER].isConfigured() && READERS.claude.isConfigured()) {
    return READERS.claude;
  }
  return READERS[DEFAULT_PROVIDER];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  const reader = pickReader();
  if (!reader.isConfigured()) {
    return sendJson(res, 503, {
      error: `קריאת קבלות לא הוגדרה בשרת (חסר משתנה הסביבה ${reader.envVar}). נא למלא את השדות ידנית.`,
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
      return sendJson(res, 200, await reader.read(image));
    } catch (err) {
      lastError = err;
      if (!reader.isRetryable(err)) break;
    }
  }

  return fail(
    res,
    lastError,
    'לא הצלחנו לקרוא את הקבלה אוטומטית — נא למלא את השדות ידנית.',
    502,
  );
}
