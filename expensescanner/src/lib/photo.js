import { MAX_PHOTO_DIMENSION } from '../config.js';

/**
 * Downscale a camera photo before it goes to the server. A modern phone
 * shoots 12MP files that are slow to upload and can exceed the request
 * limit; capping the longest edge keeps the read fast without costing
 * legibility.
 */
export function toScaledDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('לא ניתן היה לקרוא את התמונה.'));
    reader.onload = () => {
      const img = new Image();
      // If decoding fails, send the original bytes rather than nothing.
      img.onerror = () => resolve(reader.result);
      img.onload = () => {
        const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Hand the finished spreadsheet to the phone's share sheet so it can be
 * opened straight in Excel; fall back to a plain download where sharing a
 * file isn't supported (most desktop browsers).
 */
export async function shareOrDownload(file) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return;
    } catch (err) {
      // A cancelled share sheet is the user saying no — don't then force a
      // download on them.
      if (err?.name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
