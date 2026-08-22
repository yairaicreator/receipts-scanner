# Expense Scanner — running and deploying

The implementation of the Claude Design handoff in this repo (`אפליקציה לריקי/index.html`). Photograph a receipt, Claude reads the date/amount/vendor
off it, the row lands in that person's growing record, and the whole record
comes back as an .xlsx laid out exactly like the קופה קטנה template.

It's a website, not an app store download — open it on the phone and use
"Add to Home Screen" to pin it.

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
| Staff list | `src/screens/HomeScreen.jsx` |
| Scan: capture → processing → review | `src/screens/ScanScreen.jsx` |
| One person's record and chart | `src/screens/PersonScreen.jsx` |
| Screen wiring and the save/export flow | `src/App.jsx` |

| Endpoint | File | Does |
|---|---|---|
| `POST /api/scan` | `api/scan.js` | Reads a receipt photo with Claude's vision |
| `GET /api/people` | `api/people.js` | Everyone and their receipts |
| `POST /api/expenses` | `api/expenses.js` | Appends one receipt, matched to a person by name |
| `DELETE /api/expenses?id=` | `api/expenses.js` | Removes one receipt |
| `GET /api/export?personId=` | `api/export.js` | Builds the .xlsx |

## Environment variables

| Variable | Required | What it's for |
|---|---|---|
| `ANTHROPIC_API_KEY` | to read receipts | Server-side key for the vision call. Without it the app still runs — the scan step says so and the fields are filled in by hand. |
| `DATABASE_URL` | to share data | Postgres connection string. Without it a JSON file under `.data/` is used, which is **local development only** — see below. |
| `ANTHROPIC_MODEL` | no | Defaults to `claude-opus-5`. |

Get a key at <https://console.anthropic.com/settings/keys>. Any Postgres works
for `DATABASE_URL` — Vercel Postgres, Neon, and Supabase all hand you one, and
the tables are created automatically on the first request.

## Run it locally

```bash
npm install
npm run build
ANTHROPIC_API_KEY=sk-ant-… npm start      # http://localhost:3000
```

For frontend work with hot reload, run `npm start` in one terminal and
`npm run dev` in another — the dev server proxies `/api` to it.

## Deploy to Vercel

1. Push this repo to GitHub, then import it at <https://vercel.com/new>.
   Vercel reads `vercel.json`: Vite build, `dist/` output, `api/*.js` as
   functions.
2. Add `ANTHROPIC_API_KEY` and `DATABASE_URL` under **Settings →
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
  page, which a deployed site can't do without publishing the key.
- **Shared storage replaced `localStorage`.** Everyone's phone now sees the
  same records; before, each browser had its own copy.
- **The Excel file is built on the server** with live `SUM()` formulas, so the
  browser doesn't download a spreadsheet library. Structure verified
  cell-for-cell against `אפליקציה לריקי/uploads/petty_cash_report.xlsx`.
- **Structured output** on the vision call, so a malformed reply can't cost a
  scan; one automatic retry behind that.
