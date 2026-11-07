-- Disable only legacy accounts that still use the published shared seed hash.
-- Take a full MySQL backup before applying this migration. Account rows are kept.

UPDATE users
SET is_active = 0,
    updated_at = NOW()
WHERE email IN (
    'admin@drarmankabir.com',
    'dr.arman@drarmankabir.com',
    'nurse@drarmankabir.com',
    'reception@drarmankabir.com'
)
AND password_hash = '$2y$10$l.L4.aV8L1Q0UT9M64QWyeaT512U/jGPnh7yeHse5NF9PgY0dYBIO';