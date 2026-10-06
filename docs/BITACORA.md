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
| T2 | Login, sesión, protección de rutas, logout | ✅ Hecha |
| T3 | Home, listado con búsqueda y filtros, detalle, estados | ✅ Hecha |
| T4 | Pulido: hallazgos de revisión, estructura, CI, README final | ✅ Hecha |
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
| JWT en cookie (con `jose`, HS256) en lugar de sesiones en base | El proxy valida sin consultar la base. Contra: no se puede revocar una sesión puntual; se mitiga verificando el usuario en cada lectura y con expiración de 1 día si no se marca "Recordarme" (con "Recordarme" son 30 días, un trade-off de comodidad). |
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

**Commit:** `3134de9` — `feat(auth): add login, jwt session cookie and route protection`

**Revisión automática (4 enfoques: seguridad, resiliencia, legibilidad, confiabilidad): aprobada sin bloqueantes**, con 15 observaciones. Las importantes se corrigen en T3:
- La API de login acepta cualquier `Content-Type` que *contenga* `application/json` (chequeo por substring).
- Si la base se cae, la API de login devuelve un 500 sin controlar; debería devolver un error claro (503).
- Las rutas REST no tienen tests.
- Si falta `SESSION_SECRET`, el proxy rompe en lugar de redirigir al login.
- No hay límite de intentos de login (rate limiting): bcrypt consume CPU y permite fuerza bruta. Queda documentado como mejora, porque en serverless un límite en memoria no sirve y requiere un servicio externo (por ejemplo Redis).
- Esta bitácora decía "expiración corta", pero con "Recordarme" son 30 días; se corrigió el texto.

**Diferencia con el Figma:** los placeholders dicen "Ingresá…" (voseo, igual que el lema "sumás"); en el Figma dicen "Ingresa…".

### T3 — Home, movimientos y detalle (05/10/2026)

**Qué se hizo**
- **Home:** saludo, carrusel de tarjetas (la Visa asoma al costado, como en el Figma), "Últimos movimientos" (5) con "Ver todos", lupa que lleva a Movimientos y campana con aviso "Próximamente".
- **Movimientos:** búsqueda por nombre o servicio, filtros rápidos (Todos, Débito Aut., Recibido, Enviado) y paginación con "Cargar más".
- **Detalle** `/movimientos/[id]`: pantalla nueva con el mismo lenguaje visual (fecha, tipo, tarjeta, referencia, estado).
- **Estados:** esqueletos de carga, error con "Reintentar", vacío sin movimientos y vacío sin resultados (con "Limpiar filtros"). También hay pantalla de "no encontrado".
- **Navegación inferior** compartida: Home, Movimientos y Salir.
- **API REST:** `GET /api/movements`, `GET /api/movements/[id]`, `GET /api/account/cards`.
- **Correcciones de la revisión de T2.**
- **Capturas** en `docs/screenshots/`.

**Decisiones y por qué**

| Decisión | Por qué |
|---|---|
| Búsqueda y filtros en la URL (`?q=&type=`) | Se pueden compartir, sobreviven al recargar, funcionan con el botón atrás, y el filtrado ocurre en la base y no en el navegador. |
| Búsqueda con espera de 300 ms (debounce) + `router.replace` + `useTransition` | Una consulta por pausa y no una por tecla; no llena el historial; muestra un indicador mientras carga. |
| Chips de filtro como links | Funcionan sin JavaScript y conservan la búsqueda. |
| Paginación por cursor (`occurredAt` + `id`) en lugar de offset | Es estable si entran movimientos nuevos (con offset se duplican o saltean filas) y aprovecha el índice. |
| Cada consulta filtra por `userId`; un id ajeno da el mismo 404 que uno inexistente | Protección IDOR: nadie ve datos de otro cambiando el id en la URL, y ni siquiera se confirma que el id exista. |
| Ids mal formados se rechazan antes de ir a la base | Ahorra la consulta y evita entradas inválidas. |
| Casos de uso que reciben el repositorio por parámetro | Igual que el login: se testean con mocks, y el wiring con Prisma ocurre solo en las páginas y las rutas. |
| Montos como string con 2 decimales en la API | Mantiene la exactitud del `Decimal`; un número JSON podría perder precisión. |
| Fechas en zona horaria `America/Argentina/Buenos_Aires` | Vercel corre en UTC; sin esto, un movimiento de las 22 h aparecería al día siguiente. |
| Mismo schema zod con dos políticas | La página ignora parámetros inválidos y muestra todo (amable con el usuario); la API responde 400 con el detalle (estricta con el desarrollador). |
| `Suspense` con key por filtros | El esqueleto aparece solo en los resultados; el buscador y los chips no se desmontan y no se pierde el foco. |
| Error boundaries por sección | Si fallan los movimientos, la navegación sigue funcionando. |
| Dos estados vacíos distintos | "No tenés movimientos" y "No hay resultados para tu búsqueda" son situaciones diferentes y piden acciones diferentes. |
| "Volver" construido con parámetros validados | Vuelve a la lista con los mismos filtros y no se puede usar como redirección abierta a otro sitio. |
| Íconos y logos en SVG inline | Sin dependencias extra. |
| Lista sin encabezados por fecha | Se probó agrupar por "Hoy/Ayer", pero con un movimiento por día quedaba un título en casi cada fila. Se mantuvo la lista del diseño. |

**Correcciones de la revisión de T2:** `Content-Type` comparado exacto; errores de infraestructura devuelven 503 con un formato común `{ error: { code, message } }`; errores de validación completos en la API; el proxy no rompe si falta el secreto; constante compartida para `expired`; tests de todas las rutas REST y del proxy; ternario anidado reemplazado.

**Historial de commits:** T3 se hizo primero como un solo commit (95 archivos, ~4.500 líneas). La revisión automática no pudo procesarlo por tamaño, y además un commit así es difícil de revisar para cualquier persona. Se partió en 14 commits temáticos de ~400 líneas, cada uno con sus tests, y se verificó que cada uno compile y pase los tests por sí solo. El código final quedó idéntico byte a byte (mismo hash de árbol de git).

```
87b5e5a refactor(shared): add api error helpers, validation and route constants
cdf3dcb fix(auth): harden login and logout routes and proxy
e09aa1c feat(account): add card domain and prisma card repository
cf4534a feat(movements): add movement domain model, filters and cursor
fd60dd6 feat(movements): add movement use cases and dto
c93af86 feat(movements): add prisma repository with accent-insensitive search
bc95fba feat(api): add cards and movements rest endpoints
ac28de2 feat(ui): add shared bottom nav, icons, skeleton and error state
8bb36e8 feat(account): add home header and card carousel
2e35ee8 feat(movements): add movement row and list components
6ab2167 feat(movements): add filter chips and search
6772e5b feat(movements): add empty states, detail view and load more
633b41d feat(app): add home, movements and detail pages with loading and error boundaries
c36f451 docs: update project log and screenshots
```

**Revisión automática por tramos: los 4 aprobados, sin bloqueantes.**

| Tramo | Commits | Enfoques | Observaciones relevantes (no bloqueantes) |
|---|---|---|---|
| A — shared + hardening auth | `87b5e5a`…`cdf3dcb` | seguridad, resiliencia, legibilidad, confiabilidad | El manejo de errores convierte *cualquier* error en 503: un bug de programación debería ser 500, y se tragan los `redirect()`/`notFound()` de Next. |
| B — dominio, datos y API | `e09aa1c`…`bc95fba` | confiabilidad | El SQL crudo de búsqueda no tiene un test contra la base real; conviene verificar el cast del cursor. |
| C — componentes UI | `ac28de2`…`6ab2167` | confiabilidad | En el buscador, si cambiás de filtro mientras tipeás, la búsqueda pendiente puede aplicarse con el filtro anterior. |
| D — estados y páginas | `6772e5b`…`633b41d` | seguridad, resiliencia, legibilidad, confiabilidad | "Reintentar" no usa bien la función de Next; "Cargar más" ignora errores en silencio y, con la sesión vencida, puede reintentar sin parar. |

Todas se corrigen en T4.

**Tests:** 149 unitarios (28 archivos) y 13 end-to-end. La mayoría se escribió antes del código. Algunos (detalle, pantalla de error y helpers de tarjeta) se escribieron después; se reconoce honestamente.

**Verificación:** lint ✅ · typecheck ✅ · tests 149/149 ✅ · e2e 13/13 ✅ · build ✅ · prettier ✅

**Correcciones antes del commit** (detectadas al revisar juntos):
- **Búsqueda sin distinguir acentos:** "jose" encuentra "José". Se activó la extensión `unaccent` de Postgres con una migración. La consulta usa parámetros (`Prisma.sql`), nunca concatenación, así que no hay inyección SQL; además se escapan `%` y `_`, y buscar "%" no devuelve todo.
  - *Por qué no normalizar en la app:* habría que traer todas las filas para quitarles los acentos.
  - *Por qué no una columna normalizada:* es un dato duplicado que hay que mantener sincronizado; no se justifica para este volumen.
  - *Mejora futura:* índice trigram (GIN) sobre una función `unaccent` inmutable, para búsquedas rápidas con muchos datos.
- **404 real en el detalle:** un movimiento inexistente o ajeno ahora responde HTTP 404. Con un `loading.tsx` por encima, Next empieza a transmitir la página y el status queda fijo en 200 antes de saber si el movimiento existe. Los esqueletos de Home y lista se movieron a *route groups* (`(home)`, `(list)`) para que no envuelvan al detalle; las URLs no cambian. *Trade-off:* el detalle no muestra esqueleto mientras carga, pero es una sola consulta indexada.

**Limitación conocida:** el violeta de suscripción (`#C76DFF`) del diseño no llega al contraste AA en texto chico. Se respetó el diseño.

### T4 — Pulido final (05/10/2026)

**Qué se hizo**
- Se corrigieron todos los hallazgos de las revisiones automáticas de T3.
- Tests de integración contra Postgres real.
- La estructura de carpetas quedó unificada en las tres features.
- CI con GitHub Actions.
- README final en español.

**Correcciones y por qué**

| Cambio | Por qué |
|---|---|
| Errores de la API: 503 solo si la base no responde, 500 para el resto, y las redirecciones de Next se dejan pasar (`unstable_rethrow`) | Un 503 le dice al cliente "reintentá más tarde"; un bug no se arregla reintentando, es un 500 que hay que corregir. Antes, un `redirect()` dentro de una ruta se convertía en error. |
| Clasificador de errores de base (`db-errors.ts`) basado en errores observados | Con Prisma 7 y el adaptador `pg`, una conexión rechazada llega como `ECONNREFUSED`, no como el clásico `P1001`. Se verificó en la práctica en lugar de suponerlo. |
| Respuesta de login con formato `{ data }` / `{ error }` | Todas las respuestas de la API siguen el mismo formato. |
| Tests de integración (`pnpm test:integration`) contra Postgres | El SQL crudo de la búsqueda solo se puede probar contra una base real: acentos, `%`/`_`, aislamiento por usuario, desempate con timestamps iguales y paginación de las 26 filas sin duplicados. |
| Los tests de integración corren en zona horaria de Buenos Aires | Se probó que, si se rompe la conversión de fechas del cursor, los tests fallan (*mutation check*). |
| El buscador lee los filtros actuales al momento de disparar | Si cambiabas de chip mientras tipeabas, la búsqueda pendiente usaba el filtro viejo. |
| "Cargar más": mensaje de error con "Reintentar", redirección al login si la sesión venció, timeout de 10 s | Antes, los errores se ignoraban en silencio y con la sesión vencida podía reintentar sin fin. |
| Pantalla de error compartida (`RouteError`) que registra el error con su `digest` | Una sola implementación para todas las secciones, y el `digest` permite rastrear el error en los logs del servidor. |
| Los tests unitarios corren con `TZ=UTC` (como Vercel) | Garantiza que las fechas se ven bien en Argentina aunque el servidor esté en UTC. |
| Un id mal formado en la API sigue dando 404 y no 400 | La API nunca revela si un id existe o no. |

**Estructura:** `db.ts` pasó a `src/shared/lib/`. `auth` quedó con las mismas capas que las otras features, más `server/` para el código que solo corre en el servidor (Server Actions, sesión, orquestación del login). También se eliminaron exports que no se usaban.

**CI** (`.github/workflows/ci.yml`): en cada PR y en cada push a `main`. Corre en dos jobs: (1) lint, typecheck, formato y tests unitarios; (2) Postgres real con migraciones, seed, integración, build y e2e contra el build de producción.

**Tests:** 189 unitarios, 10 de integración y 13 end-to-end. Algunos tests de T4 se escribieron después del código: son *tests de caracterización*, que fijan un comportamiento que ya existía. Se aclara con honestidad.

**Verificación:** lint ✅ · typecheck ✅ · formato ✅ · unitarios 189/189 ✅ (3 corridas) · integración 10/10 ✅ · e2e 13/13 (dev y producción) ✅ · build ✅ · README probado en un clon limpio ✅

**Commits:**
```
97590c4 refactor: move prisma client to shared and layer the auth feature
9562bd6 fix(api): answer 503 only for database outages and rethrow next control flow
70f5d85 test(movements): run the sql repository against postgresql
815e835 fix(movements): apply the latest filters in the debounced search
2285768 fix(movements): recover from load more failures
1e078bc fix(ui): share error boundary, button styles and notification timer
c490b77 ci: add github actions workflow
dbe5dea docs: rewrite readme and update project log
876b44e test(auth): isolate missing-secret test from the environment
```

**Bug encontrado al commitear:** el CI define `SESSION_SECRET`, y el test "falla si falta el secreto" leía esa variable del entorno, así que en GitHub Actions iba a fallar. Se reprodujo con las mismas variables del CI (RED), se aisló el test con `vi.stubEnv` (GREEN) y se agregó `876b44e`. Lección: un test no debe depender del entorno en el que corre.

**Revisión automática por tramos: los 3 aprobados, sin bloqueantes.**

| Tramo | Commits | Observaciones relevantes (no bloqueantes) |
|---|---|---|
| E — estructura + errores de la API | `97590c4`…`9562bd6` | Algunos errores de Prisma desconocidos no se clasifican; un error de credenciales de la base se trata como caída (503) cuando es de configuración (500). |
| F — integración, buscador, "Cargar más" | `70f5d85`…`2285768` | Con la sesión vencida, "Cargar más" puede quedar en estado de carga mientras redirige; el test de integración depende de los datos del seed. |
| G — UI, CI, docs | `1e078bc`…`876b44e` | CI: fijar las acciones por hash y limitar los permisos del token (buenas prácticas de seguridad de supply chain). |

**Nota:** en el clon limpio, un test falló una vez y no se repitió en 17 corridas más. El sospechoso era un test del buscador que dependía del tiempo real; se reescribió con timers simulados.

### T4b — Cierre de observaciones (05/10/2026)

| Commit | Cambio | Por qué |
|---|---|---|
| `aee4565` | "Cargar más" pasa a un estado final "Tu sesión venció. Redirigiendo…" ante un 401 | El usuario entiende por qué se cortó la lista, en lugar de ver un botón trabado en "Cargando…". |
| `5fc30b8` | Errores de base clasificados en *no disponible* (503), *mal configurada* (500) y *no clasificado* (500) | Una contraseña de base incorrecta no se arregla reintentando: es un error de configuración. |
| `011f56b` | El test de integración crea y borra sus propios datos, y verifica que la zona horaria sea la de Buenos Aires | Un test no debe depender del seed ni del entorno: tiene que poder correr en cualquier base. |
| `952ad3e` | CI: acciones fijadas por hash de commit, permisos de solo lectura y `persist-credentials: false` | Seguridad de *supply chain*: un tag (`v4`) se puede mover a código malicioso, un hash no. |

**Clasificador basado en evidencia:** se probó contra el Postgres local con contraseña incorrecta, base inexistente, puerto cerrado y host desconocido, y se registró el error real de cada caso. Por ejemplo, una contraseña incorrecta da `P1000` en consultas normales y `P2010` (con `AuthenticationFailed` / `28P01`) en SQL crudo. Hay 6 tests de integración que reproducen esos casos.

**Nota:** Prisma bloquea `migrate reset` cuando lo ejecuta una IA, salvo con consentimiento explícito del usuario. No se forzó.

**Verificación:** unitarios 210/210 (también con las variables del CI) ✅ · integración 17/17 (con y sin seed) ✅ · e2e 13/13 ✅ · build ✅

**Revisión automática (4 enfoques): aprobada, sin bloqueantes.** Quedan sugerencias menores en tests (por ejemplo, un helper de test que podría ocultar un éxito inesperado). Se documentan y no se corrigen, porque no afectan el comportamiento.

---

## 6. Estructura del proyecto

Organización por features ("screaming architecture"): la carpeta cuenta qué hace la app, no qué framework usa. Cada feature separa **dominio** (reglas puras, sin dependencias, testeables), **datos** (repositorios con Prisma), **UI** (componentes) y, cuando hace falta, **server** (código que solo corre en el servidor: Server Actions, sesión). `app/` solo contiene rutas delgadas que conectan las piezas.

```
src/
├── app/                        ← solo rutas (delgadas): conectan features
│   ├── (app)/                  ← zona logueada: layout con navegación inferior
│   │   ├── (home)/             page + loading
│   │   ├── movimientos/
│   │   │   ├── (list)/         page + loading
│   │   │   └── [id]/           page + not-found (404 real)
│   │   └── error.tsx
│   ├── api/                    ← REST: auth/, movements/, account/ (con tests)
│   └── login/
├── features/
│   ├── auth/       domain/ data/ server/ ui/
│   ├── movements/  domain/ data/ ui/
│   └── account/    domain/ data/ ui/
├── shared/
│   ├── lib/        db, db-errors, api-response, validation, format, dates, like-pattern, routes
│   └── ui/         AppShell, BottomNav, Button, ErrorState, RouteError, Skeleton, icons
├── proxy.ts                    ← protección de rutas (+ test)
└── test/                       ← fixtures de tests
prisma/   schema · migrations (init, unaccent) · seed
e2e/      auth.spec.ts · movements.spec.ts (Playwright)
docs/     BITACORA.md · design/ (Figma) · screenshots/
```

**Convenciones**
- Los tests viven al lado del archivo que prueban (`x.ts` + `x.test.ts`). Los de integración contra la base usan `x.integration.test.ts`.
- Las carpetas entre paréntesis (`(app)`, `(home)`, `(list)`) son *route groups* de Next: organizan el código sin cambiar la URL.
- Las dependencias van en una sola dirección: `ui` → `domain` ← `data`. El dominio no conoce Prisma ni React.

---

## 7. Cómo correrlo

Los pasos completos, los scripts y la descripción de la API están en el [README](../README.md). Resumen:

```bash
pnpm install
cp .env.example .env
pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm dev               # http://localhost:3000

pnpm test              # unitarios
pnpm test:integration  # integración (requiere Postgres)
pnpm test:e2e          # end-to-end (requiere Postgres)
```
