/** Small helpers shared by the serverless functions. */

export function sendJson(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(body));
}

export function methodNotAllowed(res, allowed) {
  res.setHeader('Allow', allowed.join(', '));
  sendJson(res, 405, { error: `Method not allowed. Use ${allowed.join(' or ')}.` });
}

/**
 * Vercel parses JSON bodies automatically, but `vercel dev` and other runners
 * don't always — read the stream when the body hasn't been parsed for us.
 */
export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

/** Never leak a stack trace or a connection string to the browser. */
export function fail(res, err, message, status = 500) {
  console.error(message, err);
  sendJson(res, status, { error: message });
}
