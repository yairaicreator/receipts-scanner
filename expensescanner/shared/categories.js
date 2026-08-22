// Shared between the browser bundle and the serverless functions — the
// category list has to agree on both sides or a scan can come back with a
// value the form can't select and the export can't place in a column.

export const CATEGORIES = ['Fuel', 'Taxi', 'Parking', 'Hosting', 'Catering', 'Other'];

// Hebrew column headings from the קופה קטנה template the user supplied
// (project/uploads/petty_cash_report.xlsx), in sheet column order.
export const CATEGORY_COLUMN = {
  Catering: 2, // כיבוד
  Hosting: 3, // אירוח
  Parking: 4, // חניה
  Fuel: 5, // דלק
  Taxi: 6, // מוניות
  Other: 7, // שונות
};

export const CATEGORY_COLOR = {
  Fuel: '#ec3013',
  Taxi: '#1d7a5f',
  Parking: '#c98a12',
  Hosting: '#2f6fb0',
  Catering: '#7a4fc9',
  Other: '#5c5a58',
};

// Lucide icon names.
export const CATEGORY_ICON = {
  Fuel: 'Fuel',
  Taxi: 'Car',
  Parking: 'CircleParking',
  Hosting: 'Hotel',
  Catering: 'Utensils',
  Other: 'MoreHorizontal',
};

export const PERSON_COLORS = ['#ec3013', '#2f6fb0', '#1d7a5f', '#c98a12', '#7a4fc9', '#c9407a'];

/** Repeat scans must land on the same person — match on a normalized name. */
export function normalizeName(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function money(n) {
  return (Math.round(Number(n) * 100) / 100).toFixed(2);
}
