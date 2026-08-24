// POST   /api/expenses      — append one receipt to a person's record
// DELETE /api/expenses?id=… — remove one receipt
//
// A save always APPENDS. The person is matched on their normalized name, so
// the second, third and tenth photo of the same name all land in that one
// growing record instead of starting a new one.

import { CATEGORIES } from '../shared/categories.js';
import { addExpense, deleteExpense, listPeople, newId } from './_lib/store.js';
import { fail, methodNotAllowed, readJsonBody, sendJson } from './_lib/http.js';

function validate(body) {
  const personName = String(body.personName || '').trim();
  if (!personName) return { error: 'מי ביצע את הרכישה? יש להזין שם.' };
  if (personName.length > 120) return { error: 'השם ארוך מדי.' };

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'יש להזין עלות גדולה מאפס.' };
  if (amount > 1e9) return { error: 'העלות חורגת מהטווח האפשרי.' };

  const date = String(body.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'יש להזין תאריך תקין.' };

  const category = CATEGORIES.includes(body.category) ? body.category : CATEGORIES[0];
  const vendor = String(body.vendor || '').trim().slice(0, 200) || '—';
  // Not user-editable — carried through only because the AI reasoned from it
  // to pick the category above.
  const subject = String(body.subject || '').trim().slice(0, 200);

  return {
    personName,
    expense: { id: newId(), date, category, amount: Math.round(amount * 100) / 100, vendor, subject },
  };
}

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const parsed = validate(await readJsonBody(req));
      if (parsed.error) return sendJson(res, 400, { error: parsed.error });

      const personId = await addExpense(parsed);
      // Return the whole store: the client re-renders every screen from the
      // full accumulated set, so nothing it holds can drift out of date.
      return sendJson(res, 201, { personId, people: await listPeople() });
    }

    if (req.method === 'DELETE') {
      const id = new URL(req.url, 'http://localhost').searchParams.get('id');
      if (!id) return sendJson(res, 400, { error: 'חסר מזהה הקבלה.' });
      const removed = await deleteExpense(id);
      if (!removed) return sendJson(res, 404, { error: 'הקבלה הזו כבר לא קיימת.' });
      return sendJson(res, 200, { people: await listPeople() });
    }

    return methodNotAllowed(res, ['POST', 'DELETE']);
  } catch (err) {
    fail(res, err, 'לא ניתן היה לשמור את השינוי. נסו שוב.');
  }
}
