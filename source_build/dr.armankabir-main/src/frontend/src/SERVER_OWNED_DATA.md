# PHP-owned persistence

PHP/MySQL is the persistent source of application data. Domain services use
their PHP endpoints where available. The compatibility adapter keeps only an
in-memory cache and writes legacy key/value records to the authenticated
`/api/preferences/*` endpoints; this allows existing synchronous UI call sites
to keep working while domain-specific migrations continue.

At authenticated startup, the adapter imports legacy `localStorage` and
`sessionStorage` entries in bounded batches. A browser entry is removed only
after PHP confirms that its batch was stored. Authentication-related keys are
not imported and are purged from browser storage. Storage initialization
failures block the authenticated UI and provide a retry action; write failures
are reported to the user.

The audit command checks that feature code does not directly use persistent
browser storage APIs:

```bash
cd source_build/dr.armankabir-main
npm run audit:storage
```

The importer is isolated in `src/frontend/src/lib/storageAdapter.ts`; the
compatibility module is excluded from the direct-browser-storage check.
