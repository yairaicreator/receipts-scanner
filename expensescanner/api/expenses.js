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
  if (!personName) return { error: 'Who made this purchase? A name is required.' };
  if (personName.length > 120) return { error: 'That name is too long.' };

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'Enter a cost greater than zero.' };
  if (amount > 1e9) return { error: 'That cost is out of range.' };

  const date = String(body.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Enter a valid date.' };

  const category = CATEGORIES.includes(body.category) ? body.category : CATEGORIES[0];
  const vendor = String(body.vendor || '').trim().slice(0, 200) || '—';

  return {
    personName,
    expense: { id: newId(), date, category, amount: Math.round(amount * 100) / 100, vendor },
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
      if (!id) return sendJson(res, 400, { error: 'Missing the expense id.' });
      const removed = await deleteExpense(id);
      if (!removed) return sendJson(res, 404, { error: 'That receipt no longer exists.' });
      return sendJson(res, 200, { people: await listPeople() });
    }

    return methodNotAllowed(res, ['POST', 'DELETE']);
  } catch (err) {
    fail(res, err, 'Could not save the change. Please try again.');
  }
}
