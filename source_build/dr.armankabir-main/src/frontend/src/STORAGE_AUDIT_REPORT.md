# PHP Storage Migration

## Current behavior

- Domain services use PHP/MySQL endpoints for supported patient, visit,
  prescription, appointment, payment, staff, and clinical resources.
- Remaining legacy key/value records are PHP-backed through authenticated
  preference endpoints. Staff operational records use the shared clinic scope;
  patient accounts and personal UI/session preferences remain account-scoped.
- The frontend compatibility layer stores values in memory only. It imports
  browser data once at authenticated startup, in small batches, and removes
  each batch from browser storage only after PHP confirms it was saved.
- Authentication credentials are never imported. Legacy browser credentials
  are removed after the PHP session is established.
- The shared clinic preference namespace is a compatibility bridge for older
  records. Those records should move to normalized domain tables/endpoints as
  each domain is cleaned up.

## Verification

Run `npm run audit:storage` from the source project root. It fails if frontend
feature code directly uses localStorage, sessionStorage, IndexedDB, or cookies
for persistence. The one-time importer is isolated in
`src/frontend/src/lib/storageAdapter.ts`.
