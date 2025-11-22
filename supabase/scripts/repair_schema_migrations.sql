-- Rename numeric migration versions so Supabase CLI can match them with local placeholder files.
-- Run this script in the Supabase SQL editor (Database -> SQL Editor) before
-- running `npx supabase@latest db pull` or any other CLI migration command.

BEGIN;

UPDATE supabase_migrations.schema_migrations
SET version = '20251113_placeholder'
WHERE version = '20251113';

UPDATE supabase_migrations.schema_migrations
SET version = '20251120_placeholder'
WHERE version = '20251120';

UPDATE supabase_migrations.schema_migrations
SET version = '20251121_placeholder'
WHERE version = '20251121';

COMMIT;
