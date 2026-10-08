-- Trigram indexes for the movement search: `immutable_unaccent(column) ILIKE
-- immutable_unaccent('%term%')` on the counterparty OR the description.
--
-- A GIN `gin_trgm_ops` index answers `ILIKE '%term%'` (a btree cannot, the term is not a
-- prefix). Postgres uses an expression index only when the query repeats the same
-- expression, and `unaccent()` is STABLE (its dictionary could change), so it cannot be
-- indexed directly. The usual fix is an IMMUTABLE wrapper that names the dictionary
-- explicitly, schema-qualified so the search_path cannot change its result; the repository
-- calls this same function, which keeps the index and the query in step.
--
-- Prisma's schema cannot describe expression indexes, hence a customized migration (like
-- the `unaccent` extension before it). Both extensions are available on Neon.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.immutable_unaccent(text)
  RETURNS text
  LANGUAGE sql
  IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

CREATE INDEX "Movement_counterparty_search_idx"
  ON "Movement" USING gin (public.immutable_unaccent("counterparty") gin_trgm_ops);

CREATE INDEX "Movement_description_search_idx"
  ON "Movement" USING gin (public.immutable_unaccent("description") gin_trgm_ops);
