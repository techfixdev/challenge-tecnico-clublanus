# Checklist del challenge — GranaBank

Estado de cada requerimiento de la consigna, con la evidencia que lo respalda en el código. Se tilda solo lo verificado.

Leyenda: `[x]` hecho y verificado · `[ ]` pendiente

Última actualización: 08/10/2026 (verificado contra `7c50a67`)

Repositorio: [github.com/techfixdev/challenge-tecnico-clublanus](https://github.com/techfixdev/challenge-tecnico-clublanus)

---

## Requerimientos funcionales

- [x] Mostrar una lista de elementos → Movimientos en `src/app/(app)/movimientos/(list)/page.tsx`, agrupados por día ("Hoy", "Ayer", fecha), y "Últimos movimientos" en Home (`src/features/movements/ui/LatestMovements.tsx`).
- [x] Ver el detalle de un elemento → `src/app/(app)/movimientos/[id]/page.tsx`, con 404 real (`not-found.tsx`, sin `loading.tsx`) y acciones (compartir, copiar referencia, repetir transferencia).
- [x] Estado de carga → `loading.tsx` en Home, Movimientos, Transferir y Recibir, con esqueletos por sección (`<Suspense>`).
- [x] Estado de error → `error.tsx` con "Reintentar" en `src/app/(app)/`, `movimientos/`, `transferir/` y `recibir/`.
- [x] Estado vacío → `src/features/movements/ui/MovementsEmptyState.tsx`: sin movimientos y sin resultados para la búsqueda o el filtro.
- [x] App funcional y navegable → login → Home → Movimientos → detalle → volver → Transferir / Recibir → cerrar sesión (tercer ícono de `src/shared/ui/BottomNav.tsx`), cubierto por los e2e (`e2e/`).

## Requerimientos técnicos

- [x] Frontend con Next.js y TypeScript → Next.js 16 (App Router), TypeScript estricto (`tsconfig.json`).
- [x] Backend con API routes de Next → `src/app/api/` (auth, movements, account, transfers), 10 rutas. Ver README, "API".
- [x] Base de datos relacional → PostgreSQL 17 (`docker-compose.yml` en local; `provider = "postgresql"` en `prisma/schema.prisma`).
- [x] ORM → Prisma 7 con migraciones (`prisma/migrations/`) y seed idempotente (`prisma/seed.ts`).

## No excluyentes (suman puntos)

- [x] Validaciones → un schema zod por formulario y parámetro en el servidor (`src/features/*/domain/`), las mismas reglas como funciones puras en el navegador (`*-rules.ts`).
- [x] Componentes y estructura → por funcionalidad (`src/features/{auth,account,movements,transfers}`), con capas `domain` / `data` / `server` / `ui`.
- [x] Estados y lógica de datos → filtros en la URL, paginación por cursor (`movement-cursor.ts`), Server Components, repositorios y transferencias en una transacción con débito condicional.
- [x] Detalles de UX → errores por campo, feedback al tocar, sistema de movimiento con "reducir movimiento", datos de tarjeta ocultos por defecto, deslizar para volver. Ver README, "Accesibilidad y UX" y "Movimiento y accesibilidad".

## Diseño de Figma (`docs/design/`)

- [x] Login: escudo, "GranaBank", lema "Con cada compra, sumás orgullo granate", email, contraseña, "Recordarme" e "Ingresar" → `src/features/auth/ui/LoginHeader.tsx` y `LoginForm.tsx`. Credenciales `soygranate@clublanus.com` / `GRANATE1@` en `prisma/seed.ts`.
- [x] Home: "Hola" / "Granate", lupa y campana, tarjeta con saldo y "Últimos movimientos" → `src/features/account/ui/HomeHeader.tsx`; la lupa lleva a Movimientos con el buscador enfocado (`/movimientos?focus=1`).
- [x] Movimientos: búsqueda por persona o servicio ("Ingresá un nombre o servicio") y filtros Todos / Débito Aut. / Recibido / Enviado → `src/features/movements/ui/MovementSearch.tsx` y `FilterChips.tsx`.
- [x] Íconos de cada movimiento con color por tipo → azulejos de suscripción, recibido y enviado (tokens en `src/app/globals.css`).
- [x] Barra inferior con Inicio, Movimientos y cerrar sesión → `src/shared/ui/BottomNav.tsx`.
- [x] Tipografía Poppins → `src/app/layout.tsx` (`next/font`); Rokkitt como tipografía de display (logotipo, títulos y montos grandes).
- [x] Colores → granate y fondo claro del Figma, normalizados a los colores institucionales del club (`--color-primary: #70192d`, `--color-background: #f9f9fa`). Desvío deliberado y documentado, igual que el formato argentino y los montos con signo. Ver README, "Marca" y "Decisiones técnicas".

## Qué se evalúa (cómo lo cubrimos)

- [x] Claridad del código → lint y typecheck limpios, tests al lado del código (1065 unitarios, 72 de integración, 116 e2e).
- [x] Seguir el diseño → ver la sección anterior.
- [x] Organización del proyecto → estructura documentada en el README ("Tour del código", "Estructura del proyecto") y en la bitácora.
- [x] Criterio técnico → decisiones con su porqué en el README ("Decisiones técnicas") y en `docs/BITACORA.md`.
- [x] Uso de herramientas → Prisma, zod, Vitest, Playwright, GitHub Actions (`.github/workflows/ci.yml`).
- [x] Explicar lo hecho → bitácora con el porqué de cada decisión, tarea por tarea.

## Entregables (excluyentes)

- [x] Link al repositorio de GitHub → [techfixdev/challenge-tecnico-clublanus](https://github.com/techfixdev/challenge-tecnico-clublanus).
- [ ] Deploy en Vercel → **pendiente** (T5).
- [x] README: cómo correr el proyecto → sección "Cómo correrlo".
- [x] README: decisiones técnicas → sección "Decisiones técnicas".
- [x] README: qué mejoraría → sección "Qué mejoraría con más tiempo".

## Pendiente

- [ ] Deploy en Vercel con una base PostgreSQL administrada, y el link en el README (hoy dice "Deploy: _pendiente_").
