import {
  CATEGORIES,
  CATEGORY_COLOR,
  CATEGORY_ICON,
  CATEGORY_LABEL_HE,
  money,
} from '../../shared/categories.js';

function totalsByCategory(expenses) {
  const totals = {};
  for (const expense of expenses) {
    totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
  }
  return totals;
}

export function pad2(n) {
  return n < 10 ? '0' + n : String(n);
}

/** '01.09' — the compact date the home header's "last scan" stat wants. */
export function shortDate(iso) {
  if (!iso || iso.length < 10) return iso || '';
  return iso.slice(8, 10) + '.' + iso.slice(5, 7);
}

export function receiptsLabel(n) {
  return n === 1 ? 'קבלה אחת' : `${n} קבלות`;
}

/** Home screen: numbered rows, count, and the proportional category strip. */
export function toPersonCards(people) {
  const cards = people
    .map((person) => {
      const totals = totalsByCategory(person.expenses);
      const sum = Object.values(totals).reduce((acc, n) => acc + n, 0) || 1;
      return {
        id: person.id,
        name: person.name,
        count: person.expenses.length,
        countLabel: receiptsLabel(person.expenses.length),
        total: person.expenses.reduce((acc, e) => acc + e.amount, 0),
        strip: CATEGORIES.filter((c) => totals[c] > 0).map((c) => ({
          category: c,
          color: CATEGORY_COLOR[c],
          pct: Math.round((totals[c] / sum) * 100),
        })),
      };
    })
    .sort((a, b) => b.total - a.total);
  cards.forEach((card, i) => { card.num = pad2(i + 1); });
  return cards;
}

/** Person screen: totals, stat cards, chart series and the entry list —
 *  all all-time (the redesign's per-month view was dropped; see SETUP.md). */
export function toPersonView(person) {
  const byDate = [...person.expenses].sort((a, b) => a.date.localeCompare(b.date));
  const total = person.expenses.reduce((acc, e) => acc + e.amount, 0);
  const totals = totalsByCategory(person.expenses);

  const breakdown = CATEGORIES
    .filter((c) => (totals[c] || 0) > 0)
    .map((c) => ({
      category: c,
      categoryLabel: CATEGORY_LABEL_HE[c],
      amount: totals[c],
      color: CATEGORY_COLOR[c],
      icon: CATEGORY_ICON[c],
    }))
    .sort((a, b) => b.amount - a.amount);

  const largest = Math.max(...breakdown.map((b) => b.amount), 1);
  for (const bar of breakdown) {
    // Floor at 4% so a tiny category still reads as a bar, not a sliver.
    bar.pct = Math.max(4, Math.round((bar.amount / largest) * 100));
  }

  const top = breakdown[0];

  return {
    id: person.id,
    name: person.name,
    count: person.expenses.length,
    countLabel: receiptsLabel(person.expenses.length),
    hasEntries: person.expenses.length > 0,
    total: money(total),
    avgEntry: money(person.expenses.length ? total / person.expenses.length : 0),
    topCategory: top ? top.categoryLabel : '—',
    topColor: top ? top.color : CATEGORY_COLOR.Other,
    topIcon: top ? top.icon : CATEGORY_ICON.Other,
    breakdown: breakdown.map((bar) => ({ ...bar, amount: money(bar.amount) })),
    linePoints: cumulativeLine(byDate),
    // Newest receipt first — the one just scanned sits at the top.
    entries: [...byDate].reverse().map((e) => ({
      ...e,
      amount: money(e.amount),
      categoryLabel: CATEGORY_LABEL_HE[e.category] || CATEGORY_LABEL_HE.Other,
      color: CATEGORY_COLOR[e.category] || CATEGORY_COLOR.Other,
      icon: CATEGORY_ICON[e.category] || CATEGORY_ICON.Other,
    })),
  };
}

/** Points for the 300×120 cumulative-spend polyline, or '' below two entries. */
function cumulativeLine(sortedExpenses) {
  const count = sortedExpenses.length;
  if (count < 2) return '';
  let running = 0;
  const cumulative = sortedExpenses.map((e) => (running += e.amount));
  const peak = Math.max(...cumulative, 1);
  return cumulative
    .map((value, i) => {
      const x = (i / (count - 1)) * 300;
      const y = 115 - (value / peak) * 100;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
