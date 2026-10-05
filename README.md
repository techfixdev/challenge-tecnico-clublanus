# GranaBank

Technical challenge for Club Atlético Lanús: a small home-banking web app built from the
"GranaBank" Figma design.

> Work in progress. Full documentation (technical decisions, trade-offs, improvements) will
> be added as the project evolves.

## Stack

- Next.js 16 (App Router) + TypeScript (strict) + Tailwind CSS v4
- PostgreSQL 17 + Prisma ORM 7 (`@prisma/adapter-pg` driver adapter)
- Vitest + Testing Library

## Getting started

Requirements: Node.js 22+ (or 24+), pnpm, Docker.

```bash
cp .env.example .env     # adjust SESSION_SECRET
pnpm install             # also generates the Prisma client
pnpm db:up               # start PostgreSQL (docker compose)
pnpm db:migrate          # apply migrations
pnpm db:seed             # seed the demo user, cards and movements
pnpm dev
```

Demo credentials: `soygranate@clublanus.com` / `GRANATE1@`.

## Scripts

| Script                          | Purpose                                         |
| ------------------------------- | ----------------------------------------------- |
| `dev` / `build` / `start`       | Next.js dev server, production build and server |
| `lint` / `typecheck` / `format` | ESLint, `tsc --noEmit`, Prettier                |
| `test` / `test:watch`           | Vitest (single run / watch)                     |
| `db:up`                         | Start PostgreSQL with docker compose            |
| `db:migrate` / `db:deploy`      | `prisma migrate dev` / `prisma migrate deploy`  |
| `db:seed` / `db:reset`          | Seed demo data (idempotent) / reset + reseed    |
