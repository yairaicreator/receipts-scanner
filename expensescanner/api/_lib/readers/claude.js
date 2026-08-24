// Reads a receipt photo with Anthropic's Claude. Kept alongside the Gemini
// reader so the two can be compared on real receipts — set SCAN_PROVIDER=claude.

import Anthropic from '@anthropic-ai/sdk';
import { CATEGORIES } from '../../../shared/categories.js';
import { PROMPT, RECEIPT_FIELDS, normalizeReading, parseReply } from '../receipt.js';

const DEFAULT_MODEL = 'claude-opus-5';

// subject before category, matching the prompt's own JSON order — the
// item-line reasoning lands on the page before the category it should drive.
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    date: { type: 'string', description: RECEIPT_FIELDS.date },
    amount: { type: 'number', description: RECEIPT_FIELDS.amount },
    vendor: { type: 'string', description: RECEIPT_FIELDS.vendor },
    subject: { type: 'string', description: RECEIPT_FIELDS.subject },
    category: { type: 'string', enum: CATEGORIES, description: RECEIPT_FIELDS.category },
  },
  required: ['date', 'amount', 'vendor', 'subject', 'category'],
  additionalProperties: false,
};

let client = null;
function getClient() {
  if (!client) client = new Anthropic();
  return client;
}

export const name = 'Claude';
export const envVar = 'ANTHROPIC_API_KEY';
export const isConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);

/** True when retrying the same request could plausibly succeed. */
export function isRetryable(err) {
  return !(err instanceof Anthropic.BadRequestError || err instanceof Anthropic.AuthenticationError);
}

export async function read({ mediaType, data }) {
  const message = await getClient().messages.create({
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
    max_tokens: 4000,
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
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

  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

  return normalizeReading(parseReply(text));
}
