# GranaBank

Home banking mobile-first para el challenge técnico del Club Atlético Lanús: login, saldo de tarjetas, movimientos con búsqueda y filtros, y detalle de cada movimiento, construido a partir del diseño de Figma.

| Login                                | Home                               | Movimientos                                    | Detalle                                          |
| ------------------------------------ | ---------------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| ![Login](docs/screenshots/login.png) | ![Home](docs/screenshots/home.png) | ![Movimientos](docs/screenshots/movements.png) | ![Detalle](docs/screenshots/movement-detail.png) |

## Demo

Deploy: _pendiente_

**Credenciales de prueba:** `soygranate@clublanus.com` / `GRANATE1@`

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) + **TypeScript** estricto
- **PostgreSQL 17** + **Prisma 7** (driver adapter `@prisma/adapter-pg`)
- **Tailwind CSS v4**, tipografía Poppins
- **zod** (validación compartida cliente/servidor), **jose** (JWT), **bcryptjs**
- **Vitest** + Testing Library, **Playwright**, GitHub Actions

## Cómo correrlo

Requisitos: **Node 22+**, **pnpm**, **Docker**.

```bash
pnpm install              # también genera el cliente de Prisma
cp .env.example .env      # en producción, generar SESSION_SECRET con: openssl rand -base64 32
pnpm db:up                # PostgreSQL en Docker (puerto 5432)
pnpm db:migrate           # aplica las migraciones
pnpm db:seed              # usuario demo, 2 tarjetas y 26 movimientos (idempotente)
pnpm dev                  # http://localhost:3000
```

Puertos: app `3000`, PostgreSQL `5432`, servidor de los tests e2e `3100`.

## Scripts

| Script                               | Qué hace                                                 |
| ------------------------------------ | -------------------------------------------------------- |
| `pnpm dev` / `build` / `start`       | Servidor de desarrollo, build de producción y servidor   |
| `pnpm lint` / `typecheck` / `format` | ESLint, `tsc --noEmit` (con tipos de rutas), Prettier    |
| `pnpm format:check`                  | Verifica el formato sin modificar archivos               |
| `pnpm test` / `test:watch`           | Tests unitarios y de componentes (sin base de datos)     |
| `pnpm test:integration`              | Tests de integración contra PostgreSQL                   |
| `pnpm test:e2e`                      | Tests end-to-end con Playwright                          |
| `pnpm db:up`                         | Levanta PostgreSQL con Docker Compose                    |
| `pnpm db:migrate` / `db:deploy`      | `prisma migrate dev` / `prisma migrate deploy`           |
| `pnpm db:seed` / `db:reset`          | Carga los datos demo / resetea la base y vuelve a cargar |

## Estructura del proyecto

Organizada por funcionalidad ("screaming architecture"): las carpetas dicen qué hace la app, no qué framework usa.

```
src/
├── app/                 rutas delgadas: conectan features (páginas, error boundaries, API REST)
├── features/
│   ├── auth/            domain/ data/ server/ ui/
│   ├── movements/       domain/ data/ ui/
│   └── account/         domain/ data/ ui/
├── shared/              lib/ (db, errores de API, fechas, formato) · ui/ (Button, BottomNav…)
├── proxy.ts             protección optimista de rutas
└── test/                fixtures y repositorio en memoria
prisma/                  schema, migraciones y seed
e2e/                     Playwright
```

Cada feature usa las mismas capas, y solo las que necesita:

| Capa      | Contenido                                                                      |
| --------- | ------------------------------------------------------------------------------ |
| `domain/` | Reglas puras, casos de uso, schemas zod y tipos. No conoce Prisma ni React.    |
| `data/`   | Repositorios con Prisma que implementan los puertos del dominio.               |
| `server/` | Puntos de entrada solo de servidor: Server Actions, login, sesión.             |
| `ui/`     | Componentes. Server Components por defecto; Client solo donde hay interacción. |

Los tests viven al lado del código (`x.ts` + `x.test.ts`). Las dependencias van en una sola dirección: `ui` y `data` dependen de `domain`, nunca al revés.

## Decisiones técnicas

- **App Router + Server Components.** Las páginas leen la base en el servidor: no hay credenciales ni consultas en el navegador y se envía menos JavaScript. Client Components solo para formularios, búsqueda y "Cargar más".
- **API routes en lugar de un backend separado.** La consigna lo permite: un proyecto, un deploy, tipos compartidos. Las rutas REST reutilizan los mismos casos de uso que las páginas.
- **Prisma + PostgreSQL.** Tipos generados desde el schema y migraciones versionadas. Para la búsqueda se usa SQL parametrizado (`Prisma.sql`), probado contra una base real.
- **Montos `Decimal(12,2)`**, que viajan como string (`"125.00"`): un `float` acumula errores de redondeo.
- **Sesión: JWT en cookie `httpOnly`**, `sameSite=lax` y `secure` en producción. `proxy.ts` hace un chequeo rápido del token y `requireUser()` vuelve a verificar al usuario en la base en cada lectura (defensa en profundidad).
- **Un schema zod por formulario/parámetro**, compartido entre cliente (feedback inmediato) y servidor (la validación real).
- **Filtros en la URL** (`?q=&type=`): se pueden compartir, sobreviven al recargar y funcionan con el botón atrás; el filtrado ocurre en la base. Búsqueda con debounce de 300 ms y `router.replace`.
- **Paginación por cursor** (`occurredAt` + `id`): estable aunque entren movimientos nuevos y aprovecha el índice `(userId, occurredAt)`.
- **Protección IDOR.** Toda consulta filtra por el `userId` de la sesión; un id ajeno responde el mismo 404 que uno inexistente.
- **Búsqueda sin acentos** con la extensión `unaccent` ("jose" encuentra "José"), escapando `%` y `_`.
- **404 real en el detalle.** El detalle no tiene `loading.tsx`, así el status no queda fijo en 200 antes de saber si el movimiento existe.
- **Zona horaria de Buenos Aires** para mostrar fechas: Vercel corre en UTC y un pago de las 22 h aparecería al día siguiente.
- **Errores de API clasificados:** base caída → 503 (reintentable); bug → 500 genérico con log; `redirect()`/`notFound()` de Next se dejan pasar.

El razonamiento completo, tarea por tarea, está en [`docs/BITACORA.md`](docs/BITACORA.md).

## API

Todas las respuestas son JSON. Éxito: `{ "data": … }`. Error: `{ "error": { "code", "message", "details"? } }`, donde `code` es estable (`INVALID_INPUT`, `UNAUTHORIZED`, `NOT_FOUND`, `SERVICE_UNAVAILABLE`, …) y `details` trae los errores por campo.

| Método | Ruta                 | Auth   | Parámetros                                                     | Respuestas                                                                     |
| ------ | -------------------- | ------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| POST   | `/api/auth/login`    | —      | JSON `{ email, password, remember? }`                          | 200 `{ data: { userId } }` + cookie · 400 · 401 · 415 (no es JSON) · 500 · 503 |
| POST   | `/api/auth/logout`   | Cookie | — (rechaza otro `Origin`)                                      | 204 · 403                                                                      |
| GET    | `/api/movements`     | Cookie | `q` (≤ 50), `type` (`debito`, `recibido`, `enviado`), `cursor` | 200 `{ data: Movement[], total, nextCursor }` · 400 · 401 · 503                |
| GET    | `/api/movements/:id` | Cookie | —                                                              | 200 `{ data: Movement }` · 401 · 404 (inexistente, mal formado o ajeno) · 503  |
| GET    | `/api/account/cards` | Cookie | —                                                              | 200 `{ data: Card[] }` (principal primero) · 401 · 503                         |

```bash
curl -i -c cookies.txt -H 'content-type: application/json' \
  -d '{"email":"soygranate@clublanus.com","password":"GRANATE1@"}' \
  http://localhost:3000/api/auth/login
curl -b cookies.txt 'http://localhost:3000/api/movements?q=jose&type=recibido'
```

## Testing

| Tipo        | Comando                 | Qué cubre                                                                                                                                                                                               | Cantidad |
| ----------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Unitarios   | `pnpm test`             | Dominio (validación, cursor, filtros, login), rutas REST con repositorios en memoria, componentes desde lo que ve el usuario                                                                            | 210      |
| Integración | `pnpm test:integration` | SQL real: búsqueda sin acentos, escape de `%`/`_`, filtro por tipo, aislamiento por usuario, paginación completa y desempates; errores reales de la base (credenciales, base inexistente, sin conexión) | 17       |
| End-to-end  | `pnpm test:e2e`         | Login/logout, cookie y "Recordarme", búsqueda, filtros, "Cargar más", detalle, 404 y estados vacíos en Chromium móvil                                                                                   | 13       |

Integración necesita la base levantada con las migraciones: crea y borra sus propios datos, así que no depende del seed. E2E necesita además el seed. La lógica se escribió mayormente con TDD (test que falla → código → refactor). CI (`.github/workflows/ci.yml`) corre lint, tipos, formato y unitarios, y en otro job, con un PostgreSQL de servicio: migraciones, seed, integración, build y e2e contra el build de producción.

## Accesibilidad y UX

- Navegable con teclado; foco visible; labels, `aria-invalid` y foco en el primer error del formulario.
- Regiones `role="status"` para resultados y carga; errores con `role="alert"`.
- Estados de carga (esqueletos), error con "Reintentar" y dos estados vacíos (sin movimientos / sin resultados).
- Mobile-first; en desktop, columna centrada como un teléfono.
- Limitación conocida: el violeta de suscripción del diseño (`#C76DFF`) no llega a contraste AA en texto chico; se respetó el diseño.

## Qué mejoraría con más tiempo

- **Rate limiting del login** con Redis/Upstash (un límite en memoria no sirve en serverless).
- **Sesiones revocables** (tabla de sesiones o lista de revocación) para cerrar sesión en todos los dispositivos.
- **Índice trigram** (GIN sobre `unaccent`) para que la búsqueda escale con muchos datos.
- **Monitoreo** con Sentry o similar, usando el `digest` de los errores.
- **Deploy previews** por PR y e2e contra el preview.
- Contraste del violeta (consensuado con diseño), modo oscuro, i18n y soporte offline/PWA.

## Proceso de trabajo

Construido con asistencia de IA (Claude Code), bajo un protocolo propio: tareas chicas, tests primero, revisión de cada cambio antes de commitear y revisiones automáticas por enfoque (seguridad, resiliencia, legibilidad, confiabilidad). Cada decisión y su porqué quedó registrada en [`docs/BITACORA.md`](docs/BITACORA.md), y el historial usa commits chicos con Conventional Commits.
