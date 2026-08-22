import {
  CATEGORIES,
  CATEGORY_COLOR,
  CATEGORY_ICON,
  PERSON_COLORS,
  money,
} from '../../shared/categories.js';

/** Stable per-person accent: creation order, which the API preserves. */
export function personColor(index) {
  return PERSON_COLORS[index % PERSON_COLORS.length];
}

function totalsByCategory(expenses) {
  const totals = {};
  for (const expense of expenses) {
    totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
  }
  return totals;
}

/** Home screen: name, count, and the proportional category strip. */
export function toPersonCards(people) {
  return people
    .map((person, index) => {
      const totals = totalsByCategory(person.expenses);
      const sum = Object.values(totals).reduce((acc, n) => acc + n, 0) || 1;
      return {
        id: person.id,
        name: person.name,
        count: person.expenses.length,
        total: person.expenses.reduce((acc, e) => acc + e.amount, 0),
        color: personColor(index),
        strip: CATEGORIES.filter((c) => totals[c] > 0).map((c) => ({
          category: c,
          color: CATEGORY_COLOR[c],
          pct: Math.round((totals[c] / sum) * 100),
        })),
      };
    })
    .sort((a, b) => b.total - a.total);
}

/** Person screen: totals, stat cards, chart series and the entry list. */
export function toPersonView(person, index) {
  const byDate = [...person.expenses].sort((a, b) => a.date.localeCompare(b.date));
  const total = person.expenses.reduce((acc, e) => acc + e.amount, 0);
  const totals = totalsByCategory(person.expenses);

  const breakdown = CATEGORIES
    .filter((c) => (totals[c] || 0) > 0)
    .map((c) => ({
      category: c,
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

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthTotal = person.expenses
    .filter((e) => e.date.startsWith(monthPrefix))
    .reduce((acc, e) => acc + e.amount, 0);

  const top = breakdown[0];

  return {
    id: person.id,
    name: person.name,
    color: personColor(index),
    count: person.expenses.length,
    total: money(total),
    monthTotal: money(monthTotal),
    avgEntry: money(person.expenses.length ? total / person.expenses.length : 0),
    topCategory: top ? top.category : '—',
    topColor: top ? top.color : CATEGORY_COLOR.Other,
    topIcon: top ? top.icon : CATEGORY_ICON.Other,
    breakdown: breakdown.map((bar) => ({ ...bar, amount: money(bar.amount) })),
    linePoints: cumulativeLine(byDate),
    // Newest receipt first — the one just scanned sits at the top.
    entries: [...byDate].reverse().map((e) => ({
      ...e,
      amount: money(e.amount),
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
