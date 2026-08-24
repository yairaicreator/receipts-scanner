// Links a person's page to a real file on the user's computer, so "Update
// Excel" writes straight into that same file every time instead of handing
// back a new download — the thing the user asked for repeatedly while this
// app was being designed ("put it in the graph I already have, don't open a
// new file"). Chrome/Edge desktop only (the File System Access API isn't on
// iOS/Android or Safari); every caller falls back to share-or-download where
// it isn't available.

export const FS_SUPPORTED = typeof window !== 'undefined' && !!window.showSaveFilePicker;
export const IN_FRAME = typeof window !== 'undefined' && window.self !== window.top;

const DB_NAME = 'expense-scanner-fs';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('handles');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putHandle(personId, handle) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(handle, personId);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function getHandle(personId) {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction('handles', 'readonly');
      const req = tx.objectStore('handles').get(personId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function deleteHandle(personId) {
  try {
    const db = await openDb();
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').delete(personId);
  } catch {
    // Nothing to clean up if the store never opened.
  }
}

/** Resolves true once write access to `handle` is actually granted. */
export async function ensureWritePermission(handle, interactive) {
  try {
    const opts = { mode: 'readwrite' };
    if ((await handle.queryPermission(opts)) === 'granted') return true;
    if (!interactive) return false;
    return (await handle.requestPermission(opts)) === 'granted';
  } catch {
    return false;
  }
}
