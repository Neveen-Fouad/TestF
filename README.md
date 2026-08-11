# Journovo

Journovo is a vanilla JavaScript travel frontend powered by Vite. Each UI page has its own HTML, CSS, and JavaScript module under `pages/` and `src/pages/`.

## Run locally

```bash
npm install
npm run dev
```

Set `VITE_API_BASE_URL` to point to the travel API when the default API address is not appropriate for your environment.

## Build

```bash
npm run build
```

The production files are written to `dist/`.

## Key areas

- `src/shared/api.js` centralizes API requests, session storage, and access-token refresh.
- `src/shared/navigation.js` renders the shared navbar and guest/member-aware sidebar.
- `pages/` contains one HTML entry point per UI page.
- `src/pages/` contains the paired page CSS and page logic.
