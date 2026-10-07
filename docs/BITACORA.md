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
| — | Inspección ocular, limpieza de historial, alternativa desktop | ✅ Hecha (desktop archivada) |
| — | Fixes de mobile real | ✅ Hecha |
| T6 | Animaciones, ocultar saldo, resumen del mes | ✅ Hecha |
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

### Inspección ocular (05/10/2026)

Se recorrió la app juntos, en un navegador real (Chromium con Playwright, tamaño iPhone 390×844), sobre el build de producción.

**Qué se verificó**

| Flujo | Resultado |
|---|---|
| Login con contraseña incorrecta y correcta | ✅ |
| Home: tarjetas, carrusel, últimos movimientos | ✅ |
| Lupa → Movimientos con foco en el buscador | ✅ |
| Búsqueda "jose" encuentra "José Suárez" (sin acentos) | ✅ |
| Detalle → "Volver" conserva la búsqueda | ✅ |
| Chips de filtro conservan la búsqueda | ✅ |
| "Cargar más": 26 movimientos, sin duplicados, el botón desaparece al final | ✅ |
| URL inventada → HTTP 404 real con pantalla amigable | ✅ |
| Campana → "Próximamente" | ✅ |
| Salir + botón atrás → rebota al login | ✅ |

**Hallazgos y decisiones**
- **El último chip se ve cortado:** es intencional, igual que en el Figma. Indica que la fila se desliza. Para reforzarlo se agregó un **degradé** en el borde derecho (máscara CSS del mismo ancho que el margen, así el último chip se ve completo al llegar al final). Commit `6edda00`.
- **"Se perdió la búsqueda":** se reprodujo el recorrido de forma automatizada (incluso tocando un chip antes de que pasen los 300 ms del buscador) y la búsqueda siempre se conserva. Lo más probable es que se haya vuelto con "Movimientos" de la barra inferior, que a propósito abre la lista limpia, como una pestaña. No es un bug.
- **Desktop "raro":** el Figma es solo mobile, y en desktop la app se mostraba como una columna de teléfono centrada. Ver la alternativa más abajo.

### Limpieza del historial de git (05/10/2026)

La preparación para la entrevista vivía en esta bitácora y se movió a un archivo personal ignorado por git, pero seguía en las versiones anteriores del historial. Se reescribieron los commits (`git filter-branch`) para quitar esa sección de todas las versiones, y se verificó que:
- no quede en ningún commit;
- el código final sea idéntico al anterior (mismo árbol);
- las referencias a commits de esta bitácora se actualizaron a los nuevos hashes (`3627e4d`).

Se hizo antes de publicar, porque reescribir el historial de algo ya publicado rompe los clones de otras personas.

### Alternativa: layout responsive para desktop (05/10/2026) — 🗄️ archivada, fuera de la entrega

**Decisión:** no se incluye en el challenge. La entrega usa la columna centrada en desktop, que respeta el Figma (solo mobile) sin agregar diseño propio. La alternativa (3 commits) se guardó **fuera del repo**, como bundle de git y parches, por si se retoma más adelante.

| Decisión | Por qué |
|---|---|
| Cambios solo desde 1024px (`lg`) | Mobile queda **idéntico píxel por píxel** al Figma (verificado con `magick compare`: 0 píxeles de diferencia). |
| Barra lateral en lugar de nav inferior | Es el patrón estándar en desktop; la nav inferior y la lateral comparten la misma lista de rutas y la lógica de "activo" (sin duplicar). |
| Home en dos columnas: tarjetas apiladas a la izquierda, movimientos a la derecha | Dos tarjetas lado a lado quedaban estiradas, y filas de 1000px se ven vacías; así todo entra sin scroll. |
| Buscador y chips en una sola barra recién desde 1280px | A 1024px, con la barra lateral, los chips no entran al lado del buscador. |
| Login partido: panel granate de marca + formulario | Aprovecha el ancho con la identidad visual del club, sin inventar estilos nuevos. |
| La nav oculta usa `display:none` | Los lectores de pantalla ven un solo menú "Principal", no dos. |

**Verificación:** 216 tests unitarios y 16 e2e (13 mobile sin cambios + 3 desktop) ✅

**Trade-off:** es diseño propio (el Figma no tiene desktop). Argumento para la entrevista: "extendí el sistema de diseño a desktop sin tocar la versión mobile del Figma".

### Fixes de mobile real (05/10/2026)

| Commit | Cambio | Por qué |
|---|---|---|
| `94ed88e` | Inputs a 16px; safe areas con `viewport-fit=cover`; `theme-color` | iOS Safari hace zoom al enfocar inputs de menos de 16px. El placeholder sigue chico como en el Figma, porque el zoom depende del tamaño del input, no del placeholder. Sin `viewport-fit=cover`, `env(safe-area-inset-*)` vale 0. |
| `8c47d3a` | Íconos de GranaBank (SVG, apple-icon, `.ico`) y web manifest | Reemplaza el ícono por defecto de Next. El `.ico` se mantiene para Safari viejo, que ignora los favicons SVG. |
| `e7b3e2b` | README "Cómo ver los estados" | El evaluador puede provocar cada estado: vacío, carga, error y 404. Cada instrucción se probó contra el build de producción. |

La barra del navegador usa el color de fondo y no el granate: todas las pantallas arrancan con un header claro y una franja granate arriba quedaría cortada.

**Revisión (4 enfoques): aprobada, sin bloqueantes.**

### T6 — Animaciones y valor agregado (05/10/2026)

**Criterio:** cada animación *comunica* algo (de dónde viene un elemento, que algo cambió, que se tocó un botón). Duran entre 150 y 300 ms, animan solo `transform` y `opacity` (sin recalcular el layout) y **se desactivan con "reducir movimiento"**, con tests que lo verifican. No se agregaron librerías.

| Feature | Decisión y por qué |
|---|---|
| Tokens de movimiento en `globals.css` | Duraciones y curvas definidas una sola vez, como el resto del sistema de diseño. |
| Feedback al tocar | Filas, chips y botones se achican a 0.97: confirma el toque como en una app nativa. |
| Esqueletos con brillo | Indican que algo está cargando y no que la pantalla está rota. |
| Ícono que viaja de la lista al detalle | React `<ViewTransition>`, incluido en el App Router de Next 16. Solo se anima el par tocado. Los navegadores sin soporte navegan normal. |
| Filas que entran escalonadas | Animación CSS que corre solo cuando una fila se inserta: al cargar y solo las nuevas con "Cargar más". Nunca se repite en un re-render. |
| Saldo que cuenta hacia arriba | El último cuadro usa el formateador real, así que el valor final es exacto. Los lectores de pantalla solo escuchan el valor final. No se repite al recargar la página (no muestra 978.85 → 0 → 978.85). |
| **Ocultar saldo** (👁) | La preferencia vive en una **cookie** que lee el servidor, no en localStorage: el saldo oculto nunca parpadea visible al cargar. El botón usa `aria-pressed` con un nombre fijo (patrón WAI-ARIA de toggle). |
| **Resumen del mes** | Ingresos = recibidos; egresos = enviados + suscripciones. Solo movimientos completados (un pendiente todavía puede fallar). La suma la hace la base con `groupBy` sobre `Decimal`, y los centavos se combinan como enteros, nunca como float. El mes empieza a medianoche de Buenos Aires (03:00 UTC). Tiene su endpoint `GET /api/movements/summary?month=AAAA-MM`. |

**Limitación conocida:** con el saldo oculto, el valor igual viaja en los datos de la página. La función protege de quien mira la pantalla, no de quien inspecciona el código; es el mismo criterio que usan las apps bancarias.

**Commits:** 11, de `5a6ed87` a `dd9eb60`, cada uno verificado por separado.

**Verificación:** unitarios 263/263 ✅ · integración 21/21 ✅ · e2e 24/24 (dev y producción) ✅ · build ✅. Video de las animaciones en `docs/screenshots/motion-demo.webm`.

**Revisión en 3 tramos: los 3 aprobados, sin bloqueantes.** Las observaciones menores se cerraron en T6b:
- `da04d2d`: el mes del resumen se limita a 2000-01…2100-12, una ventana fija para que los tests no dependan de la fecha actual.
- `4eb6814`: el hover de las filas respeta "reducir movimiento".
- `8a67dfd`: los tests son deterministas, sin esperas fijas.

Un test del saldo **pasaba por casualidad**: la animación nunca avanzaba en jsdom y el test verificaba `0.00` en vez del saldo real. Ahora verifica 978.85. Los e2e se corrieron 3 veces seguidas (25/25 en las tres) y la revisión salió aprobada.

### T7 — Versión premium y recorrida completa en navegador (06/10/2026)

**Merge de la versión premium.** La rama `feat/premium-motion` se había hecho en un worktree aparte y nunca se había integrado. Se incorporó con *fast-forward* (`cb048be..3c15bde`), sin conflictos:

| Feature | Qué aporta |
|---|---|
| Tarjeta "viva" | Se inclina con el dedo o el mouse y tiene un brillo que la recorre; el carrusel tiene profundidad. |
| Saldo tipo odómetro | Los dígitos ruedan como un contador mecánico. Reemplaza al conteo lineal de T6. |
| Header glass y nav con indicador | El header se vuelve translúcido al hacer scroll; la pastilla granate se desliza a la pestaña activa. |

**Cambio de criterio:** en T6 se evitó sumar librerías. La versión premium agrega `motion`, porque la física de resortes (inclinación, odómetro, indicador) es difícil de lograr bien a mano. Se carga por partes (`LazyMotion`) para no inflar el bundle, y sigue respetando "reducir movimiento".

**Recorrida de punta a punta** con un Chromium visible en tamaño iPhone (390×844). Se verificó en vivo:
- Login: errores por campo con `aria-invalid`; credenciales inválidas sin revelar si falló el email o la contraseña.
- Protección de rutas: sin sesión, `/` responde 307 a `/login`.
- Animaciones: brillo de los esqueletos, filas escalonadas, morph del ícono lista → detalle y odómetro del saldo al navegar a Home.

**Morph de vuelta (detalle → lista):**
- Con el link "Volver" **funciona en producción**: el prefetch del link trae la lista antes de navegar, así el ícono "pareja" existe cuando cambia la pantalla. En `next dev` no hay prefetch, y por eso no se ve en desarrollo.
- Con el **botón atrás del navegador no se anima**. React restaura esa entrada del historial de forma síncrona y no inicia ninguna view transition. Es una limitación del framework. No se intercepta el historial para forzarlo, y queda un test que fija el comportamiento actual (solo puede fallar la espera de la transición) y se pone en rojo el día que el framework lo soporte.

**Fidelidad al diseño:** se evaluó cambiar las filas y poner signo a los montos, pero el Figma muestra filas como tarjetas separadas y montos sin signo. Se mantiene el diseño.

**Probar desde el celular:** `ALLOWED_DEV_ORIGINS` (solo dev) habilita la IP de la máquina en la red local. Los pasos están en el README.

#### Local vs. producción

| Tema | Local (desarrollo) | Producción (Vercel, prevista: el deploy es T5) |
|---|---|---|
| Servidor | `next dev`: sin prefetch, con recarga en caliente y el indicador "N" de Next abajo a la izquierda | `next build` + `next start`: prefetch de links, sin indicador de dev |
| Base de datos | PostgreSQL 17 en Docker (`pnpm db:up`), puerto 5432 | Neon (Postgres administrado) desde el Marketplace de Vercel |
| Migraciones | `pnpm db:migrate` (`prisma migrate dev`, puede crear migraciones) | `pnpm db:deploy` (`prisma migrate deploy`, solo aplica las existentes) |
| Datos | `pnpm db:seed`: usuario demo y 26 movimientos | Seed una única vez sobre la base de producción |
| Variables | `.env` local (no se versiona); `.env.example` como plantilla | Variables de entorno del proyecto en Vercel |
| `SESSION_SECRET` | Cualquier valor de 32+ caracteres | Secreto aleatorio (`openssl rand -base64 32`), nunca el del ejemplo |
| Cookie de sesión | `httpOnly`, `SameSite=Lax`, **`secure=false`** (se usa `http://localhost`) | `httpOnly`, `SameSite=Lax`, **`secure=true`** (solo viaja por HTTPS) |
| Cliente de Prisma | Se guarda en `globalThis` para no abrir conexiones nuevas en cada recarga | Una instancia por proceso |
| `ALLOWED_DEV_ORIGINS` | Habilita la IP de la red local para probar en el celular | No tiene efecto: solo aplica a `next dev` |
| Morph "Volver" | No se ve (no hay prefetch) | Funciona |
| Tests e2e | `pnpm test:e2e` levanta `next dev` en el 3100 | Con `CI=1` levanta `next start` y prueba el build real |

**Detalle importante:** el build de producción no se puede probar desde el celular por `http://` en la red local, porque la cookie `Secure` se descarta fuera de HTTPS (los navegadores solo hacen excepción con `localhost`). En Vercel hay HTTPS y no pasa.

**Revisiones:**
- `.gitignore` (scripts locales): aprobada.
- Fix del morph de vuelta, e2e y checklist: aprobada, con 2 observaciones menores. Se aplicó la principal en dos pasos. Primero `test.fixme` → `test.fail`, porque `fixme` no ejecuta el cuerpo y nunca avisaría. Después, por otra observación de la revisión (`test.fail` aceptaba cualquier falla, hasta un login roto), un test normal que solo admite el timeout de la espera de la transición.

**Hallazgo probando la API con `curl`:** si el JSON del login venía *sin* `email` o `password`, zod respondía su mensaje por defecto en inglés ("Invalid input: expected string…"). La UI no se veía afectada porque el formulario siempre manda los campos, pero un cliente de la API sí. Se corrigió con `z.string({ error })` y un test que primero falló (RED).

**Checklist del enunciado:** `docs/CHECKLIST.md`, con el estado de cada requerimiento y su evidencia.

### T12a — Solo colores del manual de marca (07/10/2026)

**Pedido:** la app tiene que usar únicamente la paleta del manual del club (pág. 10: granate Pantone 188 C, oro Pantone 618 C y Cool Gray 7C), sin el violeta, el naranja, el verde ni el ámbar del Figma, y sin desequilibrar el diseño.

**Qué se hizo:**
- Todos los colores ya eran tokens en `globals.css`, así que se cambiaron los **valores**, no los nombres: los componentes y sus tests (`text-subscription`, `bg-sent-soft`…) no se tocaron.
- Suscripción y pendiente → oro oscurecido (`#6F5C14`); enviado → Cool Gray oscurecido (`#5E5D61`); completado → granate; recibido sigue granate. Los azulejos son 25 % del color oficial sobre blanco, como `primary-soft`.
- Texto principal y fondo pasaron a neutros sobre el tono del Cool Gray (`#1B1A1D`, `#F9F9FA`), sin el tinte azul del Figma. `APP_BACKGROUND_COLOR` (barra del navegador y manifest) se actualizó con el CSS.
- **Excepción:** el error sigue rojo (se lee como error en cualquier contexto y el granate ya es "dinero recibido"), corrido hacia el tono del granate (`#B32D32`) y bien separado de él en claridad.

**Tests primero:** `src/app/brand-palette.test.ts` lee `globals.css`, resuelve los `var()` y verifica (1) que cada token tenga su valor de la lista permitida, (2) que todo token que no sea neutro esté en el tono del granate o del oro (salvo la familia `danger`) y (3) que cada par texto/fondo nuevo llegue a 4,5:1. Falló (9 tests en rojo) antes de cambiar el CSS y pasó después.

**Resultado:** desaparece la limitación conocida del violeta (no llegaba a AA); ahora todos los pares de texto de los roles están entre 5,2:1 y 17,3:1.

### T12b-B — Un solo lenguaje de movimiento (07/10/2026)

**Pedido:** el movimiento tenía que sentirse de iOS, no de demo: había ~9 duraciones, 3 curvas, 6 resortes (varios con rebote) y efectos decorativos.

**Lenguaje de movimiento** (`globals.css` + `shared/ui/motion/tokens.ts` / `springs.ts`):

| Token | Valor | Uso |
| --- | --- | --- |
| `fast` | 160 ms | presión, fundidos, máscara del saldo, esqueleto que se va |
| `base` | 280 ms | contenido que llega (filas, reveal, contenedor, trazo del check) |
| `nav` | 400 ms | pantalla entera (push / pop) |
| curva | `cubic-bezier(0.32, 0.72, 0, 1)` | la única curva (la de iOS) |
| `SPRING` | 300 / 35 (ζ ≈ 1,01) | todo lo que mueve el dedo: inclinación, vuelta, píldora, punto del carrusel |
| `ROLL_SPRING` | 170 / 24 / 0,9 (ζ ≈ 0,97) | excepción: rodillo del saldo (pasa millonésimas, invisible) |

No son duraciones (y se documentan así): el escalonado de filas (40 ms), el período del brillo del esqueleto (1,4 s) y la espera de la intro (420 ms).

**Qué se sacó y por qué:**
- Barrido de luz de 1,2 s sobre la primera tarjeta: decoración que se repetía en cada carga.
- `blur` en transiciones (reveal 2 px, saldo 6 px): repinta la capa cada cuadro y se lee "efecto"; ahora opacidad + 4 px.
- Rebotes: inclinación (ζ 0,58), check de éxito (pop 380/22), píldora; todo pasa al resorte crítico. El check ya no salta: el badge aparece y el trazo se dibuja en ~280 ms.
- Fundido + escalado al cambiar de pestaña: una tab bar nativa cambia al instante.
- Filas que volvían a entrar con cada filtro y con "Cargar más": ahora solo la primera lista de la carga, hasta 6 filas escalonadas (`row-entrance.ts` marca `<html data-rows-entered>` cuando terminan).
- Brillo y sombra de la tarjeta, un poco más tenues.

**Se mantuvo:** push/pop con paralaje (400 ms, pop con sus propios keyframes), rodillo del saldo, píldora, vuelta de tarjeta, presión a 0,97, esqueleto → contenido y todos los modos de movimiento reducido.

**Tests primero:** `tokens.test.ts` (3 duraciones, 1 curva, sin tiempos sueltos en CSS ni en componentes, sin `blur` en keyframes, pestañas sin animación), `springs.test.ts` (ζ ≥ 1 salvo el rodillo), `row-entrance.test.ts` y el saldo sin desenfoque: en rojo antes del cambio, verdes después. Los e2e que fijaban el barrido, el fundido de pestañas y las filas en cada filtro se reescribieron para fijar el comportamiento nuevo. De paso, la intro de marca se desmonta aunque su disolución termine antes de hidratar (antes podía quedar montada).

---

### T12b-D — Lista de movimientos agrupada y montos con signo (07/10/2026)

**Pedido:** la auditoría de UX mostró que cada fila era su propia tarjeta con sombra (pesado: entraban ~3 filas sobre la barra), que una lista de 20 filas no tenía fechas y que los montos sin signo, coloreados por tipo, no dejaban leer qué entra y qué sale.

**Decisión revertida:** en T7 (06/10) se había decidido mantener las filas como tarjetas separadas y los montos sin signo, como en el Figma. **El usuario revirtió esa decisión el 07/10/2026**: se prioriza la legibilidad de la lista sobre la fidelidad al Figma en este punto.

**Qué se hizo:**
- **Superficie agrupada:** las filas de Home y de Movimientos comparten una sola superficie blanca (`grouped-list` en `globals.css`) con separadores de 1 px que arrancan después del ícono. Filas de ~64 px (ícono de 40 px), sin elevarse al pasar el mouse: se tiñen, como las filas de una lista. El foco se dibuja hacia adentro porque la superficie recorta sus bordes.
- **Días en Movimientos:** `groupMovementsByDay` agrupa por día calendario de Buenos Aires (`dayOf` y `formatDayLabel` en `src/shared/lib/dates.ts`): "Hoy", "Ayer", "5 de octubre", y "31 de diciembre de 2025" cuando el año no es el actual. Los encabezados quedan pegados debajo del buscador y los chips: un componente sin vista (`StickyFiltersHeight`) mide ese bloque y publica su alto en una variable CSS. "Hoy" lo decide el servidor una vez, así el navegador no puede nombrar distinto un día al hidratar. La primera página y las de "Cargar más" son una sola lista, así una página que continúa un día se suma a su grupo.
- **Home** usa un solo grupo, sin encabezados: cinco filas partidas en dos o tres días se leerían como fragmentos, y "Últimos movimientos" ya dice que son los más nuevos.
- **Signo por dirección:** sale → `−` (U+2212), entra → `+`. Entra solo `RECEIVED`; salen `SENT` y `SUBSCRIPTION` (débito automático), con la misma regla que el resumen del mes. El monto es granate si entra y tinta si sale; el color del tipo queda en el ícono. El detalle usa la misma convención (`MovementAmount`).
- Esqueletos dentro de una superficie agrupada, con encabezado de día en Movimientos.

**Tests primero:** primero los tests de `dayOf`/`formatDayLabel` (Hoy, Ayer, cambio de mes y de año, zona horaria), de `groupMovementsByDay` (orden, unión de páginas) y los de fila/detalle/lista con signo, tono y lectura ("menos 95 dólares", "Recibido"); fallaron (5 y 7 en rojo) y pasaron después. En e2e, la lista se busca como región "Lista de movimientos"; se agregó un test de encabezados pegados debajo de los filtros y de días sin repetir tras "Cargar más". Como Home ahora es más corta (scrollea ~56 px a 390×844), los tests del header de vidrio scrollean 52 px en lugar de 200.

---

### T12b-A — UX bloqueante: transferir enfocado y cerrar sesión fuera de la barra (07/10/2026)

**Pedido (auditoría de UX):** en un iPhone (390×844) el "Continuar" del paso del monto y medio "Motivo" quedaban debajo de la barra inferior translúcida; "Cerrar sesión" era la tercera pestaña, en plena zona del pulgar; el monto no agrupaba miles al tipear y la transferencia arrancaba desde la tarjeta en dólares.

**Qué se hizo y por qué:**
- **Transferir es una tarea enfocada:** la barra inferior se oculta en `/transferir` (pasos, comprobante, error) y `--nav-clearance` baja a 0 sin ella (`:root:not(:has([data-bottom-nav]))`). La única salida es terminar o "Volver", como en las apps de bancos; por eso la pantalla de error de `/transferir` ganó su propio "Volver".
- **Botón fijo abajo (`StepActions`):** cada paso llena la pantalla y su acción principal es `sticky` al fondo con `mt-auto`: en un paso corto queda abajo, en uno largo no se va de la pantalla. Se eligió `sticky` y no `fixed` para que el botón siga en el flujo del documento (orden de foco y lectura naturales, sin calcular alturas). Sube por encima del teclado con `visualViewport` (iOS y Chrome solo achican el viewport visual). En "Destinatario" el botón queda debajo de "Recientes" y envía el formulario con el atributo `form`.
- **Deshabilitado claro:** gris plano con texto apagado, sin el brillo ni la sombra; antes era el granate al 70 % y parecía tocable.
- **Barra inferior = secciones:** quedó Inicio · Movimientos. No se agregó "Transferir" como pestaña: abriría una pantalla sin barra (la pestaña nunca se vería activa) y Enviar/Recibir ya están a un toque en Home.
- **Perfil:** las iniciales en el header de Home abren una hoja inferior (`<dialog>` modal nativo: foco atrapado, Escape, devuelve el foco) con nombre, email y "Cerrar sesión", que pide confirmación ("¿Cerrar sesión?", el foco va a "Cancelar"). Se reutiliza la misma Server Action `logout`.
- **Monto con miles al tipear:** `editAmount` reescribe el texto en cada tecla y calcula dónde va el cursor contando dígitos y separador decimal. Solo cambia la vista: lo que muestra se parsea igual con `parseAmount` (sin tocar el servidor). Un punto tipeado queda "abierto" hasta que los dígitos siguientes deciden si es decimal o de miles, igual que el parser.
- **Tarjeta por defecto:** la de pesos. La app no registra la última tarjeta usada, así que no hay nada mejor que preferir.

**Tests primero (rojo → verde):** `defaultSourceCardId` (2 tests en rojo), `editAmount` (43 casos: agrupar, decimal, borrar sobre un punto, cursor en el medio, pegar), el monto en `TransferFlow` (agrupa y mantiene el cursor), `BottomNav` (sin botón de salir, oculta en `/transferir`), `ProfileMenu` (confirmación, cancelar, foco) y `keyboardInset`. E2E nuevo `focused-flows.spec.ts`: sin barra en el flujo, cada botón visible y sin nada encima (`elementFromPoint`) a 390×844, la barra vuelve al salir y cerrar sesión desde la hoja; falló (3 de 4) antes del cambio.

**Pendiente (no se hizo):** "saldo visible por defecto". Choca con la decisión de T13 (el ojo revela saldo, número y CVV, todo oculto por defecto, y el saldo no viaja en el HTML) y no existe una cookie de "ocultar saldo" que conservar. Queda para que se decida explícitamente.

### T12b-C2 — Tarjetas en español y segunda tarjeta en oro (07/10/2026)

**Pedido:** las tarjetas de Home decían "Balance" y "Exp. Date", el número oculto usaba asteriscos y la segunda tarjeta era rosa, fuera del manual del club.

**Qué se hizo y por qué:**
- **Etiquetas en español:** "Saldo" y "Vence" (el reverso ya decía "Firma autorizada", "CVV" y "Tocá para volver").
- **Número oculto con viñetas:** `•••• •••• •••• 1234`, agrupado 4-4-4-4 como el número revelado (`formatMaskedCardNumber`, función pura). La viñeta queda en el centro óptico de los dígitos, así que se quitó el corrimiento que necesitaba el asterisco. Sin clipping de 240 a 390 px.
- **Segunda tarjeta en oro satinado** (`card-gold` `#DCCA8E`, sombra `card-gold-shade` `#CDB66A`, etiquetas `card-gold-label` `#4D4219`, todo en el tono del oro Pantone 618 C). Se descartó una tarjeta grafito: la marca de Visa va en su azul oficial, sin tocar, y sobre un fondo oscuro no se leería. Con el oro las dos tarjetas son los dos colores del club, como el escudo. El chip de moneda toma el otro color: oro sobre granate, granate sobre oro.
- Contraste: texto 9,0:1 / 7,3:1 (claro / sombra), etiquetas 6,1:1 / 5,0:1, marca de Visa 8,7:1 / 7,1:1.

**Tests primero (rojo → verde):** `formatMaskedCardNumber` (2 en rojo), etiquetas y viñetas en `PaymentCard` y `CardReveal` (5 en rojo), y `brand-palette.test.ts` con los tokens nuevos en la lista permitida, sus pares de contraste y el azul de Visa sobre cada parada (7 en rojo). Los e2e de `card-reveal.spec.ts` esperan las viñetas.

---

### T12b-C3 — QR en Recibir y errores del login sobre granate (07/10/2026)

**Pedido (auditoría de UX):** Recibir no tenía QR y su recuadro informativo era un cuarto estilo de superficie; en el login, el aviso de credenciales incorrectas era un recuadro rosa pálido con texto rojo pegado sobre el granate, distinto del rojo claro de los errores de cada campo.

**Qué se hizo:**
- **QR de Recibir:** `receiveQrPayload` (dominio, puro) arma `GranaBank` / `Alias: …` / `CVU: …` y rechaza un alias o CVU inválido. Es texto plano a propósito: no se finge un QR de "Transferencias 3.0" (payload EMVCo de un adquirente registrado). `QrCode` (`src/shared/ui/qr/`) lo dibuja en el servidor como un solo `<path>` SVG (las corridas de módulos se unen en rectángulos, sin costuras al escalar), granate sobre blanco, zona de silencio de 4 módulos, corrección H y sin logo. Ancho fluido hasta 208 px. Librería: `uqr` (sin dependencias); se descartó `qrcode` por sus tres dependencias.
- **Recuadro informativo:** dejó de ser una caja rosada; es una nota sin fondo con el ícono en el azulejo suave de la app. Quedan dos superficies en la pantalla: la tarjeta blanca y el texto.
- **Login:** el aviso es un recuadro granate oscuro translúcido (`primary-deep` al 60 %) con anillo fino, ícono y texto `#FFB4AB`: 8,2:1 sobre la zona más clara del fondo, 9,9:1 en la más oscura. Los errores de campo usan el mismo color y el mismo ícono. Se mantienen `role="alert"` y el mensaje genérico (no revela si el email existe); la lógica de autenticación no se tocó.

**Tests primero:** payload del QR, matriz → path SVG, `QrCode` con `role="img"` y etiqueta, y el aviso del login con sus clases: en rojo antes del cambio, verdes después. `brand-palette.test.ts` suma el contraste del aviso compuesto sobre el fondo.

**Pendiente (resuelto en la integración, ver T12b-C):** "Copiar" al lado del valor y el agrupado del CVU (que terminaba en un par suelto) necesitaban tocar `ReceiveDetailsCard` y dos tests de la API, fuera del alcance autorizado de esta tarea.

---

### T12b-C1 — Barra de navegación tipo iOS y acciones en el detalle (07/10/2026)

**Pedido (auditoría de UX):** la píldora "Volver" con sombra pesaba más que el contenido de las pantallas apiladas, y el detalle del movimiento era un callejón sin salida que además repetía el estado (etiqueta + fila "Estado").

**Qué se hizo y por qué:**
- **`NavBar`** (`shared/ui`): chevron solo de 44×44 con nombre "Volver", título corto centrado ("Movimiento", "Transferir", "Recibir") y un lugar a la derecha ("Paso 2 de 3"). Se pega arriba y se vuelve vidrio ligado al scroll, sin duración propia. Se conservan el link real, el `prefetch` completo y los tipos de transición (pop, o cierre de acción rápida), así que el pop y los morphs siguen iguales. En los pasos de Transferir el encabezado pasó a ser un fragmento para que la barra quede pegada durante todo el paso. Se borraron `BackLink` y `back-control.ts`.
- **Detalle:** se sacó la fila "Estado" (queda la etiqueta, más clara junto al monto) y se agregó una lista agrupada de acciones: compartir comprobante (Web Share API, o copiar con un "Copiado" discreto), copiar referencia y repetir transferencia.
- **Repetir:** solo para transferencias enviadas a una cuenta con alias (el repositorio lee el alias del destinatario solo en el detalle). Lleva a `/transferir?to=alias`; el servidor valida el alias con las reglas del formulario (nada de CVU en URLs) y lo resuelve como la búsqueda del paso 1 antes de saltar al paso del monto.

**Tests primero (rojo → verde):** `NavBar`, `MovementActions` (compartir, cancelar la hoja, copiar como respaldo, error al copiar, repetir solo si corresponde), `movementShareText` / `repeatTransferAlias`, `parseTransferTo` / `resolveTransferPrefill`, el detalle (un solo estado, repetir solo en enviadas con alias) y `TransferFlow` con prefill; 6 tests y 4 módulos en rojo antes del cambio. Integración: `findById` trae el alias solo del lado que envía. E2E (proyecto de solo lectura): detalle de la transferencia del seed → chevron ≥ 44 px, un estado, copiar comprobante, repetir abre el paso del monto; `?to=` con un CVU o el alias propio se ignora.

---

### T12b-C — Integración de C1, C2 y C3 (07/10/2026)

Las tres ramas salieron de la misma base y se integraron en orden C2 → C3 → C1. El único conflicto fue esta bitácora (las tres entradas iban al mismo lugar): quedaron las tres, en ese orden.

**Qué se terminó al integrar:**
- **"Copiar" al lado del valor** en Recibir: el botón va dentro del mismo `<dd>` que el alias o el CVU (el `<dl>` sigue siendo válido) y el valor sigue seleccionable. En pantallas angostas el CVU puede partirse en dos líneas, siempre entre grupos.
- **CVU agrupado de a cuatro desde el final:** `28 5059 0940 0904 1813 5201` (22 dígitos = un par al principio + cinco grupos de cuatro). Nunca termina en un par suelto y el último grupo son justo los 4 dígitos que deja ver el enmascarado (`•• •••• •••• •••• •••• 5201`). Un solo formateador (`groupForReading`) sirve a los dos; los tests de dominio, de las rutas de la API, de la UI y el e2e de Recibir usan el formato nuevo.
- **Esqueleto de Recibir** con el marco de la `NavBar` (fila de 44 px, chevron y título) en lugar de la píldora vieja.

**Tests que fallaban bajo carga (no en una máquina tranquila):**
- `card-flip.spec.ts` ("un toque da vuelta la tarjeta"): con 12 workers fallaba 9 de 10. Causa: la URL cambia a `/` mientras Home todavía muestra el esqueleto; el test medía la tarjeta y tocaba con el mouse "crudo" antes de que las tarjetas llegaran y terminara la transición, y ese toque se perdía. Ahora espera el botón de la tarjeta y que termine la transición: 50 de 50.
- `navigation-motion.spec.ts` (la intro de marca se desmonta): 1 falla en 95 con 12 workers, con la página ya hidratada. El `animationend` de la disolución puede llegar mientras React todavía hidrata y perderse; ahora la intro también se desmonta con la promesa `finished` de esa animación (test unitario primero, en rojo y después verde).
- "Toques durante una transición" (`navigation-motion.spec.ts`) falló 1 de 5 solo con 12 workers en 12 núcleos (más carga que CI): los tres toques van separados por 120 ms y, con la CPU saturada, uno cae mientras el navegador todavía no pinta la pantalla nueva. En una máquina tranquila pasa siempre; queda anotado, sin cambios.

---

### T11 — Tokens y pantallas para Figma (07/10/2026)

**Pedido:** llevar el sistema visual a Figma sin copiar valores a mano: tokens importables como variables y una captura de cada pantalla y estado. (La parte que usa la cuenta de Figma, vía MCP, queda para cuando esté conectada.)

**Qué se hizo:**
- **`pnpm tokens:figma`** lee los bloques `@theme` y `:root` de `globals.css` y escribe `design/tokens.figma.json` en formato DTCG: 43 colores (marca, roles, neutros y tarjeta) en hex final, 14 sombras, 2 familias tipográficas, 5 duraciones y la curva. La descripción de cada token sale del comentario que tiene arriba en el CSS, así que el porqué de cada color viaja con él. Salida determinística (claves ordenadas, formato de Prettier: `pnpm format` no la cambia).
- **Un solo resolvedor:** `src/shared/lib/design-tokens.ts` (puro) resuelve `var()`, `rgb()` y `color-mix()` en sRGB. `brand-palette.test.ts` usa el mismo en lugar de su copia.
- **`--check`** falla si el JSON commiteado quedó viejo; un test hace lo mismo dentro de `pnpm test`.
- **`pnpm screens:capture`** (Playwright) guarda 18 PNG de 390×844 @2x en `design/screens/` (sin versionar, ~5 MB). Espera fuentes, imágenes, view transitions y animaciones antes de cada captura (la primera versión sacaba la vuelta de tarjeta a mitad del fundido). Solo envía una transferencia con `CAPTURE_ALLOW_MUTATION=1`, y se niega si `DATABASE_URL` no es una base `_test`.

**Tests primero (rojo → verde):** parser de bloques y comentarios, resolvedor de colores (cadenas de `var()`, alfa, `color-mix()` contra transparente y contra un color, ciclos), sombras, agrupado DTCG, orden determinístico y detección de archivo viejo. El guard de la captura tiene sus tests; la captura en sí se verificó corriéndola contra `next start` sobre `granabank_test` y mirando las imágenes.

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
