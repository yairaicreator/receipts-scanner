/** Thin wrapper over the serverless functions in /api. */

async function request(url, options) {
  const res = await fetch(url, options);
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : null;
  if (!res.ok) {
    throw new Error(body?.error || `הבקשה נכשלה (${res.status}).`);
  }
  return body;
}

export function fetchPeople() {
  return request('/api/people').then((body) => body.people);
}

/** Appends one receipt; returns the whole store plus the person it landed on. */
export function saveExpense(entry) {
  return request('/api/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  });
}

export function deleteExpense(expenseId) {
  return request(`/api/expenses?id=${encodeURIComponent(expenseId)}`, { method: 'DELETE' })
    .then((body) => body.people);
}

/** Reads a receipt photo. Returns { date, amount, vendor, category }, any of
 *  which may be null when the model couldn't make out that field. */
export function scanReceipt(dataUrl) {
  return request('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: dataUrl }),
  });
}

/** The person's whole record as an .xlsx, ready to share or download. */
export async function fetchExportFile(personId) {
  const res = await fetch(`/api/export?personId=${encodeURIComponent(personId)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || 'לא ניתן היה ליצור את קובץ האקסל.');
  }
  const blob = await res.blob();
  const name = filenameFrom(res.headers.get('content-disposition'));
  return new File([blob], name, { type: blob.type });
}

function filenameFrom(disposition) {
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition || '');
  if (utf8) {
    try { return decodeURIComponent(utf8[1]); } catch { /* fall through */ }
  }
  const plain = /filename="([^"]+)"/i.exec(disposition || '');
  return plain ? plain[1] : 'expenses.xlsx';
}
