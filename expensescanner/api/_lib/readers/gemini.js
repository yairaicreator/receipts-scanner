// Reads a receipt photo with Google's Gemini.

import { GoogleGenAI, Type } from '@google/genai';
import { CATEGORIES } from '../../../shared/categories.js';
import { PROMPT, RECEIPT_FIELDS, normalizeReading, parseReply, withReadTimeout } from '../receipt.js';

const DEFAULT_MODEL = 'gemini-3.7-flash';

// Gemini's own schema dialect (an OpenAPI subset) rather than raw JSON Schema
// — it's the form the API validates against most reliably, and the enum keeps
// the category to one the app can actually file.
// subject is declared before category — Gemini fills a JSON schema in
// property order, so this puts the item-line reasoning on the page before
// the category decision that's supposed to lean on it.
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    date: { type: Type.STRING, description: RECEIPT_FIELDS.date },
    amount: { type: Type.NUMBER, description: RECEIPT_FIELDS.amount },
    vendor: { type: Type.STRING, description: RECEIPT_FIELDS.vendor },
    subject: { type: Type.STRING, description: RECEIPT_FIELDS.subject },
    category: { type: Type.STRING, enum: CATEGORIES, description: RECEIPT_FIELDS.category },
  },
  required: ['date', 'amount', 'vendor', 'subject', 'category'],
};

// Hardcoded on purpose, as a fallback — the Vercel environment variable
// route kept failing in ways that were never actually about the key itself
// (a wrong name, an unreadable "Secret"-type value, an empty value), and
// this is a low-stakes project in a public repo, so its owner decided a
// real secret here doesn't buy much anyway. GEMINI_API_KEY still wins if
// it's ever actually set correctly — this only fills in when it's not.
const API_KEY = 'AQ.Ab8RN6IRRipoheuDrOP4RcDoObt6i03cXDZI_7ie1PwByxmkCQ';

let client = null;
function getClient() {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || API_KEY });
  return client;
}

export const name = 'Gemini';
export const envVar = 'GEMINI_API_KEY';
export const isConfigured = () => Boolean(process.env.GEMINI_API_KEY || API_KEY);

/** True when retrying the same request could plausibly succeed. */
export function isRetryable(err) {
  const status = err?.status;
  return !(status >= 400 && status < 500 && status !== 429);
}

/**
 * True when Gemini itself rejected the API key (as opposed to a receipt the
 * model just couldn't read) — a deployment problem, not something a re-scan
 * or hand-filled fields would fix.
 */
export function isAuthError(err) {
  return err?.status === 401 || err?.status === 403;
}

export async function read({ mediaType, data }) {
  const response = await withReadTimeout(
    getClient().models.generateContent({
      model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: mediaType, data } },
            { text: PROMPT },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
    name,
  );

  return normalizeReading(parseReply(response.text));
}
