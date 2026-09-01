# Expense Scanner — running and deploying

The implementation of the Claude Design handoff in this repo
(`אפליקציה לריקי/index.html`), rebuilt in Hebrew/RTL to match the second
design round. Photograph a receipt, an AI vision model reads the
date/amount/vendor off it, the row lands in that person's growing record, and
the whole record comes back as an .xlsx laid out exactly like the
קופה קטנה template.

It's a website, not an app store download — open it on the phone and use
"Add to Home Screen" to pin it. First launch on a device asks for a name once
(kept in that device's local storage) and, on every later visit, opens
straight to that person's own page.

## Layout

```
index.html, src/       the React app (Vite)
api/                   serverless functions — the only place the API key lives
shared/                the category list, shared by both sides
scripts/server.js      plain-Node host, for running it off Vercel
אפליקציה לריקי/       the original Claude Design prototype (reference)
chats/                 the design conversation it came out of
```

| Screen | File |
|---|---|
| First-launch name entry | `src/screens/WelcomeScreen.jsx` |
| Staff list | `src/screens/HomeScreen.jsx` |
| Scan: capture → processing → review | `src/screens/ScanScreen.jsx` |
| One person's record and chart | `src/screens/PersonScreen.jsx` |
| Screen wiring, the save/export flow, and the direct-file Excel link | `src/App.jsx` |
| Direct-file Excel linking (browser File System Access) | `src/lib/fileLink.js` |

| Endpoint | File | Does |
|---|---|---|
| `POST /api/scan` | `api/scan.js` | Reads a receipt photo (Gemini) |
| `GET /api/people` | `api/people.js` | Everyone and their receipts |
| `POST /api/expenses` | `api/expenses.js` | Appends one receipt, matched to a person by name |
| `DELETE /api/expenses?id=` | `api/expenses.js` | Removes one receipt |
| `GET /api/export?personId=` | `api/export.js` | Builds the .xlsx |

## Environment variables

| Variable | Required | What it's for |
|---|---|---|
| `GEMINI_API_KEY` | to read receipts | Server-side key for the vision call. Without it the app still runs — the scan step says so and the fields are filled in by hand. |
| `DATABASE_URL` | to share data | Postgres connection string. Without it a JSON file under `.data/` is used, which is **local development only** — see below. |
| `GEMINI_MODEL` | no | Defaults to `gemini-3.7-flash`. |

Get a Gemini key at <https://aistudio.google.com/apikey>. Any Postgres works
for `DATABASE_URL` — Vercel Postgres, Neon, and Supabase all hand you one, and
the tables are created automatically on the first request.

The prompt lives in `api/_lib/receipt.js`, and the reader itself is about 50
lines in `api/_lib/readers/gemini.js`.

## Run it locally

```bash
npm install
npm run build
GEMINI_API_KEY=… npm start                # http://localhost:3000
```

For frontend work with hot reload, run `npm start` in one terminal and
`npm run dev` in another — the dev server proxies `/api` to it.

## Deploy to Vercel

1. Push this repo to GitHub, then import it at <https://vercel.com/new>.
   Vercel reads `vercel.json`: Vite build, `dist/` output, `api/*.js` as
   functions.
2. Add `GEMINI_API_KEY` and `DATABASE_URL` under **Settings →
   Environment Variables**, then redeploy.

> The earlier attempt to import this design into Vercel failed with
> `403 — "You don't have permission to create a project."` That's the
> connected Vercel account's role, not the code: either use a personal
> account or ask a team owner for project-creation rights.

**`DATABASE_URL` is not optional in production.** Serverless filesystems are
per-instance and wiped between invocations, so a deployment without it would
appear to work and then lose data.

## Design settings

`src/config.js` holds the three knobs the prototype exposed as editor props:
the currency (₪), the chart type (`bar` or `line` — both are implemented), and
whether the review form asks for the vendor.

## What changed from the prototype, and why

- **The AI call moved to the server.** The prototype called the model from the
  page, which a deployed site can't do without publishing the key. Gemini
  reads the receipts server-side now.
- **Shared storage replaced `localStorage`.** Everyone's phone now sees the
  same records; before, each browser had its own copy.
- **The Excel file is built on the server** with live `SUM()` formulas, so the
  browser doesn't download a spreadsheet library. Structure verified
  cell-for-cell against `אפליקציה לריקי/uploads/petty_cash_report.xlsx`.
- **Structured output** on the vision call, so a malformed reply can't cost a
  scan; one automatic retry behind that.

## The second design round

- **The whole UI moved to Hebrew/RTL**, matching the redesign — dark theme,
  a hero total on the person page, a numbered staff list.
- **The categories stayed the original six** (Fuel/Taxi/Parking/Hosting/
  Catering/Other), not the redesign's tech-consulting set. Their *labels*
  are Hebrew now (`CATEGORY_LABEL_HE` in `shared/categories.js`) — the same
  six words already used as the Excel headers — but the underlying keys are
  unchanged, so a database from before this update keeps working with no
  migration.
- **No month-scoped view.** The redesign filtered the person page to one
  month at a time with a month picker, and named the Excel file
  `{person}_{month}.xlsx` — a new file every month. That's the opposite of
  what was asked for earlier in the design conversation ("don't open a new
  file, same graph, same file every time"), so this build keeps the person
  page and the Excel export all-time and cumulative, as before.
- **Direct-file Excel linking is new** (`src/lib/fileLink.js` + the "Update
  Excel" button on the person page). On Chrome or Edge on a computer, the
  first tap asks you to pick or create an .xlsx file; every scan after that
  rewrites that same file in place — this is the most direct way yet to get
  "always the same file, always up to date." It needs the File System Access
  API, which iOS/Android and Safari don't have, so on a phone the button
  falls back to the existing share/download behavior — no regression there.
- **A "subject" field is captured but never shown.** The AI also reads a
  short description of what was bought, to help pick the category (a coffee
  bought at a fuel station files as Catering, not Fuel). It's stored per
  entry but there's no field for it in the form and no column for it in the
  entries list — the redesign captured it the same way. It's there if it's
  ever worth surfacing.
