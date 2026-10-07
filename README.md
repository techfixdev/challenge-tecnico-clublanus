# GranaBank

Home banking mobile-first para el challenge técnico del Club Atlético Lanús: login, saldo de tarjetas (que se puede ocultar), movimientos con búsqueda, filtros y resumen del mes, y detalle de cada movimiento, construido a partir del diseño de Figma.

| Login                                | Home                               | Saldo oculto                                              | Movimientos                                    | Detalle                                          |
| ------------------------------------ | ---------------------------------- | --------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| ![Login](docs/screenshots/login.png) | ![Home](docs/screenshots/home.png) | ![Saldo oculto](docs/screenshots/home-balance-hidden.png) | ![Movimientos](docs/screenshots/movements.png) | ![Detalle](docs/screenshots/movement-detail.png) |

Animaciones en video (390×844, build de producción): [`docs/screenshots/premium-demo.webm`](docs/screenshots/premium-demo.webm) — tarjeta con inclinación 3D, saldo tipo odómetro, header y barra de vidrio. Capturas: [Home](docs/screenshots/premium-home.png), [Home con scroll](docs/screenshots/premium-home-scrolled.png), [Movimientos con scroll](docs/screenshots/premium-movements-scrolled.png). Video anterior: [`motion-demo.webm`](docs/screenshots/motion-demo.webm).

## Demo

Deploy: _pendiente_

**Credenciales de prueba:** `soygranate@clublanus.com` / `GRANATE1@`

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) + **TypeScript** estricto
- **PostgreSQL 17** + **Prisma 7** (driver adapter `@prisma/adapter-pg`)
- **Tailwind CSS v4**, tipografía Poppins (UI) y Arvo (solo el logotipo "GranaBank"; ver [Marca](#marca-club-atlético-lanús))
- **Motion** (motion.dev, sucesor de Framer Motion) para resortes, valores ligados al scroll y animaciones de layout
- **zod** (validación en el servidor; `zod/mini` para la respuesta de "Cargar más"), **jose** (JWT), **bcryptjs**
- **Vitest** + Testing Library, **Playwright**, GitHub Actions

## Cómo correrlo

Requisitos: **Node 22+**, **pnpm**, **Docker**.

```bash
pnpm install              # también genera el cliente de Prisma
cp .env.example .env      # en producción, generar SESSION_SECRET con: openssl rand -base64 32
pnpm db:up                # PostgreSQL en Docker (puerto 5432)
pnpm db:migrate           # aplica las migraciones
pnpm db:seed              # 2 usuarios demo, tarjetas, 28 movimientos y 1 transferencia (idempotente)
pnpm dev                  # http://localhost:3000
```

Puertos: app `3000`, PostgreSQL `5432`, servidor de los tests e2e `3100`.

**Probarlo desde el celular (misma Wi‑Fi):** Next bloquea en dev los assets pedidos desde otro host, así que hay que habilitar la IP de la máquina con `ALLOWED_DEV_ORIGINS` (lista separada por comas; solo aplica a `next dev`):

```bash
ALLOWED_DEV_ORIGINS=192.168.1.10 pnpm dev -H 0.0.0.0   # luego abrir http://192.168.1.10:3000
```

Si hay firewall, abrir el puerto 3000 solo para la red local. Con `next start` a secas no sirve por `http://`: en producción la cookie de sesión es `Secure` y el navegador la descarta fuera de HTTPS (salvo en `localhost`). Para eso está el preview de abajo.

**Probar el build de producción en el celular:** el modo dev no muestra la velocidad real. `pnpm preview:lan` hace el build y lo sirve en `0.0.0.0:3001` con `GRANABANK_LAN_PREVIEW=1`, que deja la cookie de sesión **sin `Secure`** solo para esta prueba local. Usa la base de `DATABASE_URL` (`.env`, la de desarrollo), así se ven los mismos datos que en `pnpm dev`. Puede correr junto a `pnpm dev` en el 3000 (dev usa `.next/dev` y el build no lo toca).

```bash
sudo ufw allow from 192.168.100.0/24 to any port 3001 proto tcp   # una vez, si hay ufw
pnpm preview:lan                                                  # luego abrir http://<IP-de-la-máquina>:3001
```

Barandas: la variable solo se acepta con el valor `1`; con `VERCEL`/`VERCEL_ENV` presentes el build y el arranque fallan (nunca puede llegar a un deploy) y fuera de producción se ignora; al activarse imprime un aviso. Correr `pnpm build` (por ejemplo, para los e2e) mientras el preview está levantado reemplaza su build: conviene reiniciarlo.

### Variables de entorno

| Variable                | Obligatoria | Para qué                                                                                                  |
| ----------------------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | Sí          | PostgreSQL de la app                                                                                      |
| `SESSION_SECRET`        | Sí          | Firma de la sesión (JWT); al menos 32 caracteres (`openssl rand -base64 32`)                              |
| `DEMO_CVV_SECRET`       | No          | Secreto para derivar el CVV de demo de cada tarjeta; si no está, se usa `SESSION_SECRET`                  |
| `TEST_DATABASE_URL`     | No          | Base de los tests de integración y e2e; por defecto, `DATABASE_URL` con `_test` (ver [Testing](#testing)) |
| `ALLOWED_DEV_ORIGINS`   | No          | Hosts extra (separados por coma) que pueden cargar los assets de `next dev`, p. ej. la IP de la LAN       |
| `GRANABANK_LAN_PREVIEW` | No          | `1` solo para el preview local del build en el celular (`pnpm preview:lan`); nunca en un deploy           |

## Scripts

| Script                               | Qué hace                                                   |
| ------------------------------------ | ---------------------------------------------------------- |
| `pnpm dev` / `build` / `start`       | Servidor de desarrollo, build de producción y servidor     |
| `pnpm preview:lan`                   | Build + `next start` en `0.0.0.0:3001` para el celular     |
| `pnpm lint` / `typecheck` / `format` | ESLint, `tsc --noEmit` (con tipos de rutas), Prettier      |
| `pnpm format:check`                  | Verifica el formato sin modificar archivos                 |
| `pnpm test` / `test:watch`           | Tests unitarios y de componentes (sin base de datos)       |
| `pnpm test:integration`              | Tests de integración contra PostgreSQL                     |
| `pnpm test:e2e`                      | Tests end-to-end con Playwright                            |
| `pnpm db:up`                         | Levanta PostgreSQL con Docker Compose                      |
| `pnpm db:migrate` / `db:deploy`      | `prisma migrate dev` / `prisma migrate deploy`             |
| `pnpm db:seed` / `db:reset`          | Carga los datos demo / resetea la base y vuelve a cargar   |
| `pnpm db:test [comando]`             | Prepara la base de tests y, opcional, corre un comando ahí |

## Estructura del proyecto

Organizada por funcionalidad ("screaming architecture"): las carpetas dicen qué hace la app, no qué framework usa.

```
src/
├── app/                 rutas delgadas: conectan features (páginas, error boundaries, API REST)
├── features/
│   ├── auth/            domain/ data/ server/ ui/
│   ├── movements/       domain/ data/ ui/
│   ├── account/         domain/ data/ server/ ui/
│   └── transfers/       domain/ data/ server/   (UI en camino)
├── shared/              lib/ (db, errores de API, fechas, formato, dinero exacto) · ui/ (Button, BottomNav…)
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

- **App Router + Server Components.** Las páginas leen la base en el servidor: no hay credenciales ni consultas en el navegador y se envía menos JavaScript. Client Components solo para formularios, búsqueda, "Cargar más" y el saldo (contador y ocultar).
- **API routes en lugar de un backend separado.** La consigna lo permite: un proyecto, un deploy, tipos compartidos. Las rutas REST reutilizan los mismos casos de uso que las páginas.
- **Prisma + PostgreSQL.** Tipos generados desde el schema y migraciones versionadas. Para la búsqueda se usa SQL parametrizado (`Prisma.sql`), probado contra una base real.
- **Montos `Decimal(12,2)`**, que viajan como string (`"125.00"`): un `float` acumula errores de redondeo.
- **Dos monedas, sin conversión.** La Mastercard opera en dólares (`USD`) y la Visa en pesos (`ARS`); cada movimiento está en la moneda de su tarjeta. Nunca se convierte ni se suman pesos con dólares.
- **Formato argentino para las dos monedas** (desvío deliberado del Figma, que muestra "978.85"): `$ 312.400,50` (pesos) y `US$ 978,85` (dólares), con punto de miles y coma decimal, como los muestran los bancos argentinos. Con pesos y dólares en la misma pantalla, un solo formato y símbolos distintos evitan leer el `$` de los pesos como dólares. Los montos redondos siguen sin ",00" (`US$ 125`), como en la lista del diseño. Todo pasa por **un solo formateador** (`formatMoney(monto, moneda)` en `src/shared/lib/format.ts`), que arma el texto desde centavos exactos (no `Intl` sobre un `float`), así servidor y navegador escriben lo mismo. Los lectores de pantalla escuchan la moneda en palabras ("978,85 dólares", "más 95 dólares"). El chip de cada tarjeta muestra su moneda (`USD` / `ARS`).
- **Sesión: JWT en cookie `httpOnly`**, `sameSite=lax` y `secure` en producción. `proxy.ts` hace un chequeo rápido del token y `requireUser()` vuelve a verificar al usuario en la base en cada lectura (defensa en profundidad).
- **Un schema zod por formulario/parámetro en el servidor** (la validación real). El feedback inmediato del navegador corre las mismas reglas como funciones puras (`*-rules.ts`), sin zod: el schema delega en ellas o las comparte, y un test compara ambos veredictos caso por caso. Así zod (~89 KB gzip) no viaja al navegador; "Cargar más" valida la respuesta con `zod/mini` (~16 KB), incluido en la página de movimientos: cargarlo bajo demanda ahorraba poco y agregaba dos fallas (una descarga colgada o un archivo borrado por un deploy dejaban el botón sin funcionar).
- **Precarga completa de las pantallas probables** (`prefetch` en Enviar/Recibir, "Ver todos" y Movimientos de la barra): abren listas, sin pasar por su esqueleto. Cuesta un render en el servidor por destino cada vez que se precarga (la caché del router se limitó a 30 s con `staleTimes.static`, porque por defecto son 5 min y un ingreso enviado por otra persona tardaría eso en aparecer; una transferencia propia la invalida al instante).
- **Filtros en la URL** (`?q=&type=`): se pueden compartir, sobreviven al recargar y funcionan con el botón atrás; el filtrado ocurre en la base. Búsqueda con debounce de 300 ms y `router.replace`.
- **Montos con signo por dirección** (desvío del Figma, que los muestra sin signo): lo que sale lleva `−` (U+2212, el signo menos tipográfico) y lo que entra `+`: `−US$ 125`, `+US$ 95`. Entra solo lo **recibido**; salen lo **enviado** y los **débitos automáticos**. El color del monto también sigue la dirección y no el tipo: granate (`received`) para lo que entra, tinta (`foreground`) para lo que sale; el color de cada tipo queda en su ícono. Los lectores de pantalla escuchan "más 95 dólares" / "menos 125 dólares" y el tipo ("Recibido", "Débito automático"). El detalle usa la misma convención.
- **Lista agrupada:** las filas comparten una sola superficie blanca con separadores finos que arrancan después del ícono (lista agrupada de iOS / Monzo), en lugar de una tarjeta con sombra por fila: entran más filas en pantalla y se leen como una lista. En Movimientos se agrupan **por día** con encabezados que quedan pegados debajo del buscador y los chips ("Hoy", "Ayer", "5 de octubre"; el año solo si no es el actual), con el día calendario de Buenos Aires. El servidor decide "hoy" una vez y lo pasa a la lista, así servidor y navegador nombran igual los días. "Cargar más" suma la página siguiente al mismo grupo si continúa un día. En Home los cinco últimos van en un solo grupo, sin encabezados: partidos en dos o tres días se leerían como fragmentos.
- **Paginación por cursor** (`occurredAt` + `id`): estable aunque entren movimientos nuevos y aprovecha el índice `(userId, occurredAt)`.
- **Protección IDOR.** Toda consulta filtra por el `userId` de la sesión; un id ajeno responde el mismo 404 que uno inexistente.
- **Búsqueda sin acentos** con la extensión `unaccent` ("jose" encuentra "José"), escapando `%` y `_`.
- **404 real en el detalle.** El detalle no tiene `loading.tsx`, así el status no queda fijo en 200 antes de saber si el movimiento existe.
- **Zona horaria de Buenos Aires** para mostrar fechas: Vercel corre en UTC y un pago de las 22 h aparecería al día siguiente.
- **Datos de la tarjeta bajo demanda (ocultos por defecto).** Cada tarjeta tiene su propio ojo y controla solo esa tarjeta. Oculta, muestra el saldo como `••••••`, el número como `•••• •••• •••• 1234` y el CVV como `•••`; al revelarla, el saldo rueda en el odómetro, aparece el número completo (4-4-4-4) y, en el reverso, el CVV.
  - **Nada sensible en la página inicial:** Home renderiza las tarjetas desde su "cara" (`CardFace`, sin saldo); ni el HTML ni el payload RSC traen saldo, número completo o CVV (un e2e lo verifica sobre el HTML). Recién al tocar el ojo el cliente pide `GET /api/account/cards/:id/details`, que reverifica la sesión, busca la tarjeta **por dueño** (una ajena responde 404, igual que una inexistente) y responde con `Cache-Control: no-store`. Una request por revelado, sin polling ni reintentos automáticos: fácil de limitar por usuario delante (ver mejoras).
  - **Se vuelven a ocultar solos** a los 30 segundos, al ocultarse la pestaña (`visibilitychange`) o al salir de la página; ocultar también borra los datos de la memoria del componente.
  - **Decisión: la preferencia ya no se recuerda.** Antes el ojo era uno solo (en la principal) y su elección vivía en una cookie. Ahora todo arranca oculto en cada visita, como pidió el usuario: recordar "visible" obligaría a mandar el saldo en el HTML inicial, justo lo que se quería evitar. El costo es una request (~decenas de ms) antes de que ruede el saldo.
  - **Números ficticios:** cada tarjeta demo guarda un PAN de 16 dígitos inventado, válido por Luhn y consistente con sus últimos 4 (`buildDemoPan`, determinístico por usuario: el seed es idempotente). Un `CHECK` en la base exige 16 dígitos que terminen en `last4`. En un sistema real el PAN va cifrado o tokenizado (PCI DSS, req. 3).
  - **El CVV no se guarda:** PCI DSS prohíbe almacenarlo después de autorizar. Para la demo se **deriva** en el servidor, solo para mostrarlo: HMAC-SHA256 del id de la tarjeta con un secreto del servidor (`DEMO_CVV_SECRET`, o `SESSION_SECRET` si no está), reducido a 3 dígitos. Es estable por tarjeta y no está en la base.
- **Vuelta de tarjeta:** tocar la tarjeta la da vuelta (ver "Movimiento y accesibilidad"); el reverso tiene banda magnética, panel de firma con el titular, CVV y la marca.
- **Resumen del mes en Movimientos:** "Octubre · Ingresos +US$ X · Egresos −US$ Y", **una línea por moneda** (dólares primero, la de la tarjeta principal; después pesos): nunca suma monedas distintas. Ingresos = recibidos; egresos = enviados + débitos automáticos; solo movimientos **completados** (un pendiente todavía puede fallar). Mes calendario de Buenos Aires (empieza a las 03:00 UTC). No depende de la búsqueda ni del filtro: describe el mes. La base suma los `Decimal` (`groupBy`) y la app solo los combina como centavos enteros, nunca como `float`.
- **Transferencias entre usuarios** (`src/features/transfers`): por alias o CVU (el CVU se valida con sus dígitos verificadores, como un CBU). Todo ocurre en **una sola transacción**: se reclama la clave de idempotencia, se debita, se acredita en la tarjeta del destinatario **en la misma moneda** que la de origen (la principal si hay varias; sin conversión) y se crean los dos movimientos (`SENT` y `RECEIVED`, enlazados a un `Transfer`); si algo falla, no queda nada a medias.
  - **Sin sobregiro con concurrencia:** el débito es un `UPDATE` condicional (`WHERE balance >= monto`). PostgreSQL bloquea la fila y reevalúa la condición con el saldo ya confirmado, así que de N transferencias simultáneas solo pasan las que alcanzan. Se eligió esto en lugar de `SERIALIZABLE`, que obligaría a reintentar ante cada conflicto sin dar más garantías para una invariante de una sola fila. Un `CHECK (balance >= 0)` en la base es la red de seguridad. Las dos tarjetas se actualizan siempre en el mismo orden (por id) para que A→B y B→A simultáneas no se bloqueen entre sí.
  - **Idempotencia:** el cliente manda un UUID por intento (`idempotencyKey`, único por emisor). Un reintento o doble toque con la misma clave devuelve la transferencia original (200, `replayed: true`) sin mover plata dos veces, incluso si las dos requests llegan a la vez; la misma clave con otros datos responde 409.
  - **Referencia legible:** cada transferencia recibe un código corto al azar en base32 de Crockford (`7Q4K-92XA`: 40 bits, sin `I`, `L` ni `O`, que se confunden con `1` y `0`, y sin `U`, para no formar palabras ofensivas por accidente). Los dos movimientos lo comparten con el lado como prefijo (`ENV-7Q4K-92XA` para quien envía, `REC-7Q4K-92XA` para quien recibe): cada referencia sigue siendo única en la base (índice único) y las dos personas citan el mismo código. Si un código ya existe, la transacción se repite con otro.
  - **Moneda:** pesos desde la Visa llegan a una tarjeta en pesos del destinatario (el seed le da una a `hincha`); si no tiene ninguna en esa moneda, se rechaza con `CURRENCY_MISMATCH` ("La cuenta de destino no opera en la moneda de esta tarjeta") y el usuario vuelve al paso del monto para elegir otra tarjeta.
  - **Monto:** el campo muestra el símbolo de la tarjeta elegida y acepta el formato argentino. Reglas de lo que escribe una persona (`parseAmount` en `src/shared/lib/money.ts`): una sola coma es el separador decimal (`12,30`, `1.234,56`); sin coma, los puntos seguidos de 3 dígitos agrupan miles (`1.234` = 1234) y un punto seguido de 1 o 2 dígitos es el decimal (`12.30`); lo ambiguo se rechaza (`1,234`, `1.2345`, `0.123`). Hasta 2 decimales y 10 dígitos enteros.
  - **Al tipear:** el campo agrupa los miles mientras se escribe (`12.500,5`) sin que salte el cursor, con teclado decimal (`inputMode="decimal"`). Solo cambia cómo se ve: lo que muestra se lee con las mismas reglas de arriba y da el mismo monto (`editAmount` en `src/features/transfers/domain/amount-editing.ts`). Un punto tipeado después de los dígitos queda abierto hasta que los dígitos siguientes deciden (2 → decimal, 3 → miles); después de miles, es la coma decimal.
  - **Tarea enfocada:** dentro de `/transferir` (pasos y comprobante) no hay barra inferior, y el botón principal de cada paso queda fijo abajo, siempre visible, con el margen del área segura y por encima del teclado (`visualViewport`). Deshabilitado se ve gris plano, no granate desvaído. La transferencia sale por defecto de la cuenta en **pesos** (la de todos los días), aunque la principal de Home sea la de dólares.
  - **Frontera humano / máquina:** esas reglas viven solo del lado del formulario. El formulario (y la Server Action, por ser un endpoint público) convierte lo escrito al **monto canónico** (`1.234,56` → `"1234.56"`) antes de llegar al dominio; el dominio, el schema del servidor y la API REST solo aceptan montos canónicos (`parseCanonicalAmount`), donde un punto es siempre el decimal. Así un cliente de la API que manda `"12.500"` queriendo decir 12,5 recibe un 400, en vez de mover 12.500. Los límites y los mensajes son los mismos en los dos lados (`checkAmountLimits` en `transfer-rules.ts`).
  - **Tope por transferencia, por moneda:** US$ 100.000 y $ 100.000.000 (del mismo orden una vez convertidos). El servidor valida el tope más alto antes de leer la tarjeta y el de su moneda dentro de la transacción (`AMOUNT_OVER_LIMIT`); el formulario ya conoce la tarjeta y avisa al tipear.
  - Los rechazos de negocio (saldo insuficiente, destinatario inexistente, a uno mismo, otra moneda, tope) son valores de una unión discriminada, no excepciones, y responden 404/422 con mensaje en español.
- **Errores de API clasificados:** base caída → 503 (reintentable); bug → 500 genérico con log; `redirect()`/`notFound()` de Next se dejan pasar.

El razonamiento completo, tarea por tarea, está en [`docs/BITACORA.md`](docs/BITACORA.md).

## API

Todas las respuestas son JSON. Éxito: `{ "data": … }`. Error: `{ "error": { "code", "message", "details"? } }`, donde `code` es estable (`INVALID_INPUT`, `UNAUTHORIZED`, `NOT_FOUND`, `SERVICE_UNAVAILABLE`, …) y `details` trae los errores por campo.

| Método | Ruta                             | Auth   | Parámetros                                                                                                     | Respuestas                                                                                                                                                                                                        |
| ------ | -------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/auth/login`                | —      | JSON `{ email, password, remember? }`                                                                          | 200 `{ data: { userId } }` + cookie · 400 · 401 · 415 (no es JSON) · 500 · 503                                                                                                                                    |
| POST   | `/api/auth/logout`               | Cookie | — (rechaza otro `Origin`)                                                                                      | 204 · 403                                                                                                                                                                                                         |
| GET    | `/api/movements`                 | Cookie | `q` (≤ 50), `type` (`debito`, `recibido`, `enviado`), `cursor`                                                 | 200 `{ data: Movement[], total, nextCursor }` · 400 · 401 · 503                                                                                                                                                   |
| GET    | `/api/movements/:id`             | Cookie | —                                                                                                              | 200 `{ data: Movement }` · 401 · 404 (inexistente, mal formado o ajeno) · 503                                                                                                                                     |
| GET    | `/api/movements/summary`         | Cookie | `month` (`AAAA-MM`, por defecto el mes actual en Buenos Aires)                                                 | 200 `{ data: { month, totals: [{ currency, income, expenses }] } }` (una entrada por moneda) · 400 · 401 · 503                                                                                                    |
| GET    | `/api/account/cards`             | Cookie | —                                                                                                              | 200 `{ data: Card[] }` (principal primero) · 401 · 503                                                                                                                                                            |
| GET    | `/api/account/cards/:id/details` | Cookie | — (`Cache-Control: no-store`)                                                                                  | 200 `{ data: { id, number, cvv, balance, currency } }` · 401 · 404 (`CARD_NOT_FOUND`: inexistente o ajena) · 503                                                                                                  |
| GET    | `/api/account/receive`           | Cookie | —                                                                                                              | 200 `{ data: { holderName, alias, cvu, cvuFormatted } }` · 401 · 404 · 503                                                                                                                                        |
| GET    | `/api/transfers/recipient`       | Cookie | `q` (alias o CVU)                                                                                              | 200 `{ data: { fullName, alias, cvuMasked } }` · 400 · 401 · 404 · 422 (a uno mismo) · 503                                                                                                                        |
| POST   | `/api/transfers`                 | Cookie | JSON `{ recipient, amount, description?, cardId?, idempotencyKey }`, `amount` canónico (rechaza otro `Origin`) | 201 `{ data: Transfer }` con el saldo nuevo · 200 (reintento, `replayed: true`) · 400 · 401 · 403 · 404 · 409 · 415 · 422 (`INSUFFICIENT_FUNDS`, `SELF_TRANSFER`, `CURRENCY_MISMATCH`, `AMOUNT_OVER_LIMIT`) · 503 |

```bash
curl -i -c cookies.txt -H 'content-type: application/json' \
  -d '{"email":"soygranate@clublanus.com","password":"GRANATE1@"}' \
  http://localhost:3000/api/auth/login
curl -b cookies.txt 'http://localhost:3000/api/movements?q=jose&type=recibido'
curl -b cookies.txt -H 'content-type: application/json' \
  -d "{\"recipient\":\"hincha.granate\",\"amount\":\"10.50\",\"idempotencyKey\":\"$(uuidgen)\"}" \
  http://localhost:3000/api/transfers
```

`amount` va en **formato canónico**: un número JSON (`10.5`) o un string con dígitos y, opcionalmente, un punto decimal con 1 o 2 decimales (`"10.50"`, `"12500"`; regex `^\d{1,10}(\.\d{1,2})?$`). Sin separador de miles, sin coma, sin espacios ni signo: `"12.500"`, `"10.555"` o `"1.234,56"` responden 400 `INVALID_INPUT` ("Ingresá un monto válido, con hasta 2 decimales") y no mueven dinero. El formato argentino es solo para el formulario. Para enviar pesos, `cardId` es el id de la Visa (`GET /api/account/cards`).

Hay un segundo usuario demo para probar transferencias en los dos sentidos: `hincha@clublanus.com` / `GRANATE2@` (alias `hincha.granate`), con una tarjeta en dólares (principal) y otra en pesos. El alias del usuario principal es `soy.granate.lanus`. El seed incluye una transferencia vieja entre los dos (`ENV-SEED-0001`), así "Recientes" ya muestra a quién enviar.

## Testing

| Tipo        | Comando                 | Qué cubre                                                                                                                                                                                                                                                                                                                                                                     | Cantidad |
| ----------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Unitarios   | `pnpm test`             | Dominio (validación, cursor, filtros, login, resumen mensual y límites del mes, transferencias: alias/CVU, montos exactos, reglas e idempotencia), rutas REST con repositorios en memoria, componentes desde lo que ve el usuario (odómetro del saldo, ocultar saldo, carrusel, header, navegación)                                                                           | 562      |
| Integración | `pnpm test:integration` | SQL real: transferencias (atomicidad, sin sobregiro con N transferencias en paralelo, idempotencia, sin deadlock A↔B); búsqueda sin acentos, escape de `%`/`_`, filtro por tipo, aislamiento por usuario, paginación completa y desempates; errores reales de la base (credenciales, base inexistente, sin conexión); sumas del resumen mensual y bordes del mes              | 45       |
| End-to-end  | `pnpm test:e2e`         | Login/logout, cookie y "Recordarme", búsqueda, filtros, "Cargar más", detalle, 404, estados vacíos, ocultar saldo, resumen del mes, animaciones, navegación tipo iOS (push, pop, pestañas, cromo fijo, intro) y CLS < 0.05 en Home (con y sin movimiento reducido), transferencias y ninguna pantalla con scroll lateral ni texto cortado de 180 a 1024 px, en Chromium móvil | 70       |

**Base de datos de los tests.** Integración y e2e corren contra su propia base, `granabank_test`, en el mismo PostgreSQL: así una transferencia de un test nunca mueve los saldos demo con los que alguien está probando la app a mano. Solo hace falta `pnpm db:up`; cada corrida crea la base si no existe y aplica las migraciones (`scripts/test-database.ts`).

| Comando                              | Base             | Qué prepara                                                                                                                    |
| ------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm dev` / `start`, `pnpm db:seed` | `granabank`      | La de `DATABASE_URL` (`.env`): la de uso manual. `db:seed` y `db:reset` apuntan a esta                                         |
| `pnpm test:integration`              | `granabank_test` | Crea y migra (sin seed: cada test crea y borra sus datos)                                                                      |
| `pnpm test:e2e`                      | `granabank_test` | Crea, migra y carga el seed en cada corrida (`globalSetup`); el servidor de Next y los fixtures que leen la base usan esa URL  |
| `pnpm db:test [comando]`             | `granabank_test` | Crea, migra y carga el seed; con un comando, lo corre apuntando ahí (p. ej. `pnpm db:test next start -p 3200` para mediciones) |

La URL de prueba es `TEST_DATABASE_URL` si está definida y, si no, `DATABASE_URL` con `_test` agregado al nombre de la base; por seguridad, el nombre tiene que terminar en `_test`. Next no pisa una variable que ya está en el entorno con la de `.env`, así que el servidor de los e2e (`pnpm start`/`pnpm dev` lanzado por Playwright con `DATABASE_URL` de prueba) no toca la base de desarrollo. Playwright nunca reutiliza un servidor que ya escucha en el puerto (no sabría a qué base apunta): si está ocupado, falla. Como Next no permite un segundo `next dev` en la misma carpeta, localmente los e2e se corren sobre el build: `pnpm build && CI=1 E2E_PORT=3110 pnpm test:e2e`. La lógica se escribió mayormente con TDD (test que falla → código → refactor). CI (`.github/workflows/ci.yml`) corre lint, tipos, formato y unitarios, y en otro job, con un PostgreSQL de servicio: migraciones, seed, integración, build y e2e contra el build de producción.

## Marca (Club Atlético Lanús)

El Figma usaba un granate aproximado (`#7A1D2D`) y un logo genérico. La app se normalizó al **Manual de Marca del Club Atlético Lanús** (PDF que no se versiona).

**Colores oficiales** (tokens en `src/app/globals.css`):

| Token               | Valor     | Referencia             | Uso                                                                                                      |
| ------------------- | --------- | ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `--color-primary`   | `#70192D` | Granate, Pantone 188 C | Botones, tarjeta principal, montos recibidos, fondo del login                                            |
| `--color-gold`      | `#B4982F` | Oro, Pantone 618 C     | Chip de moneda (USD/ARS), casilla "Recordarme" y foco sobre granate                                      |
| `--color-cool-gray` | `#9A999D` | Cool Gray 7C           | Base de los grises: `--color-border` (20 % sobre blanco) y `--color-muted` (mismo tono, oscurecido a AA) |

La app usa **solo** esos tres colores y tintes o sombras de ellos (un test, `src/app/brand-palette.test.ts`, lista cada token con su valor y falla si aparece un tono fuera del granate, el oro o el gris neutro). El violeta, el naranja, el verde, el ámbar y los grises azulados del Figma se reemplazaron por roles de marca:

| Rol                          | Antes (Figma)                     | Ahora                                          | Contraste                              |
| ---------------------------- | --------------------------------- | ---------------------------------------------- | -------------------------------------- |
| Suscripción                  | violeta `#C76DFF` sobre `#F3E3FF` | oro oscurecido `#6F5C14` sobre `#ECE5CB`       | 5,2:1 (azulejo), 6,5:1 (blanco)        |
| Recibido                     | granate sobre `#DBC6CA`           | sin cambios                                    | 6,9:1 (azulejo), 11,3:1 (blanco)       |
| Enviado                      | naranja `#EF9C55` sobre `#FDEBDB` | Cool Gray oscurecido `#5E5D61` sobre `#E6E6E7` | 5,2:1 (azulejo), 6,5:1 (blanco)        |
| Completado (y "Copiado")     | verde `#1D7A50` sobre `#E2F4EA`   | granate sobre `#DBC6CA`                        | 6,9:1                                  |
| Pendiente                    | ámbar `#9A5B00` sobre `#FFF0D4`   | oro oscurecido `#6F5C14` sobre `#FAE7B3`       | 5,3:1                                  |
| Texto principal              | azul noche `#1E2235`              | casi negro neutro `#1B1A1D` (tono Cool Gray)   | 17,3:1 (blanco)                        |
| Fondo de página              | gris azulado `#F9FAFC`            | blanco roto neutro `#F9F9FA` (tono Cool Gray)  | `muted` sobre él: 4,6:1                |
| Error (excepción, ver abajo) | rojo `#C0362C` sobre `#FDECEA`    | rojo granatizado `#B32D32` sobre `#F7EAEB`     | 5,4:1 (fondo de error), 6,3:1 (blanco) |

Los azulejos claros siguen la misma receta que `primary-soft`: 25 % del color oficial sobre blanco. Los tres tipos de movimiento siguen distinguiéndose por color (oro, gris, granate) y por ícono (flechas cruzadas, arriba, abajo). El papel de la firma del reverso de la tarjeta pasó a un crema sobre el tono del oro.

**Excepción de accesibilidad: el rojo de error.** El manual no tiene rojo, pero los errores siguen en rojo: es el color que todo el mundo lee como "error", y el granate ya significa marca y dinero recibido, así que un error granate se confundiría con un monto. Para que conviva con la marca, el rojo se corrió hacia el tono del granate (24° en OKLCH; el granate está en 12°), pero es mucho más claro y saturado que él (contraste 1,8:1 entre ambos), así que no se confunden. Sobre el login granate, los errores usan `#FFB4AB` (7,1:1).

Todo lo demás deriva de esos valores: `primary-soft` (25 % de granate sobre blanco), `primary-dark` y `primary-deep` (mismo tono, más oscuros: sombras teñidas y la base del login), el oro satinado de la tarjeta Visa (`card-gold`, mismo tono que el oro oficial, más claro para que la marca azul de Visa se lea a 7,1:1 o más) y los brillos del chip dorado (el mismo oro iluminado; el oro oficial es su sombra). Las sombras y degradés usan `color-mix()` sobre esos tokens, sin colores sueltos. Únicos colores literales que quedan: los de Mastercard y Visa (marcas de terceros) y `APP_BACKGROUND_COLOR`, el espejo del fondo para el navegador (un test lo compara con el CSS).

**Contrastes medidos** (WCAG 2.x; en el login, sobre los colores reales del fondo tomados de capturas): texto blanco sobre granate 11,3:1; granate sobre blanco 11,3:1 y sobre el fondo 10,7:1; `muted` 4,6:1 (fondo) y 4,9:1 (blanco); tinta del chip sobre el oro oficial 5,2:1 (su punto más oscuro). Login: etiquetas 12,1:1, eslogan (blanco 80 %) 7,0:1 en su zona más clara, texto escrito 10,3:1, _placeholder_ (blanco 70 %) 5,9:1, borde de los campos (blanco 50 %) 4,1:1 contra el fondo y 3,8:1 contra el campo, errores (`#FFB4AB`) 7,1:1, anillo de foco dorado 9,9:1, borde de la casilla 5,9:1, botón "Ingresar" (granate sobre blanco) 11,3:1.

**El escudo** (`public/brand/`) se extrajo como vector del propio PDF (`pdftocairo -svg`), sin redibujarlo: mismos trazados, sin transformaciones, solo recortado (`viewBox` ajustado al escudo) y con los colores escritos en hexadecimal (`rgb(112, 25, 45)` = `#70192D`). Se verificó renderizando cada SVG junto a la página del PDF: la diferencia es solo el antialias de los bordes.

- `escudo.svg` (pág. 2): granate con iniciales blancas, para fondos claros; también es el favicon, el ícono de iOS y el de la intro de la app.
- `escudo-estrellas-doradas.svg` y `escudo-estrellas-blancas.svg` (pág. 6): con estrellas, para fondos granate. El login usa el de estrellas doradas. Las estrellas del PDF son `#B4923A` (la conversión del Pantone que hace el propio PDF); se dejaron así porque el escudo no se recolorea.

Reglas del manual que se respetan: nunca se cambian los colores ni la cantidad de círculos, las iniciales "C.A.L." quedan blancas sobre granate, el escudo nunca se estira ni se deforma (tamaños con su proporción), y sobre granate se usa la versión con contorno blanco. La profundidad del escudo en el login es solo CSS por fuera del vector: sombras en capas teñidas de granate (la luz viene de arriba a la izquierda, como en toda la app) y un brillo especular recortado con la silueta del propio escudo.

**Tipografía:** el manual usa Geometric Slabserif 712, una fuente comercial que no se puede distribuir con la app. Se eligió **Arvo** (Google Fonts, licencia OFL), una slab serif geométrica muy cercana, cargada con `next/font` solo en la ruta del login y solo para el logotipo "GranaBank" (no hay otros títulos grandes). La UI sigue en Poppins, como el Figma.

**Propiedad:** el escudo, sus colores y el manual son propiedad del Club Atlético Lanús. Se usan únicamente para este challenge técnico, hecho para el club.

## Accesibilidad y UX

- Navegable con teclado; foco visible; labels, `aria-invalid` y foco en el primer error del formulario.
- Regiones `role="status"` para resultados y carga; errores con `role="alert"`.
- Estados de carga (esqueletos), error con "Reintentar" y dos estados vacíos (sin movimientos / sin resultados).
- Mobile-first; en desktop, columna centrada como un teléfono.
- En el celular: inputs de 16px (iOS no hace zoom al enfocarlos), zoom del usuario habilitado, márgenes para el notch y la barra inferior (`viewport-fit=cover` + `env(safe-area-inset-*)`), ícono propio (el escudo) y color de la barra del navegador (granate en el login, el fondo claro en el resto).
- **Texto secundario más oscuro que el diseño (desvío justificado por accesibilidad):** el gris `#8A8D9B` del Figma da 3,3:1 sobre blanco y 3,2:1 sobre el fondo del diseño (`#F9FAFC`), debajo del mínimo AA (4,5:1) para texto chico. `--color-muted` es `#727174`: el tono del Cool Gray 7C del manual de marca, oscurecido hasta el gris más claro que llega a AA (4,6:1 sobre el fondo de página y el degradé de las superficies, 4,9:1 sobre blanco). Los _placeholders_ usan el mismo token (y nunca son la única etiqueta: cada campo tiene su `label`); los botones deshabilitados bajan a 70 % de opacidad, y WCAG no exige contraste en controles inactivos.

## Movimiento y accesibilidad

La sensación "premium" sale de física, profundidad y continuidad, no de cambiar el diseño: se respetan el layout, los colores y la tipografía del Figma. Las interacciones físicas usan **Motion** (`motion/react`); las transiciones simples siguen en CSS. Todo sale de un único lenguaje de movimiento: **tres duraciones** (rápida 160 ms, base 280 ms, navegación 400 ms), **una curva** (la de iOS, `cubic-bezier(0.32, 0.72, 0, 1)`) y **un resorte críticamente amortiguado** (sin rebote) para lo que mueve el dedo; están en `globals.css` (`--motion-*`) y en `shared/ui/motion/tokens.ts` / `springs.ts`, y un test los mantiene sincronizados. Solo se animan `transform` y `opacity` (nunca `blur`), y lo que sigue al dedo o al scroll corre sobre _motion values_ (ningún `setState` por cuadro).

- **Tarjeta viva (Home):** al presionarla y arrastrar se inclina en 3D hacia el dedo (hasta 10°/12°, perspectiva 800px) y vuelve sin rebote al soltar (solo se inclina mientras se presiona). Un brillo tenue se mueve con la inclinación y la sombra se desplaza al revés. La superficie tiene un degradé sutil para leerse como material (el granate oficial `#70192D` y el oro satinado de Visa, derivado del oro oficial: las dos tarjetas son los dos colores del club).
- **Carrusel:** el scroll sigue siendo nativo (scroll-snap: inercia, teclado, lectores de pantalla). Motion solo lee la posición del scroll y, cuadro a cuadro, achica (0,92) y atenúa la tarjeta no activa. Los puntos debajo son botones ("Tarjeta 1 de 2") que llevan a cada tarjeta; el activo se estira con el resorte, sin pasarse.
- **Saldo tipo odómetro:** cada dígito es una tira 0–9 que rueda con resorte, de derecha a izquierda (40 ms entre dígitos), con celdas fijas: el ancho no cambia mientras rueda. Al revelar la tarjeta los dígitos aparecen y ruedan desde 0; al ocultarla se desvanecen y vuelven los puntos (160 ms, sin desenfoque). Oculto, el HTML solo tiene la máscara: ni los dígitos ni el ancho delatan el monto. Los lectores de pantalla escuchan solo el valor final.
- **Vuelta de tarjeta:** un toque la gira en 3D (`rotateY` con el resorte, sin rebote; se achica un poco a mitad de giro para no salirse del carrusel) y otro la devuelve. La tarjeta entera es un botón de alternancia ("Ver reverso de la tarjeta Visa terminada en 5678", `aria-pressed`) que queda **debajo** de las caras: las caras dejan pasar el toque, salvo sus propios controles (los ojos). La cara que no se ve queda `inert` y `aria-hidden`. **Toque vs. deslizamiento:** solo gira un toque real (menos de 10 px de recorrido, menos de 500 ms, sin que el carrusel se haya movido y sin `pointercancel`); deslizar el carrusel, arrastrar para inclinar o mantener presionado no la giran. Enter y Espacio siempre la giran. En reposo, el frente se ve igual que antes de agregar la vuelta (comparado píxel a píxel).
- **Header de vidrio:** en Home y Movimientos el header queda fijo y se compacta con el scroll ("Hola" se desvanece, el título baja a 85%) y se vuelve vidrio esmerilado (`backdrop-filter: blur(16px) saturate(180%)`), con fondo casi opaco donde el navegador no lo soporta (`@supports`). No cambia de alto: se pega con un `top` negativo, así nada se mueve debajo (CLS 0). En Movimientos, el buscador y los chips quedan pegados debajo: son los controles de una lista larga, mientras que el resumen del mes (contexto) se va con el scroll.
- **Barra inferior:** también de vidrio. La sección actual tiene una píldora granate suave que viaja entre íconos con el resorte, sin pasarse (un único elemento compartido con `layoutId`), y los íconos se achican al tocarlos.
- **Navegación tipo iOS** (React `<ViewTransition>` + `transitionTypes` de Next, en `shared/ui/motion`): cada pantalla es una unidad (`ScreenTransition`) que se mueve según el tipo del link.
  - **Push** (`nav-forward`: fila → detalle, "Ver todos", buscar): la pantalla nueva entra desde la derecha **sobre** la anterior, que se corre ~28 % a la izquierda y se oscurece un poco. **Pop** (`nav-back`, el "Volver" de la app): al revés. 400 ms con la curva de iOS `cubic-bezier(0.32, 0.72, 0, 1)`.
  - **Pestañas** (Inicio ↔ Movimientos en la barra): cambio instantáneo, como una tab bar nativa (sin fundido, escalado ni deslizamiento).
  - **Cromo fijo:** la barra inferior y el header no se mueven (tienen su propio `view-transition-name` sin animación); si las dos pantallas tienen header, solo se funde su contenido. Un toque sobre ellos durante la transición igual llega a su botón (el navegador no hace hit-testing de elementos con nombre mientras animan).
  - **Composición:** el ícono del movimiento tocado se transforma en el del detalle sobre el push y vuelve a su fila con el pop; entre secciones y al filtrar, los íconos no "vuelan". Enviar y Recibir siguen siendo una transformación de contenedor (las pantallas quedan quietas).
  - **Esqueleto → contenido:** el esqueleto se va con un fundido corto y el contenido aparece con un fundido + 4 px de subida. Solo después de hidratar: en la carga inicial el servidor muestra el contenido sin animar (animarlo retrasaba el LCP ~80 ms con CPU y red limitadas).
  - **Intro de marca:** en una carga en frío del área logueada (o al entrar) el escudo del club sube a su lugar (dibujado inline en el HTML, sin pedir la imagen) y se disuelve hacia la pantalla. Nunca demora el contenido: deja pasar los toques, se disuelve apenas hidrata y, solo con CSS, a más tardar a los 600 ms; no se repite en navegaciones internas ni con movimiento reducido. LCP igual que antes (medido con y sin la intro).
  - React guarda los `transitionTypes` en la raíz y se los lleva el próximo _commit_ de transición: si algo se commitea entre el toque y la navegación (una sección que termina de llegar por streaming), la navegación llega sin tipo. Por eso los links también "anuncian" su tipo (`MotionLink`) y las pantallas lo leen al commitear.
- **Lista → detalle:** las filas entran escalonadas (hasta 6) solo la primera vez que aparece una lista en la carga; después (filtros, búsqueda, "Cargar más") simplemente aparecen. Cuando llegan con una pantalla entera o un _reveal_, ya llegan quietas (la transición las mueve). Los esqueletos tienen brillo, como antes.
  - La vuelta solo se anima si la lista aparece en el mismo _commit_ que la navegación: "Volver" la precarga (`prefetch`), y Next precarga **solo en producción**. En `next dev` la lista pasa primero por su esqueleto y no hay morph (el e2e de la vuelta corre con `CI=1`, sobre `next start`).
  - Con el botón atrás del navegador no hay morph: React restaura esa entrada del historial en una _lane_ síncrona y no inicia ninguna view transition (limitación del framework; un test fija el comportamiento actual y se pone en rojo cuando el framework empiece a animarlo). No se intercepta el historial para forzarlo.
- **Peso:** Motion se carga con `LazyMotion` y componentes `m.*`: la página trae el núcleo, y el paquete de gestos y layout (`domMax`, ~24 kB gzip) llega en un chunk aparte después de hidratar.
- **`prefers-reduced-motion: reduce`:** push, pop, pestañas y reveals son instantáneos (duración y demora 0), sin intro de marca, sin inclinación, sin rodar el saldo (aparece final), sin escalado ligado al scroll, la vuelta de tarjeta es un fundido (sin rotación) y la píldora salta sin resorte; el vidrio y los fundidos de opacidad se mantienen. Hay tests e2e que lo verifican en ambos modos.

## Cómo ver los estados

Con la app corriendo e iniciada la sesión:

| Estado                      | Cómo verlo                                                                                                                                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sin resultados (búsqueda)   | En Movimientos, buscar `zzz`. Aparece "No encontramos movimientos para “zzz”" con "Limpiar filtros".                                                                                                                                                               |
| Sin resultados (con filtro) | Combinar búsqueda y filtro sin coincidencias, por ejemplo `/movimientos?q=adobe&type=recibido`.                                                                                                                                                                    |
| Sin movimientos             | Es el mensaje de una cuenta sin movimientos ("Todavía no tenés movimientos"). El usuario demo tiene 28, así que se prueba en `MovementsEmptyState.test.tsx`.                                                                                                       |
| Carga                       | DevTools → Network → throttling "Slow 4G". Desde Inicio, tocar Movimientos en la barra inferior: se ven los esqueletos. "Cargar más" muestra "Cargando…".                                                                                                          |
| Error                       | `docker stop granabank-db` y abrir Movimientos: aparece "No pudimos cargar tus movimientos" con "Reintentar". Después `docker start granabank-db` y tocar "Reintentar". Iniciar sesión antes de detener la base. ([captura](docs/screenshots/movements-error.png)) |
| No encontrado (404)         | Abrir `/movimientos/abc`.                                                                                                                                                                                                                                          |

## Qué mejoraría con más tiempo

- **Rate limiting del login y del revelado de tarjetas** (`/api/account/cards/:id/details`, por usuario) con Redis/Upstash o reglas del firewall de Vercel (un límite en memoria no sirve en serverless), más un registro de auditoría de cada revelado.
- **PAN cifrado o tokenizado** (y un proveedor que muestre los datos en un iframe propio) si las tarjetas fueran reales.
- **Sesiones revocables** (tabla de sesiones o lista de revocación) para cerrar sesión en todos los dispositivos.
- **Índice trigram** (GIN sobre `unaccent`) para que la búsqueda escale con muchos datos.
- **Monitoreo** con Sentry o similar, usando el `digest` de los errores.
- **Deploy previews** por PR y e2e contra el preview.
- Modo oscuro, i18n y soporte offline/PWA.

## Proceso de trabajo

Construido con asistencia de IA (Claude Code), bajo un protocolo propio: tareas chicas, tests primero, revisión de cada cambio antes de commitear y revisiones automáticas por enfoque (seguridad, resiliencia, legibilidad, confiabilidad). Cada decisión y su porqué quedó registrada en [`docs/BITACORA.md`](docs/BITACORA.md), y el historial usa commits chicos con Conventional Commits.
