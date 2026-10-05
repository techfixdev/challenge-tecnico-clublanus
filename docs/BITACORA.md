# Bitácora del challenge — GranaBank

Registro de cómo se construyó este proyecto, paso a paso: qué se hizo, qué se decidió y por qué.
Sirve como fuente de requerimientos y como guía para explicar el trabajo en la entrevista.

---

## 1. Contexto

- **Qué es:** challenge técnico para un puesto en el Club Atlético Lanús.
- **Entrega:** lunes 12/10/2026.
- **Consigna (Notion):** web app sencilla que consuma y muestre información siguiendo un diseño de Figma.

### Requerimientos funcionales
- Mostrar una lista de elementos.
- Ver el detalle de un elemento.
- Estados de carga, error y vacío.
- App funcional y navegable.

### Requerimientos técnicos
- Frontend con Next.js y TypeScript.
- Backend simple con Node.js + TypeScript (o API routes de Next.js).
- Base de datos relacional (PostgreSQL preferentemente).
- ORM.

### Suman puntos
Validaciones, estructura de componentes, manejo de estados y datos, detalles de UX.

### Entregables
Repositorio en GitHub, deploy (preferentemente Vercel) y README con: cómo correrlo, decisiones técnicas y qué mejoraría con más tiempo.

---

## 2. Forma de trabajo

Trabajo con asistencia de IA (Claude Code), con este protocolo:

1. Todo se hace **en local**. No se publica nada (push, deploy) sin aprobación explícita.
2. El trabajo se divide en tareas chicas.
3. Al terminar cada tarea, se revisan juntos **todos los cambios y decisiones**.
4. Solo después de aprobarlos se hace el commit (Conventional Commits).
5. Cada decisión queda registrada en esta bitácora con su justificación.

---

## 3. El diseño

El Figma es público pero de solo lectura, y no había token de API. Se obtuvo la imagen de vista previa del archivo desde el endpoint público de Figma y se guardó, junto con ampliaciones, en `docs/design/`.

La app se llama **GranaBank** (billetera del club) y tiene tres pantallas:

| Pantalla | Contenido |
|---|---|
| **Login** | Logo, "GranaBank", lema "Con cada compra, sumás orgullo granate", email, contraseña, "Recordarme", botón "Ingresar". Credenciales: `soygranate@clublanus.com` / `GRANATE1@` |
| **Home** | "Hola, Granate", tarjeta con saldo (USD 978.85, ****1234, vence 02/30), "Últimos movimientos". La lupa lleva a Movimientos. |
| **Movimientos** | Búsqueda por persona o servicio, filtros rápidos (Todos, Débito Aut., Recibido, Enviado) y listado. |

**Tokens de diseño extraídos:** granate `#7A1D2D`, fondo `#F9FAFC`, tipografía Poppins. Por tipo de movimiento: suscripción violeta `#C76DFF`, recibido granate sobre `#DDC6CA`, enviado naranja `#EF9C55`.

**Interpretación:** la consigna pide "lista + detalle". La lista son los movimientos; el detalle es una pantalla nueva por movimiento (`/movimientos/[id]`), que no está en el Figma y se diseña con el mismo lenguaje visual.

---

## 4. Plan de tareas

| # | Tarea | Estado |
|---|---|---|
| T1 | Scaffold, base de datos, ORM, datos de ejemplo, tests | ✅ Hecha |
| T2 | Login, sesión, protección de rutas, logout | ⏳ Pendiente |
| T3 | Home, listado con búsqueda y filtros, detalle, estados | ⏳ Pendiente |
| T4 | Pulido, accesibilidad, test end-to-end, README final | ⏳ Pendiente |
| T5 | GitHub + deploy en Vercel (requiere aprobación) | ⏳ Pendiente |

---

## 5. Registro por tarea

### T1 — Scaffold y base de datos (05/10/2026)

**Qué se hizo**
- Proyecto Next.js con TypeScript estricto, Tailwind CSS, ESLint y Prettier.
- PostgreSQL 17 en Docker (`docker-compose.yml`).
- Prisma con tres modelos: `User`, `Card` y `Movement`.
- Seed con el usuario del diseño, 2 tarjetas y 26 movimientos.
- Vitest + Testing Library, con tests del formateador de montos.

**Decisiones y por qué**

| Decisión | Por qué |
|---|---|
| Next.js 16 (App Router) | Lo pide la consigna; App Router permite Server Components y leer datos en el servidor sin exponer la base. |
| API routes de Next en lugar de un backend separado | La consigna lo permite; un solo proyecto y un solo deploy, menos complejidad para el alcance pedido. |
| PostgreSQL + Prisma | Postgres es lo preferido en la consigna. Prisma da tipos generados desde el schema y migraciones versionadas. |
| Prisma fijado en 7.10.0 | El tag `latest` del CLI apuntaba a una versión preliminar (8.0 RC). En producción no se usan prereleases. |
| Montos como `Decimal(12,2)`, nunca `float` | Los float tienen errores de redondeo; con dinero eso es inaceptable. |
| Tipo de movimiento como enum (`SUBSCRIPTION`, `RECEIVED`, `SENT`) | Se mapea 1 a 1 con los filtros del diseño (Débito Aut., Recibido, Enviado) y la base valida los valores. |
| Índices en `(userId, occurredAt)` y `counterparty` | Son las consultas reales: "movimientos del usuario ordenados por fecha" y "búsqueda por nombre". |
| Seed idempotente con fechas relativas a hoy | Se puede correr las veces que haga falta sin duplicar datos, y los movimientos siempre se ven recientes. |
| Cliente de Prisma generado, no versionado | Se regenera en `postinstall` y `build`; evita commitear código generado y funciona igual en Vercel. |
| Formato de montos `en-US` (`$978.85`) | El diseño usa punto decimal. Con `es-AR` se mostraría `978,85` y no coincidiría con el Figma. |
| Estructura por features (`src/features/{auth,movements,account}`) | La carpeta "grita" qué hace la app, no qué framework usa; cada feature agrupa su UI, datos y lógica. |
| Script `typecheck` = `next typegen && tsc --noEmit` | Next 16 genera tipos globales (`LayoutProps`) en build; sin ese paso, `tsc` falla en un checkout limpio. |
| Sin modo oscuro | El diseño es solo claro; agregarlo sería alcance no pedido. |
| Archivos de herramientas locales fuera del repo | `.atl/`, `odd/`, `AGENTS.md` y `CLAUDE.md` son del entorno de trabajo, no del proyecto. |

**Verificación:** lint ✅ · typecheck ✅ · tests 7/7 ✅ · build ✅ · seed corrido 3 veces sin duplicar ✅

---

## 6. Cómo correrlo (hasta ahora)

```bash
pnpm install
cp .env.example .env
pnpm db:up        # levanta Postgres en Docker
pnpm db:migrate   # aplica migraciones
pnpm db:seed      # carga datos de ejemplo
pnpm dev
```
