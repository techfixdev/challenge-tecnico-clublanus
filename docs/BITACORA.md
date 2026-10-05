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
| T2 | Login, sesión, protección de rutas, logout | 🔍 En revisión |
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

**Commit:** `ef45e46` — `chore: scaffold next.js app with prisma, postgres and testing setup`

**Revisión automática (enfoque confiabilidad): aprobada**, con 4 observaciones no bloqueantes. Las dos importantes se corrigen en T2:
- `formatMoney("")` devuelve `$0` en lugar de fallar, porque `Number("")` es `0`. Corrección: rechazar strings vacíos.
- El seed borra los datos en una transacción y los recrea fuera de ella; si falla a mitad de camino, el usuario queda sin tarjetas. Corrección: hacer todo el reset y la recreación en una sola transacción.

### T2 — Login, sesión y protección de rutas (05/10/2026)

**Qué se hizo**
- Pantalla `/login` fiel al Figma (captura en `docs/screenshots/login.png`), con mostrar/ocultar contraseña.
- Validación con zod, errores en español por campo y un error general para credenciales inválidas.
- Sesión con JWT firmado en una cookie httpOnly. "Recordarme" la mantiene 30 días.
- `src/proxy.ts` protege las rutas privadas; `requireUser()` vuelve a validar la sesión en cada lectura de datos.
- Logout. Endpoints REST `POST /api/auth/login` y `POST /api/auth/logout` que reutilizan la misma lógica.
- `AppShell`: en celular ocupa todo el ancho; en desktop, una columna centrada de 420px.
- Correcciones de la revisión de T1 (formateador y seed atómico).

**Decisiones y por qué**

| Decisión | Por qué |
|---|---|
| JWT en cookie (con `jose`, HS256) en lugar de sesiones en base | El proxy valida sin consultar la base. Contra: no se puede revocar una sesión puntual; se compensa con expiración corta y verificando el usuario en cada lectura. |
| El token solo guarda el id del usuario | Un JWT se puede decodificar; no lleva datos personales. |
| Algoritmo fijo al verificar | Evita el ataque de "alg confusion", donde el token elige su propio algoritmo. |
| Cookie `httpOnly`, `sameSite=lax`, `secure` en producción | JavaScript (y por lo tanto un XSS) no puede leerla, y no viaja en POST de otros sitios. |
| "Recordarme": 30 días; sin marcar, cookie de sesión con token de 1 día | Respeta la intención del usuario y limita el riesgo si el navegador restaura sesiones. |
| `SESSION_SECRET` obligatorio (mínimo 32 caracteres) | Falla rápido y con un mensaje claro si falta, en vez de firmar con un secreto débil. |
| Server Actions + `useActionState` | El formulario funciona aun sin JavaScript, y Next valida el origen (protección CSRF). |
| Un mismo schema zod en cliente y servidor | En el cliente da feedback inmediato; en el servidor es la validación real, porque el cliente se puede saltear. |
| Mensaje genérico "Email o contraseña incorrectos" | No revela qué emails están registrados. |
| bcrypt contra un hash falso cuando el email no existe | Ambos errores tardan lo mismo; el tiempo de respuesta no filtra usuarios. |
| `authenticate` recibe sus dependencias por parámetro | Se testea con mocks, sin base ni bcrypt (arquitectura hexagonal). |
| Doble capa: `proxy.ts` (rápido, solo token) + `requireUser()` (consulta la base) | El proxy corre en cada request, incluidos los prefetch; la verificación real va junto a los datos (defensa en profundidad). |
| Token válido de un usuario borrado → `/login?expired=1` limpia la cookie | Evita un loop infinito de redirecciones. |
| La API de login solo acepta JSON; la de logout valida `Origin` | Un formulario de otro sitio no puede mandar JSON; protección CSRF para los endpoints. |
| Accesibilidad: `aria-invalid`, `aria-describedby`, `role="alert"`, foco en el primer error | Lectores de pantalla y navegación por teclado funcionan correctamente. |
| `server-only` en el código de sesión y base | Impide que ese código termine por error en el bundle del navegador. |

**Tests:** primero se escribieron y fallaron (RED), después se implementó (GREEN).
- Unitarios: 39/39 (schema, token, lógica de login, formulario, formateador).
- End-to-end con Playwright: 5/5 (redirecciones, error de credenciales, validación, login/logout, flags de la cookie y "Recordarme").

**Verificación:** lint ✅ · typecheck ✅ · tests 39/39 ✅ · e2e 5/5 ✅ · build ✅ · prettier ✅

**Diferencia con el Figma:** los placeholders dicen "Ingresá…" (voseo, igual que el lema "sumás"); en el Figma dicen "Ingresa…".

---

## 6. Cómo correrlo (hasta ahora)

```bash
pnpm install
cp .env.example .env
pnpm db:up        # levanta Postgres en Docker
pnpm db:migrate   # aplica migraciones
pnpm db:seed      # carga datos de ejemplo
pnpm dev          # http://localhost:3000

pnpm test         # tests unitarios
pnpm test:e2e     # tests end-to-end (requiere la base levantada)
```
