# Yatra Ledger

A frontend-only trip expense manager built with React, Vite, and React Router. Packages, participants, participant mappings, expenses, and expense shares are loaded together from `public/api/data.json`.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. The app makes one request to `/api/data.json` when it starts. Changes are held in frontend state and saved to this browser's `localStorage`; **Restore sample data** in the sidebar clears the saved edits and reloads the static JSON.

## Features

- Create, edit, and delete packages and participants.
- Assign multiple participants to each package.
- Create, edit, and delete common and individual expenses.
- Common expenses are split across all participants mapped to the package. Individual expenses are split across the selected package participants.
- Shares are rounded to cents while ensuring each split adds back up to the entered amount.
- Reconciliation shows package totals, participant shares, and any allocation difference.
- Browser-side data is stored under the `yatra-ledger-data` local-storage key; no backend is required.

To change the starter records, edit `public/api/data.json`. When adding a backend later, replace the initial fetch and local persistence in `src/App.jsx` with API calls while keeping the page components and data shape.

## Checks

```sh
npm run lint
npm run build
```
