// GET /api/people — every person and their full expense history.

import { listPeople } from './_lib/store.js';
import { fail, methodNotAllowed, sendJson } from './_lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    sendJson(res, 200, { people: await listPeople() });
  } catch (err) {
    fail(res, err, 'לא ניתן היה לטעון את רשומות ההוצאות.');
  }
}
