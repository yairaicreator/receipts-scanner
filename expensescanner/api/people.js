// GET  /api/people — every person and their full expense history.
// POST /api/people — register a name at first launch, before any receipt
//                    exists, so the staff list shows everyone who's joined,
//                    not just whoever happens to have scanned something first.

import { addPerson, listPeople } from './_lib/store.js';
import { fail, methodNotAllowed, readJsonBody, sendJson } from './_lib/http.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      return sendJson(res, 200, { people: await listPeople() });
    } catch (err) {
      return fail(res, err, 'לא ניתן היה לטעון את רשומות ההוצאות.');
    }
  }

  if (req.method === 'POST') {
    try {
      const name = String((await readJsonBody(req)).name || '').trim();
      if (!name) return sendJson(res, 400, { error: 'יש להזין שם.' });
      if (name.length > 120) return sendJson(res, 400, { error: 'השם ארוך מדי.' });

      const personId = await addPerson(name);
      return sendJson(res, 201, { personId, people: await listPeople() });
    } catch (err) {
      return fail(res, err, 'לא ניתן היה לרשום את השם. נסו שוב.');
    }
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}
