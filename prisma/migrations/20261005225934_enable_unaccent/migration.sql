-- Accent-insensitive movement search: `unaccent(text) ILIKE unaccent(pattern)` lets "jose"
-- match "José Suárez". Declared here rather than in schema.prisma because Prisma deprecated
-- the `postgresqlExtensions` preview feature in favour of customized migrations.
--
-- `unaccent()` is STABLE, not IMMUTABLE, so it cannot back a plain expression index. Search
-- runs inside one user's rows (filtered by the `userId` index), which is cheap at this size.
-- Future improvement: an IMMUTABLE wrapper function plus a pg_trgm GIN index on it.
CREATE EXTENSION IF NOT EXISTS unaccent;
