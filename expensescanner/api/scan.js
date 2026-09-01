// POST /api/scan — read a receipt photo.
//
// The API key stays here, on the server; the browser only ever posts the
// photo. The prototype called the model directly from the page, which a real
// deployment can't do without publishing the key.
//
// Gemini reads the receipt.

import * as gemini from './_lib/readers/gemini.js';
import { parseDataUrl } from './_lib/receipt.js';
import { fail, methodNotAllowed, readJsonBody, sendJson } from './_lib/http.js';

const reader = gemini;

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  if (!reader.isConfigured()) {
    // Deliberately in English and deliberately specific (not the app's usual
    // Hebrew) — this is a setup problem for whoever manages the deployment,
    // not a normal in-app message, and the exact state of the variable is
    // what actually narrows down what's wrong with it.
    const raw = process.env[reader.envVar];
    const state = raw === undefined
      ? 'is not set at all on this deployment'
      : raw.trim() === ''
        ? `is set but empty (length ${raw.length})`
        : `is set (length ${raw.length}) but the server still didn't accept it as configured`;
    return sendJson(res, 503, {
      error: `Receipt scanning isn't available: the environment variable ${reader.envVar} ${state}. In Vercel: Settings -> Environment Variables -> edit ${reader.envVar}, make sure it holds the real key with Production checked -> Save -> then redeploy. You can still fill in the fields by hand below for now.`,
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

  if (reader.isAuthError?.(lastError)) {
    // Same deliberately-English, deliberately-specific pattern as the
    // isConfigured() branch above: this is the key itself being rejected by
    // Gemini, not a receipt the model just couldn't make out, so a re-scan
    // or hand-filled fields won't fix it — whoever manages the deployment
    // needs to know the actual reason.
    return sendJson(res, 502, {
      error: `Receipt scanning is failing: ${reader.name} rejected the configured API key (HTTP ${lastError.status} — the key isn't valid or has been revoked). It needs to be replaced with a fresh key from https://aistudio.google.com/apikey. You can still fill in the fields by hand below for now.`,
    });
  }

  return fail(
    res,
    lastError,
    'לא הצלחנו לקרוא את הקבלה אוטומטית — נא למלא את השדות ידנית.',
    502,
  );
}
