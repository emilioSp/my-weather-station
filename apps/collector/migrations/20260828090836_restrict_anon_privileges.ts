import type { Knex } from 'knex';

// Supabase grants the browser roles full privileges on every new object in the
// `public` schema, so each migration that adds a table opens it to the world by
// default. This turns the schema into deny by default and keeps one allowlist:
// read `measures`, call `get_chart_history`, nothing else.
//
// The `anon` and `authenticated` roles exist only on Supabase, not in the local
// docker PostgreSQL, so the whole block is guarded.
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        RETURN;
      END IF;

      -- Objects created from now on reach the browser roles with no privileges.
      ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
        REVOKE ALL ON TABLES FROM anon, authenticated;
      ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
        REVOKE ALL ON SEQUENCES FROM anon, authenticated;
      ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
        REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

      -- Close everything that already exists, knex bookkeeping included.
      REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
      REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

      -- The allowlist. It is the whole surface the web app needs.
      GRANT SELECT ON measures TO anon;
      GRANT EXECUTE ON FUNCTION public.get_chart_history(
        TIMESTAMP WITH TIME ZONE,
        TIMESTAMP WITH TIME ZONE
      ) TO anon;
    END
    $$;
  `);
}

// Only the default privileges go back to the Supabase defaults. The grants on
// the existing tables stay as they are: a blanket re-grant would hand `anon`
// more than it held before this migration ran, which no rollback should do.
export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        RETURN;
      END IF;

      ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
        GRANT ALL ON TABLES TO anon, authenticated;
      ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
        GRANT ALL ON SEQUENCES TO anon, authenticated;
      ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
        GRANT EXECUTE ON FUNCTIONS TO anon, authenticated;
    END
    $$;
  `);
}
