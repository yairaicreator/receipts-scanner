// GET /api/export?personId=… — one person's full record as an .xlsx laid out
// exactly like the קופה קטנה template the user supplied
// (project/uploads/petty_cash_report.xlsx): merged title, the blue/yellow
// header block, one row per receipt with the amount under its own category
// column, live SUM totals and the peach grand-total cell, sheet right-to-left.
//
// The sheet is rebuilt from the person's whole accumulated history on every
// call, so each new scan produces the same file, one row longer.

import ExcelJS from 'exceljs';
import { CATEGORY_COLUMN } from '../shared/categories.js';
import { getPerson } from './_lib/store.js';
import { fail, methodNotAllowed, sendJson } from './_lib/http.js';

const TITLE = 'דו"ח הוצאות קופה קטנה';
const CATEGORY_HEADERS = ['תאריך החשבונית', 'כיבוד', 'אירוח', 'חניה', 'דלק', 'מוניות', 'שונות', 'הערות'];

const BLUE = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
const YELLOW = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
const PEACH = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };

const THIN = { style: 'thin' };
const BOX = { top: THIN, left: THIN, right: THIN, bottom: THIN };
const CENTER = { horizontal: 'center', vertical: 'center' };
const BASE_FONT = { name: 'Arial', size: 11 };
const BOLD = { ...BASE_FONT, bold: true };

const DATE_FORMAT = 'dd/mm/yyyy';
const MONEY_FORMAT = '#,##0.00';

/** Minimum body of the form — the template prints 15 blank rows. */
const MIN_DATA_ROWS = 15;

/** UTC midnight keeps the calendar day intact through Excel's serial date. */
function excelDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function buildWorkbook(person) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Expense Scanner';
  wb.created = new Date();

  const ws = wb.addWorksheet('קופה קטנה', {
    views: [{ rightToLeft: true }],
  });
  ws.columns = [
    { width: 16 }, { width: 11 }, { width: 11 }, { width: 11 },
    { width: 11 }, { width: 11 }, { width: 13 }, { width: 20 },
  ];

  // ── Title ───────────────────────────────────────────────────────────
  ws.mergeCells('A1:H1');
  const title = ws.getCell('A1');
  title.value = TITLE;
  title.font = { name: 'Arial', size: 18, bold: true };
  title.alignment = CENTER;
  ws.getRow(1).height = 31.5;

  // ── Header block: blue label cell, yellow value cell ─────────────────
  const headerFields = [
    ['A3', 'שם סניף', 'B3', ''],
    ['D3', 'שם עובד', 'E3', person.name],
    ['G3', 'בנק', 'H3', ''],
    ['A4', "מס' סניף", 'B4', ''],
    ['D4', 'מס ת.ז.', 'E4', ''],
    ['G4', 'סניף', 'H4', ''],
    ['G5', 'חשבון', 'H5', ''],
  ];
  for (const [labelRef, label, valueRef, value] of headerFields) {
    const labelCell = ws.getCell(labelRef);
    labelCell.value = label;
    labelCell.font = BOLD;
    labelCell.fill = BLUE;
    labelCell.border = BOX;
    labelCell.alignment = CENTER;

    const valueCell = ws.getCell(valueRef);
    valueCell.value = value || null;
    valueCell.font = BASE_FONT;
    valueCell.fill = YELLOW;
    valueCell.border = BOX;
    valueCell.alignment = CENTER;
  }
  for (const r of [3, 4, 5]) ws.getRow(r).height = 19.5;

  // ── Column headings ─────────────────────────────────────────────────
  const HEADER_ROW = 8;
  ws.getRow(HEADER_ROW).height = 24;
  CATEGORY_HEADERS.forEach((heading, i) => {
    const cell = ws.getRow(HEADER_ROW).getCell(i + 1);
    cell.value = heading;
    cell.font = BOLD;
    cell.fill = BLUE;
    cell.border = BOX;
    cell.alignment = CENTER;
  });

  // ── One row per receipt, oldest first ───────────────────────────────
  const entries = [...person.expenses].sort((a, b) => a.date.localeCompare(b.date));
  const firstDataRow = HEADER_ROW + 1;
  const dataRowCount = Math.max(entries.length, MIN_DATA_ROWS);

  for (let i = 0; i < dataRowCount; i++) {
    const row = ws.getRow(firstDataRow + i);
    row.height = 19.5;
    for (let col = 1; col <= 8; col++) {
      const cell = row.getCell(col);
      cell.font = BASE_FONT;
      cell.border = BOX;
      cell.alignment = CENTER;
      if (col === 1) cell.numFmt = DATE_FORMAT;
      else if (col <= 7) cell.numFmt = MONEY_FORMAT;
    }
    const entry = entries[i];
    if (!entry) continue;
    row.getCell(1).value = excelDate(entry.date);
    row.getCell(CATEGORY_COLUMN[entry.category] ?? CATEGORY_COLUMN.Other).value = entry.amount;
    row.getCell(8).value = entry.vendor;
  }

  // ── Per-category totals ─────────────────────────────────────────────
  const lastDataRow = firstDataRow + dataRowCount - 1;
  const totalsRowNumber = lastDataRow + 1;
  const totalsRow = ws.getRow(totalsRowNumber);
  totalsRow.height = 21.75;
  for (let col = 1; col <= 8; col++) {
    const cell = totalsRow.getCell(col);
    cell.font = BOLD;
    cell.fill = BLUE;
    cell.border = BOX;
    cell.alignment = CENTER;
    if (col >= 2 && col <= 7) {
      const letter = String.fromCharCode(64 + col);
      // Live formulas, like the template — editing a cell by hand still
      // reconciles the totals.
      cell.value = { formula: `SUM(${letter}${firstDataRow}:${letter}${lastDataRow})` };
      cell.numFmt = MONEY_FORMAT;
    }
  }
  totalsRow.getCell(1).value = 'סה"כ';

  // ── Grand total ─────────────────────────────────────────────────────
  const grandRowNumber = totalsRowNumber + 2;
  const grandRow = ws.getRow(grandRowNumber);
  grandRow.height = 15;
  const grandCell = grandRow.getCell(1);
  grandCell.value = { formula: `SUM(B${totalsRowNumber}:G${totalsRowNumber})` };
  grandCell.font = { name: 'Arial', size: 12, bold: true };
  grandCell.fill = PEACH;
  grandCell.border = BOX;
  grandCell.alignment = CENTER;
  grandCell.numFmt = MONEY_FORMAT;

  const grandLabel = grandRow.getCell(2);
  grandLabel.value = 'סה"כ כללי לתשלום';
  grandLabel.font = BOLD;
  grandLabel.alignment = CENTER;

  return wb;
}

/** ASCII fallback + RFC 5987 form, so Hebrew names survive the header. */
function contentDisposition(name) {
  const base = `${name.replace(/\s+/g, '_')}_expenses.xlsx`;
  const ascii = base.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(base)}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  try {
    const personId = new URL(req.url, 'http://localhost').searchParams.get('personId');
    if (!personId) return sendJson(res, 400, { error: 'Missing personId.' });

    const person = await getPerson(personId);
    if (!person) return sendJson(res, 404, { error: 'No such person.' });

    const buffer = await buildWorkbook(person).xlsx.writeBuffer();
    res.status(200);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', contentDisposition(person.name));
    res.setHeader('Cache-Control', 'no-store');
    res.send(Buffer.from(buffer));
  } catch (err) {
    fail(res, err, 'Could not build the Excel file.');
  }
}
