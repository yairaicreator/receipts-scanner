// Reads a receipt photo with Google's Gemini.

import { GoogleGenAI, Type } from '@google/genai';
import { CATEGORIES } from '../../../shared/categories.js';
import { PROMPT, RECEIPT_FIELDS, normalizeReading, parseReply } from '../receipt.js';

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

let client = null;
function getClient() {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export const name = 'Gemini';
export const envVar = 'GEMINI_API_KEY';
export const isConfigured = () => Boolean(process.env.GEMINI_API_KEY);

/** True when retrying the same request could plausibly succeed. */
export function isRetryable(err) {
  const status = err?.status;
  return !(status >= 400 && status < 500 && status !== 429);
}

export async function read({ mediaType, data }) {
  const response = await getClient().models.generateContent({
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
  });

  return normalizeReading(parseReply(response.text));
}
