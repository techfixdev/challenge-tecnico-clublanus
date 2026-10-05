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

**Commit:** `797e7d2` — `feat(auth): add login, jwt session cookie and route protection`

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

**Tests:** 149 unitarios (28 archivos) y 13 end-to-end. La mayoría se escribió antes del código. Algunos (detalle, pantalla de error y helpers de tarjeta) se escribieron después; se reconoce honestamente.

**Verificación:** lint ✅ · typecheck ✅ · tests 149/149 ✅ · e2e 13/13 ✅ · build ✅ · prettier ✅

**Correcciones antes del commit** (detectadas al revisar juntos):
- **Búsqueda sin distinguir acentos:** "jose" encuentra "José". Se activó la extensión `unaccent` de Postgres con una migración. La consulta usa parámetros (`Prisma.sql`), nunca concatenación, así que no hay inyección SQL; además se escapan `%` y `_`, y buscar "%" no devuelve todo.
  - *Por qué no normalizar en la app:* habría que traer todas las filas para quitarles los acentos.
  - *Por qué no una columna normalizada:* es un dato duplicado que hay que mantener sincronizado; no se justifica para este volumen.
  - *Mejora futura:* índice trigram (GIN) sobre una función `unaccent` inmutable, para búsquedas rápidas con muchos datos.
- **404 real en el detalle:** un movimiento inexistente o ajeno ahora responde HTTP 404. Con un `loading.tsx` por encima, Next empieza a transmitir la página y el status queda fijo en 200 antes de saber si el movimiento existe. Los esqueletos de Home y lista se movieron a *route groups* (`(home)`, `(list)`) para que no envuelvan al detalle; las URLs no cambian. *Trade-off:* el detalle no muestra esqueleto mientras carga, pero es una sola consulta indexada.

**Limitación conocida:** el violeta de suscripción (`#C76DFF`) del diseño no llega al contraste AA en texto chico. Se respetó el diseño.

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
