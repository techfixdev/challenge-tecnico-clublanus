# Bitácora del challenge — GranaBank

Registro de las modificaciones del proyecto, tarea por tarea: qué se pidió, qué se decidió, qué se hizo, cómo se verificó y en qué commits quedó.

## Cómo leer esta bitácora

1. **Estado final** resume qué hace la app hoy y con cuántos tests cuenta.
2. El **índice** lista cada tarea con sus commits principales; el identificador (`T1`, `T12b-C`…) es el mismo del registro de tareas del proyecto.
3. **Decisiones del candidato** reúne las decisiones de producto tomadas explícitamente, con su fecha.
4. **Proceso y verificación** explica cómo se trabajó y qué se revisó (y qué no).
5. El **registro por tarea** está agrupado en cinco fases y, dentro de cada fase, en orden cronológico. Cada entrada sigue el mismo esquema: **Pedido · Decisión · Qué se hizo · Cómo se verificó · Commits**.
6. **Limitaciones conocidas** junta en un solo lugar las salvedades que siguen abiertas.

Los hashes citados son los del historial actual de la rama `feat/granabank` y todos existen en el repositorio. Los commits se pueden inspeccionar con `git show <hash>`.

## Estado final

- **Qué es:** GranaBank, billetera móvil del Club Atlético Lanús. Login con un usuario demo, Home con dos tarjetas (dólares y pesos), lista de movimientos con búsqueda, filtros y agrupación por día, detalle de cada movimiento, transferencias reales entre usuarios demo y pantalla de Recibir con QR.
- **Stack:** Next.js 16 (App Router) + TypeScript estricto, Tailwind CSS v4, PostgreSQL 17 + Prisma 7, sesión JWT en cookie `httpOnly` respaldada por una tabla de sesiones revocables, Motion para la física de gestos, Vitest + Testing Library, Playwright.
- **Diseño:** layout del Figma, paleta institucional del club (granate, oro y Cool Gray), Poppins para la interfaz y Rokkitt como tipografía de display.
- **Datos sensibles:** el saldo, el número completo y el CVV de cada tarjeta están ocultos por defecto y se piden al servidor recién al revelarlos (10 revelados por usuario cada 10 minutos, cada uno registrado). El login admite 5 intentos fallidos por email y 20 por IP cada 15 minutos.
- **Tests en `7c50a67`:** 1021 unitarios (108 archivos) · 54 de integración contra PostgreSQL · 113 end-to-end (16 archivos).
- **Repositorio:** [github.com/techfixdev/challenge-tecnico-clublanus](https://github.com/techfixdev/challenge-tecnico-clublanus).
- **Pendiente:** T5, el deploy en Vercel. Requiere la aprobación explícita del candidato.

## Índice

| Fase | Tarea | Título | Commits principales |
|---|---|---|---|
| 1. Base y requerimientos | [T1](#t1--scaffold-y-base-de-datos-05102026) | Scaffold y base de datos | `ef45e46` |
| | [T2](#t2--login-sesión-y-protección-de-rutas-05102026) | Login, sesión y protección de rutas | `3134de9` |
| | [T3](#t3--home-movimientos-y-detalle-05102026) | Home, movimientos y detalle | `87b5e5a`…`c36f451` (14) |
| | [T4](#t4--pulido-final-05102026) | Pulido: revisiones, integración, CI, README | `97590c4`…`876b44e` (9) |
| | [T4b](#t4b--cierre-de-observaciones-05102026) | Cierre de observaciones | `aee4565`, `5fc30b8`, `011f56b`, `952ad3e` |
| | [Inspección](#inspección-ocular-limpieza-del-historial-y-alternativa-desktop-05102026) | Inspección ocular, historial y alternativa desktop | `6edda00`, `3627e4d`, `caef689` |
| | [Mobile](#fixes-de-mobile-real-05102026) | Fixes de mobile real | `94ed88e`, `8c47d3a`, `e7b3e2b` |
| | [T7 · T8](#t7-y-t8--recorrida-completa-checklist-y-mensajes-de-la-api-06102026) | Recorrida completa, checklist y mensajes de la API | `54b7220`, `ab9d849`, `c4d0a2b`, `089f354`, `1e06f25` |
| | [T10](#t10--transferencias-y-recibir-06102026) | Transferencias y Recibir (T10a, T10b, T10c) | `f40a503`…`3ec1782`, `79a1cfa`, `b94a234` |
| | [T17](#t17--dos-monedas-y-formato-argentino-06102026) | Dos monedas y formato argentino | `da809a4`…`f72883e`, `e5825a2` |
| | [T13](#t13--vuelta-de-tarjeta-y-datos-bajo-demanda-06102026) | Vuelta de tarjeta y datos bajo demanda | `5f4b3cc`, `068fe0c`, `6c86e6a`, `1acf3f1`, `30b2de2` |
| 2. Calidad y robustez | [T9b](#t9b--tarjetas-que-escalan-con-su-propio-ancho-06102026) | Tarjetas que escalan con su propio ancho | `8240624` |
| | [T14](#t14--barrido-responsive-y-pulido-de-transferencias-06102026) | Barrido responsive y pulido de transferencias | `0dd6d7b`, `0436010`, `7977706`, `f881334`, `b25c29a` |
| | [T15a/b](#t15a-y-t15b--rendimiento-medido-06102026) | Rendimiento medido | `f95aa01`…`1c1a392` |
| | [T16](#t16--base-de-datos-propia-para-los-tests-06102026) | Base de datos propia para los tests | `3ec82d3`, `b1fc44f`, `25a3dcb` |
| | [T19](#t19--vista-previa-de-producción-en-el-celular-06102026) | Vista previa de producción en el celular | `e815a7f`, `d297369` |
| | [T18](#t18--test-inestable-del-header-de-vidrio-06102026) | Test inestable del header de vidrio | `12177ac` |
| | [T18b](#t18b--el-seed-nunca-fecha-movimientos-en-el-futuro-07102026) | El seed nunca fecha movimientos en el futuro | `51f740b` |
| 3. Diseño y marca | [T9](#t9--pulido-de-las-tarjetas-06102026) | Pulido de las tarjetas | `9285923`, `b5f347f`, `ccec803` |
| | [T12](#t12--una-sola-luz-para-toda-la-app-06102026) | Una sola luz para toda la app | `270281c` |
| | [T21](#t21--marca-del-club-y-login-07102026) | Marca del club y login | `61a425f`, `e9126b1`, `2c11f24` |
| | [T12a](#t12a--solo-colores-institucionales-del-club-07102026) | Solo colores institucionales | `ab2c023` |
| | [T12b-A](#t12b-a--ux-bloqueante-transferir-enfocado-y-cerrar-sesión-fuera-de-la-barra-07102026) | Transferir enfocado y cerrar sesión fuera de la barra | `8f218f9`…`66bb932`, `d3f3228` |
| | [T12b-D](#t12b-d--lista-de-movimientos-agrupada-y-montos-con-signo-07102026) | Lista agrupada y montos con signo | `1ea74a5`, `3befcc6` |
| | [T12b-C2](#t12b-c2--tarjetas-en-español-y-segunda-tarjeta-en-oro-07102026) | Tarjetas en español y segunda tarjeta en oro | `b8ce6ed` |
| | [T12b-C3](#t12b-c3--qr-en-recibir-y-errores-del-login-sobre-granate-07102026) | QR en Recibir y errores del login | `18fac3a`, `65dda61` |
| | [T12b-C1](#t12b-c1--barra-de-navegación-tipo-ios-y-acciones-en-el-detalle-07102026) | Barra tipo iOS y acciones en el detalle | `7c70f56`, `df99739` |
| | [T12b-C](#t12b-c--integración-de-c1-c2-y-c3-07102026) | Integración de C1, C2 y C3 | `95e5c36`…`32fcfd2` |
| 4. Movimiento | [T6](#t6--animaciones-y-valor-agregado-05102026) | Animaciones, ocultar saldo y resumen del mes | `5a6ed87`…`dd9eb60`, `da04d2d`…`cb048be` |
| | [T7a](#t7a--versión-premium-06102026) | Versión premium | `fa9be8c`…`3c15bde` |
| | [T15c](#t15c--enviar-y-recibir-se-expanden-en-su-pantalla-06102026) | Enviar y Recibir se expanden en su pantalla | `0ada6f9`, `94b8b6e` |
| | [T20](#t20--navegación-tipo-ios-06102026) | Navegación tipo iOS | `20c027c`, `98ed24c`, `273c6fc` |
| | [T12b-B](#t12b-b--un-solo-lenguaje-de-movimiento-07102026) | Un solo lenguaje de movimiento | `5937865`, `38508a5`, `225ba72`…`34513fc` |
| | [T23](#t23--motion-v2-manipulación-no-navegación-07102026) | Motion v2: manipulación, no navegación | `0860957`…`07c6e69` |
| 5. Legibilidad y cierre | [T11](#t11--checklist-tokens-y-pantallas-para-figma-07102026) | Checklist, tokens y pantallas para Figma | `f135f51`, `a668497`, `f6a5d3b`, `be36118`, `4695cc9` |
| | [T22](#t22--pase-de-legibilidad-07102026) | Pase de legibilidad | `21c82f8`…`2f06347` (35) |
| | [T24](#t24--sin-referencias-a-documentos-externos-07102026) | Sin referencias a documentos externos | `b639361`, `d0d3f21` |
| | [T25](#t25--tipografía-de-display-rokkitt-07102026) | Tipografía de display: Rokkitt | `ee3e709`, `01020cf`, `93a853c` |
| | [T26](#t26--pase-sobre-las-observaciones-de-t23-07102026) | Pase sobre las observaciones de T23 | `28cc013`…`ff12385` (13) |
| | [T29](#t29--vuelta-al-diseño-recibir-cerrar-sesión-y-escudo-del-login-07102026) | Vuelta al diseño: Recibir, cerrar sesión y escudo del login | `a32c541`, `3cc6c13`, `32e856b` |
| | [T30](#t30--buscador-de-destinatario-07102026) | Buscador de destinatario | `2a4eeb6`…`3e8b928` (10) |
| | [T31](#t31--pegar-en-el-buscador-durante-la-animación-08102026) | Pegar en el buscador durante la animación | `3a2a9fc` |
| | [T32](#t32--texto-escrito-antes-de-hidratar-en-el-buscador-de-destinatario-08102026) | Texto escrito antes de hidratar en el buscador de destinatario | `7c50a67` |
| | [T33](#t33--readme-con-la-marca-del-club-y-requerimientos-08102026) | README con la marca del club y requerimientos | `7a5feb1` |
| | [T34](#t34--e2e-del-destinatario-sin-contar-recientes-08102026) | E2E del destinatario sin contar recientes | `a4c7ade` |
| | [T35](#t35--índice-trigram-para-la-búsqueda-de-movimientos-08102026) | Índice trigram para la búsqueda de movimientos | `95f0f43` |
| | [T36](#t36--límites-de-intentos-en-postgresql-08102026) | Límites de intentos en PostgreSQL | `f790d9a`…`b706c14` (3) |
| | [T36b](#t36b--texto-de-la-tarjeta-derecho-mientras-se-inclina-08102026) | Texto de la tarjeta derecho mientras se inclina | `165d8d6` |
| | [T36c](#t36c--login-sin-bloqueo-por-terceros-y-observaciones-de-la-revisión-08102026) | Login sin bloqueo por terceros y observaciones de la revisión | `e609b97`, `d31a642`, `d1803f0` |
| | [T37](#t37--sesiones-revocables-08102026) | Sesiones revocables | `08aaa0f`, `26e198a`, `05495e8` |
| | T38 | "Qué mejoraría" actualizado (README) | `f7b0c63` |
| | [T39](#t39--pase-final-de-código-limpio-08102026) | Pase final de código limpio | `d114c53`…`9412ae4` (7) + este commit |
| | [T5](#t5--deploy-pendiente) | Deploy en Vercel | pendiente |

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

Repositorio en GitHub, deploy (preferentemente Vercel) y README con: cómo correrlo, decisiones técnicas y qué mejoraría con más tiempo. El estado de cada requerimiento, con su evidencia, está en [`docs/CHECKLIST.md`](CHECKLIST.md).

---

## 2. El diseño

El Figma es público pero de solo lectura, y no había token de API. Se obtuvo la imagen de vista previa del archivo desde el endpoint público de Figma y se guardó, junto con ampliaciones, en `docs/design/`.

La app se llama **GranaBank** (billetera del club) y el Figma tiene tres pantallas:

| Pantalla | Contenido |
|---|---|
| **Login** | Logo, "GranaBank", lema "Con cada compra, sumás orgullo granate", email, contraseña, "Recordarme", botón "Ingresar". Credenciales: `soygranate@clublanus.com` / `GRANATE1@` |
| **Home** | "Hola, Granate", tarjeta con saldo (USD 978.85, ****1234, vence 02/30), "Últimos movimientos". La lupa lleva a Movimientos. |
| **Movimientos** | Búsqueda por persona o servicio, filtros rápidos (Todos, Débito Aut., Recibido, Enviado) y listado. |

**Tokens de diseño extraídos del Figma:** granate `#7A1D2D`, fondo `#F9FAFC`, tipografía Poppins. Por tipo de movimiento: suscripción violeta `#C76DFF`, recibido granate sobre `#DDC6CA`, enviado naranja `#EF9C55`. Más tarde (T21, T12a) la paleta pasó a los colores institucionales del club; el layout sigue siendo el del Figma.

**Interpretación:** la consigna pide "lista + detalle". La lista son los movimientos; el detalle es una pantalla nueva por movimiento (`/movimientos/[id]`), que no está en el Figma y se diseñó con el mismo lenguaje visual.

---

## 3. Decisiones del candidato

Decisiones de producto tomadas explícitamente por el candidato. Las técnicas están en cada entrada del registro.

| Fecha | Decisión | Tarea |
|---|---|---|
| 05/10 | Todo se trabaja en local; nada se publica (push, deploy) sin aprobación explícita. | Proceso |
| 05/10 | La alternativa de layout para desktop queda archivada fuera de la entrega; en desktop se muestra la columna móvil centrada, como el Figma. | Inspección |
| 06/10 | Se autorizan commits locales por unidad de trabajo una vez pasados los checks y la revisión automática. | Proceso |
| 06/10 | Mantener las filas como tarjetas y los montos sin signo, como el Figma (revertida el 07/10). | T7 |
| 06/10 | Transferencias reales entre usuarios demo **y** pantalla de Recibir; sin botón de "acreditar" simulado. | T10 |
| 06/10 | El texto secundario que no llegaba a AA se oscurece hasta 4,5:1. | T12, T16 |
| 06/10 | Dos monedas (Mastercard en dólares, Visa en pesos) y formato argentino para ambas, como desvío documentado del Figma. | T17 |
| 06/10 | Un ojo por tarjeta; revela saldo, número completo y CVV, **todo oculto por defecto**. | T13 |
| 06/10 | Pedidos de valor agregado: rendimiento percibido, vista previa de producción en el celular y navegación tipo iOS. | T15, T19, T20 |
| 06/10 | **Colores institucionales del club** (granate Pantone 188 C, oro Pantone 618 C, Cool Gray 7C) y el escudo oficial en vector, sin redibujarlo ni deformarlo. | T21 |
| 07/10 | Solo colores institucionales en toda la app, sin violeta, naranja, verde ni ámbar. | T12a |
| 07/10 | **El rojo de error se mantiene** como excepción de accesibilidad a la paleta institucional. | T12a |
| 07/10 | Se adoptan los cuatro paquetes de la auditoría de UX, salvo "saldo visible por defecto": **el saldo sigue oculto por defecto**. | T12b |
| 07/10 | **Se revierte la decisión del 06/10:** lista agrupada por día y montos con `+`/`−`, priorizando la legibilidad sobre la fidelidad al Figma. | T12b-D |
| 07/10 | Pase de legibilidad antes de la entrega, porque los evaluadores van a leer sobre todo el código. | T22 |
| 07/10 | **Movimiento de manipulación** inspirado en una referencia de video: superficies que se arrastran y se transforman en su lugar (transferencia continua, gestos globales, coreografía de Home). | T23 |
| 07/10 | Ninguna referencia a documentos externos de marca, ni en el código ni en la documentación. | T24 |
| 07/10 | **Rokkitt como tipografía de display** (logotipo, títulos y montos grandes); Poppins sigue en la interfaz. | T25 |
| 07/10 | Revisar una por una las observaciones no bloqueantes de T23 antes de la entrega. | T26 |
| 07/10 | **Se revierte T12b-A en el cierre de sesión:** vuelve a ser el tercer ícono de la barra inferior, sin confirmación, y Home pierde el avatar, como el diseño original. | T29 |
| 07/10 | El login muestra el escudo sin estrellas; las versiones con estrellas se quitan de la app. | T29 |

---

## 4. Proceso y verificación

- **Asistencia de IA:** el proyecto se construyó con Claude Code, con el candidato decidiendo el alcance y aprobando cada decisión de producto.
- **Unidades de trabajo:** cada tarea cierra con uno o más commits chicos y coherentes, en formato Conventional Commits, con los tests y la documentación junto al comportamiento que cubren. T3 se partió después en 14 commits porque un solo commit de ~4.500 líneas no se podía revisar.
- **Tests primero donde hay un resultado determinista:** se escribe el test, se observa que falla (RED) y después se implementa (GREEN). Cuando un test se escribió después del código (tests de caracterización, algunos de T3 y T4), la entrada lo dice.
- **Revisiones automáticas independientes:** cada cambio de riesgo medio o alto pasó por una revisión automática con uno o cuatro enfoques (seguridad, resiliencia, legibilidad, confiabilidad). Hay revisiones registradas para la mayoría de las tareas. **T6, T7b, T15 y T16 no tienen una revisión registrada**: en T6 y T7b esta bitácora anotó en su momento revisiones aprobadas, pero no quedó un registro de ellas, así que se cuentan como no revisadas. Ninguna revisión encontró un bloqueante sin corregir; las observaciones no bloqueantes se corrigieron en tareas posteriores (T4b, T14, T22, T26) o quedan listadas como limitaciones.
- **Trabajo en paralelo aislado:** T12b, T22, T23 y T26 se hicieron con varias ramas en paralelo, cada una en su propio worktree. Al integrarlas se corrieron las suites completas (unitarios, integración y e2e) y, para los tests sensibles al tiempo, corridas repetidas con varios workers.
- **Datos de prueba aislados:** desde T16 los tests de integración y e2e usan su propia base (`granabank_test`), así que nunca mueven los saldos de la base de desarrollo.

---

## 5. Registro por tarea

### Fase 1 — Base y requerimientos

#### T1 — Scaffold y base de datos (05/10/2026)

**Pedido:** base del proyecto con el stack de la consigna.

**Qué se hizo**

- Proyecto Next.js con TypeScript estricto, Tailwind CSS, ESLint y Prettier.
- PostgreSQL 17 en Docker (`docker-compose.yml`).
- Prisma con tres modelos: `User`, `Card` y `Movement`.
- Seed con el usuario del diseño, 2 tarjetas y 26 movimientos.
- Vitest + Testing Library, con tests del formateador de montos.

**Decisión**

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
| Formato de montos `en-US` (`$978.85`) | El diseño usa punto decimal. (Reemplazado por el formato argentino en T17.) |
| Estructura por features (`src/features/{auth,movements,account}`) | La carpeta "grita" qué hace la app, no qué framework usa; cada feature agrupa su UI, datos y lógica. |
| Script `typecheck` = `next typegen && tsc --noEmit` | Next 16 genera tipos globales (`LayoutProps`) en build; sin ese paso, `tsc` falla en un checkout limpio. |
| Sin modo oscuro | El diseño es solo claro; agregarlo sería alcance no pedido. |
| Archivos de herramientas locales fuera del repo | Las carpetas del entorno de trabajo local no forman parte del proyecto. |

**Cómo se verificó:** lint ✅ · typecheck ✅ · tests 7/7 ✅ · build ✅ · seed corrido 3 veces sin duplicar ✅. Revisión automática (confiabilidad) aprobada, con 4 observaciones no bloqueantes; las dos importantes se corrigieron en T2:

- `formatMoney("")` devolvía `$0` en lugar de fallar, porque `Number("")` es `0`. Corrección: rechazar strings vacíos.
- El seed borraba los datos en una transacción y los recreaba fuera de ella; si fallaba a mitad de camino, el usuario quedaba sin tarjetas. Corrección: todo el reset y la recreación en una sola transacción.

**Commits:** `ef45e46`

#### T2 — Login, sesión y protección de rutas (05/10/2026)

**Pedido:** login del Figma con el usuario demo, rutas privadas y logout.

**Qué se hizo**

- Pantalla `/login` fiel al Figma (captura en `docs/screenshots/login.png`), con mostrar/ocultar contraseña.
- Validación con zod, errores en español por campo y un error general para credenciales inválidas.
- Sesión con JWT firmado en una cookie `httpOnly`. "Recordarme" la mantiene 30 días.
- `src/proxy.ts` protege las rutas privadas; `requireUser()` vuelve a validar la sesión en cada lectura de datos.
- Logout. Endpoints REST `POST /api/auth/login` y `POST /api/auth/logout` que reutilizan la misma lógica.
- `AppShell`: en celular ocupa todo el ancho; en desktop, una columna centrada de 420 px.
- Correcciones de la revisión de T1 (formateador y seed atómico).

**Decisión**

| Decisión | Por qué |
|---|---|
| JWT en cookie (con `jose`, HS256) en lugar de sesiones en base | El proxy valida sin consultar la base. Contra: no se puede revocar una sesión puntual; se mitiga verificando el usuario en cada lectura y con expiración de 1 día si no se marca "Recordarme" (con "Recordarme" son 30 días, un trade-off de comodidad). |
| El token solo guarda el id del usuario | Un JWT se puede decodificar; no lleva datos personales. |
| Algoritmo fijo al verificar | Evita el ataque de "alg confusion", donde el token elige su propio algoritmo. |
| Cookie `httpOnly`, `sameSite=lax`, `secure` en producción | JavaScript (y por lo tanto un XSS) no puede leerla, y no viaja en POST de otros sitios. |
| "Recordarme": 30 días; sin marcar, cookie de sesión con token de 1 día | Respeta la intención del usuario y limita el riesgo si el navegador restaura sesiones. |
| `SESSION_SECRET` obligatorio (mínimo 32 caracteres) | Falla rápido y con un mensaje claro si falta, en vez de firmar con un secreto débil. |
| Server Actions + `useActionState` | El formulario funciona aun sin JavaScript, y Next valida el origen (protección CSRF). |
| Un mismo schema zod en cliente y servidor | En el cliente da feedback inmediato; en el servidor es la validación real, porque el cliente se puede saltear. (En T15 las reglas del cliente pasaron a funciones puras sin zod.) |
| Mensaje genérico "Email o contraseña incorrectos" | No revela qué emails están registrados. |
| bcrypt contra un hash falso cuando el email no existe | Ambos errores tardan lo mismo; el tiempo de respuesta no filtra usuarios. |
| `authenticate` recibe sus dependencias por parámetro | Se testea con mocks, sin base ni bcrypt (arquitectura hexagonal). |
| Doble capa: `proxy.ts` (rápido, solo token) + `requireUser()` (consulta la base) | El proxy corre en cada request, incluidos los prefetch; la verificación real va junto a los datos (defensa en profundidad). |
| Token válido de un usuario borrado → `/login?expired=1` limpia la cookie | Evita un loop infinito de redirecciones. |
| La API de login solo acepta JSON; la de logout valida `Origin` | Un formulario de otro sitio no puede mandar JSON; protección CSRF para los endpoints. |
| Accesibilidad: `aria-invalid`, `aria-describedby`, `role="alert"`, foco en el primer error | Lectores de pantalla y navegación por teclado funcionan correctamente. |
| `server-only` en el código de sesión y base | Impide que ese código termine por error en el bundle del navegador. |

**Diferencia con el Figma:** los placeholders dicen "Ingresá…" (voseo, igual que el lema "sumás"); en el Figma dicen "Ingresa…".

**Cómo se verificó:** tests escritos antes del código (RED → GREEN). Unitarios 39/39 (schema, token, lógica de login, formulario, formateador) · e2e 5/5 (redirecciones, error de credenciales, validación, login/logout, flags de la cookie y "Recordarme") · lint, typecheck, build y prettier ✅. Revisión automática con 4 enfoques aprobada sin bloqueantes, con 15 observaciones; las importantes se corrigieron en T3:

- La API de login aceptaba cualquier `Content-Type` que *contuviera* `application/json`.
- Si la base se caía, la API de login devolvía un 500 sin controlar en lugar de un 503 claro.
- Las rutas REST no tenían tests.
- Si faltaba `SESSION_SECRET`, el proxy rompía en lugar de redirigir al login.
- No hay límite de intentos de login; queda como mejora (ver Limitaciones), porque en serverless un límite en memoria no sirve.
- Esta bitácora decía "expiración corta", pero con "Recordarme" son 30 días; se corrigió el texto.

**Commits:** `3134de9`

#### T3 — Home, movimientos y detalle (05/10/2026)

**Pedido:** lista + detalle de la consigna, con los estados de carga, error y vacío.

**Qué se hizo**

- **Home:** saludo, carrusel de tarjetas (la Visa asoma al costado, como en el Figma), "Últimos movimientos" (5) con "Ver todos", lupa que lleva a Movimientos y campana con aviso "Próximamente".
- **Movimientos:** búsqueda por nombre o servicio, filtros rápidos (Todos, Débito Aut., Recibido, Enviado) y paginación con "Cargar más".
- **Detalle** `/movimientos/[id]`: pantalla nueva con el mismo lenguaje visual (fecha, tipo, tarjeta, referencia, estado).
- **Estados:** esqueletos de carga, error con "Reintentar", vacío sin movimientos y vacío sin resultados (con "Limpiar filtros"), y pantalla de "no encontrado".
- **Navegación inferior** compartida: Home, Movimientos y Salir.
- **API REST:** `GET /api/movements`, `GET /api/movements/[id]`, `GET /api/account/cards`.
- **Correcciones de la revisión de T2:** `Content-Type` comparado exacto; errores de infraestructura con 503 y un formato común `{ error: { code, message } }`; errores de validación completos en la API; el proxy no rompe si falta el secreto; constante compartida para `expired`; tests de todas las rutas REST y del proxy.

**Decisión**

| Decisión | Por qué |
|---|---|
| Búsqueda y filtros en la URL (`?q=&type=`) | Se pueden compartir, sobreviven al recargar, funcionan con el botón atrás, y el filtrado ocurre en la base y no en el navegador. |
| Búsqueda con espera de 300 ms (debounce) + `router.replace` + `useTransition` | Una consulta por pausa y no una por tecla; no llena el historial; muestra un indicador mientras carga. |
| Chips de filtro como links | Funcionan sin JavaScript y conservan la búsqueda. |
| Paginación por cursor (`occurredAt` + `id`) en lugar de offset | Es estable si entran movimientos nuevos (con offset se duplican o saltean filas) y aprovecha el índice. |
| Cada consulta filtra por `userId`; un id ajeno da el mismo 404 que uno inexistente | Protección IDOR: nadie ve datos de otro cambiando el id en la URL, y ni siquiera se confirma que el id exista. |
| Ids mal formados se rechazan antes de ir a la base | Ahorra la consulta y evita entradas inválidas. |
| Casos de uso que reciben el repositorio por parámetro | Igual que el login: se testean con mocks, y el wiring con Prisma ocurre solo en las rutas. |
| Montos como string con 2 decimales en la API | Mantiene la exactitud del `Decimal`; un número JSON podría perder precisión. |
| Fechas en zona horaria `America/Argentina/Buenos_Aires` | Vercel corre en UTC; sin esto, un movimiento de las 22 h aparecería al día siguiente. |
| Mismo schema zod con dos políticas | La vista ignora parámetros inválidos y muestra todo (amable con el usuario); la API responde 400 con el detalle (estricta con el desarrollador). |
| `Suspense` con key por filtros | El esqueleto aparece solo en los resultados; el buscador y los chips no se desmontan y no se pierde el foco. |
| Error boundaries por sección | Si fallan los movimientos, la navegación sigue funcionando. |
| Dos estados vacíos distintos | "No tenés movimientos" y "No hay resultados para tu búsqueda" son situaciones diferentes y piden acciones diferentes. |
| "Volver" construido con parámetros validados | Vuelve a la lista con los mismos filtros y no se puede usar como redirección abierta a otro sitio. |
| Íconos y logos en SVG inline | Sin dependencias extra. |
| Lista sin encabezados por fecha | Con un movimiento por día quedaba un título en casi cada fila. (Revisado en T12b-D, con más movimientos por día.) |

**Correcciones antes del commit** (detectadas al revisar juntos):

- **Búsqueda sin distinguir acentos:** "jose" encuentra "José". Se activó la extensión `unaccent` de Postgres con una migración. La consulta usa parámetros (`Prisma.sql`), nunca concatenación, así que no hay inyección SQL; además se escapan `%` y `_`, y buscar "%" no devuelve todo. No se normalizó en la app (habría que traer todas las filas) ni con una columna duplicada (dato a mantener sincronizado). Desde T35, la búsqueda tiene un índice trigram (GIN) sobre una función `unaccent` inmutable.
- **404 real en el detalle:** con un `loading.tsx` por encima, Next empieza a transmitir la respuesta y el status queda fijo en 200 antes de saber si el movimiento existe. Los esqueletos de Home y lista se movieron a *route groups* (`(home)`, `(list)`) para que no envuelvan al detalle; las URLs no cambian. Trade-off: el detalle no muestra esqueleto mientras carga, pero es una sola consulta indexada.

**Historial de commits:** T3 se hizo primero como un solo commit (95 archivos, ~4.500 líneas). La revisión automática no pudo procesarlo por tamaño, y un commit así es difícil de revisar para cualquier persona. Se partió en 14 commits temáticos de ~400 líneas, cada uno con sus tests, y se verificó que cada uno compile y pase los tests por sí solo. El código final quedó idéntico byte a byte (mismo hash de árbol de git).

**Cómo se verificó:** 149 unitarios (28 archivos) y 13 e2e · lint, typecheck, build y prettier ✅. La mayoría de los tests se escribió antes del código; algunos (detalle, pantalla de error y helpers de tarjeta) se escribieron después. Revisión automática por tramos, los 4 aprobados sin bloqueantes:

| Tramo | Commits | Enfoques | Observaciones relevantes (no bloqueantes, corregidas en T4) |
|---|---|---|---|
| A — shared + hardening auth | `87b5e5a`…`cdf3dcb` | 4 enfoques | El manejo de errores convertía *cualquier* error en 503: un bug de programación debería ser 500, y se tragaban los `redirect()`/`notFound()` de Next. |
| B — dominio, datos y API | `e09aa1c`…`bc95fba` | confiabilidad | El SQL crudo de búsqueda no tenía un test contra la base real. |
| C — componentes UI | `ac28de2`…`6ab2167` | confiabilidad | En el buscador, si se cambiaba de filtro mientras se escribía, la búsqueda pendiente podía aplicarse con el filtro anterior. |
| D — estados y vistas | `6772e5b`…`633b41d` | 4 enfoques | "Reintentar" no usaba bien la función de Next; "Cargar más" ignoraba errores en silencio y, con la sesión vencida, podía reintentar sin parar. |

**Limitación de entonces:** el violeta de suscripción del Figma no llegaba al contraste AA en texto chico; desapareció con la paleta institucional (T12a).

**Commits:**

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

#### T4 — Pulido final (05/10/2026)

**Pedido:** cerrar las observaciones de T3, probar el SQL contra una base real, CI y README.

**Qué se hizo y por qué**

| Cambio | Por qué |
|---|---|
| Errores de la API: 503 solo si la base no responde, 500 para el resto, y las redirecciones de Next se dejan pasar (`unstable_rethrow`) | Un 503 le indica al cliente que reintente más tarde; un bug no se arregla reintentando. Antes, un `redirect()` dentro de una ruta se convertía en error. |
| Clasificador de errores de base (`db-errors.ts`) basado en errores observados | Con Prisma 7 y el adaptador `pg`, una conexión rechazada llega como `ECONNREFUSED`, no como el clásico `P1001`. Se verificó en la práctica en lugar de suponerlo. |
| Respuesta de login con formato `{ data }` / `{ error }` | Todas las respuestas de la API siguen el mismo formato. |
| Tests de integración (`pnpm test:integration`) contra Postgres | El SQL crudo de la búsqueda solo se puede probar contra una base real: acentos, `%`/`_`, aislamiento por usuario, desempate con timestamps iguales y paginación de las 26 filas sin duplicados. |
| Los tests de integración corren en zona horaria de Buenos Aires | Se probó que, si se rompe la conversión de fechas del cursor, los tests fallan (*mutation check*). |
| El buscador lee los filtros actuales al momento de disparar | Si se cambiaba de chip mientras se escribía, la búsqueda pendiente usaba el filtro viejo. |
| "Cargar más": mensaje de error con "Reintentar", redirección al login si la sesión venció, timeout de 10 s | Antes, los errores se ignoraban en silencio y con la sesión vencida podía reintentar sin fin. |
| Pantalla de error compartida (`RouteError`) que registra el error con su `digest` | Una sola implementación para todas las secciones, y el `digest` permite rastrear el error en los logs del servidor. |
| Los tests unitarios corren con `TZ=UTC` (como Vercel) | Garantiza que las fechas se ven bien en Argentina aunque el servidor esté en UTC. |
| Un id mal formado en la API sigue dando 404 y no 400 | La API nunca revela si un id existe o no. |
| Estructura unificada | `db.ts` pasó a `src/shared/lib/`; `auth` quedó con las mismas capas que las otras features, más `server/`; se eliminaron exports sin uso. |
| CI (`.github/workflows/ci.yml`) | En cada PR y push a `main`: (1) lint, typecheck, formato y unitarios; (2) Postgres real con migraciones, seed, integración, build y e2e contra el build de producción. |

**Bug encontrado al commitear:** el CI define `SESSION_SECRET`, y el test "falla si falta el secreto" leía esa variable del entorno, así que en GitHub Actions iba a fallar. Se reprodujo con las mismas variables del CI (RED), se aisló el test con `vi.stubEnv` (GREEN) y se agregó `876b44e`. Un test no debe depender del entorno en el que corre.

**Cómo se verificó:** unitarios 189/189 (3 corridas) · integración 10/10 · e2e 13/13 (dev y producción) · build ✅ · README probado en un clon limpio ✅. Algunos tests de T4 son de caracterización (escritos después del código, fijan un comportamiento existente). En el clon limpio un test falló una vez y no se repitió en 17 corridas; el sospechoso dependía del tiempo real y se reescribió con timers simulados. Revisión automática por tramos, los 3 aprobados sin bloqueantes:

| Tramo | Commits | Observaciones relevantes (no bloqueantes, cerradas en T4b) |
|---|---|---|
| E — estructura + errores de la API | `97590c4`…`9562bd6` | Algunos errores de Prisma desconocidos no se clasificaban; un error de credenciales de la base se trataba como caída (503) cuando es de configuración (500). |
| F — integración, buscador, "Cargar más" | `70f5d85`…`2285768` | Con la sesión vencida, "Cargar más" podía quedar en estado de carga mientras redirigía; el test de integración dependía de los datos del seed. |
| G — UI, CI, docs | `1e078bc`…`876b44e` | CI: fijar las acciones por hash y limitar los permisos del token. |

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

#### T4b — Cierre de observaciones (05/10/2026)

**Pedido:** cerrar las observaciones de los tramos E, F y G.

**Qué se hizo**

| Commit | Cambio | Por qué |
|---|---|---|
| `aee4565` | "Cargar más" pasa a un estado final "Tu sesión venció. Redirigiendo…" ante un 401 | El usuario entiende por qué se cortó la lista, en lugar de ver un botón trabado en "Cargando…". |
| `5fc30b8` | Errores de base clasificados en *no disponible* (503), *mal configurada* (500) y *no clasificado* (500) | Una contraseña de base incorrecta no se arregla reintentando: es un error de configuración. |
| `011f56b` | El test de integración crea y borra sus propios datos, y verifica la zona horaria de Buenos Aires | Un test no debe depender del seed ni del entorno. |
| `952ad3e` | CI: acciones fijadas por hash de commit, permisos de solo lectura y `persist-credentials: false` | Seguridad de *supply chain*: un tag (`v4`) se puede mover a código malicioso, un hash no. |

**Decisión:** el clasificador se basó en evidencia. Se probó contra el Postgres local con contraseña incorrecta, base inexistente, puerto cerrado y host desconocido, y se registró el error real de cada caso (por ejemplo, una contraseña incorrecta da `P1000` en consultas normales y `P2010` con `28P01` en SQL crudo). Seis tests de integración reproducen esos casos. Prisma bloquea `migrate reset` cuando lo ejecuta una IA, salvo con consentimiento explícito; no se forzó.

**Cómo se verificó:** unitarios 210/210 (también con las variables del CI) · integración 17/17 (con y sin seed) · e2e 13/13 · build ✅. Revisión con 4 enfoques aprobada sin bloqueantes; quedan sugerencias menores en tests que no afectan el comportamiento.

**Commits:** `aee4565`, `5fc30b8`, `011f56b`, `952ad3e`, `dd120e5` (docs)

#### Inspección ocular, limpieza del historial y alternativa desktop (05/10/2026)

**Pedido:** recorrer la app en un navegador real antes de seguir.

**Qué se hizo:** recorrida conjunta en Chromium (Playwright, 390×844) sobre el build de producción.

| Flujo | Resultado |
|---|---|
| Login con contraseña incorrecta y correcta | ✅ |
| Home: tarjetas, carrusel, últimos movimientos | ✅ |
| Lupa → Movimientos con foco en el buscador | ✅ |
| Búsqueda "jose" encuentra "José Suárez" | ✅ |
| Detalle → "Volver" conserva la búsqueda | ✅ |
| Chips de filtro conservan la búsqueda | ✅ |
| "Cargar más": 26 movimientos, sin duplicados, el botón desaparece al final | ✅ |
| URL inventada → HTTP 404 real con pantalla amigable | ✅ |
| Campana → "Próximamente" | ✅ |
| Salir + botón atrás → rebota al login | ✅ |

**Hallazgos y decisiones**

- **El último chip se ve cortado:** es intencional, igual que en el Figma; indica que la fila se desliza. Se reforzó con un degradé en el borde derecho (máscara CSS del ancho del margen, así el último chip se ve completo al llegar al final). Commit `6edda00`.
- **"Se perdió la búsqueda":** se reprodujo el recorrido de forma automatizada (incluso tocando un chip antes de los 300 ms del buscador) y la búsqueda siempre se conservó. Lo más probable es que se haya vuelto con "Movimientos" de la barra inferior, que a propósito abre la lista limpia, como una pestaña. No es un bug.
- **Limpieza del historial:** la preparación de la entrevista vivía en esta bitácora y se movió a un archivo ignorado por git. Se reescribieron los commits (`git filter-branch`) para quitarla de todas las versiones, se verificó que el código final quedara idéntico (mismo árbol) y se actualizaron las referencias a commits (`3627e4d`). Se hizo antes de publicar, porque reescribir un historial ya publicado rompe los clones de otras personas.
- **Alternativa responsive para desktop (archivada, fuera de la entrega):** se construyó en 3 commits y se guardó fuera del repo como bundle de git (`caef689` lo documenta). Cambiaba solo desde 1024 px (mobile idéntico píxel por píxel, verificado con `magick compare`), con barra lateral, Home en dos columnas y login partido; 216 unitarios y 16 e2e. **Decisión:** no se incluye, porque el Figma es solo mobile y sería diseño propio; la entrega usa la columna centrada en desktop.

**Commits:** `3790478`, `6edda00`, `3627e4d`, `46bac74`, `caef689`

#### Fixes de mobile real (05/10/2026)

**Pedido:** que la app se comporte bien en un teléfono real.

**Qué se hizo**

| Commit | Cambio | Por qué |
|---|---|---|
| `94ed88e` | Inputs a 16 px; safe areas con `viewport-fit=cover`; `theme-color` | iOS Safari hace zoom al enfocar inputs de menos de 16 px. El placeholder sigue chico como en el Figma, porque el zoom depende del input. Sin `viewport-fit=cover`, `env(safe-area-inset-*)` vale 0. |
| `8c47d3a` | Íconos de GranaBank (SVG, apple-icon, `.ico`) y web manifest | Reemplaza el ícono por defecto de Next. El `.ico` se mantiene para Safari viejo. |
| `e7b3e2b` | README "Cómo ver los estados" | El evaluador puede provocar cada estado: vacío, carga, error y 404. Cada instrucción se probó contra el build de producción. |

**Decisión:** la barra del navegador usa el color de fondo y no el granate, porque todas las pantallas arrancan con un header claro.

**Cómo se verificó:** revisión con 4 enfoques aprobada sin bloqueantes.

**Commits:** `94ed88e`, `8c47d3a`, `e7b3e2b`, `5a6ed87`, `e7d0a14`

#### T7 y T8 — Recorrida completa, checklist y mensajes de la API (06/10/2026)

**Pedido:** recorrer la app de punta a punta, separar lo local de lo de producción, verificar el enunciado punto por punto y arreglar el morph de vuelta del detalle a la lista.

**Qué se hizo**

- **Recorrida** con un Chromium visible en tamaño iPhone (390×844): errores por campo con `aria-invalid`, credenciales inválidas sin revelar qué falló, `/` sin sesión responde 307 a `/login`, brillo de los esqueletos, filas escalonadas, morph del ícono lista → detalle y odómetro del saldo.
- **Morph de vuelta (T7b):** con el link "Volver" funciona en producción, porque el prefetch trae la lista antes de navegar y el ícono "pareja" existe cuando cambia la pantalla (en `next dev` no hay prefetch). Con el botón atrás del navegador no se anima: React restaura esa entrada del historial de forma síncrona y no inicia ninguna view transition. No se intercepta el historial para forzarlo.
- **Mensajes de la API (T8):** probando con `curl`, un JSON de login *sin* `email` o `password` devolvía el mensaje por defecto de zod en inglés. Se corrigió con `z.string({ error })`.
- **Checklist del enunciado:** `docs/CHECKLIST.md`, con el estado de cada requerimiento y su evidencia.
- **Probar desde el celular (T7e):** `ALLOWED_DEV_ORIGINS` (solo dev) habilita la IP de la máquina en la red local.
- **Fidelidad al diseño (T7d):** se evaluó cambiar las filas y poner signo a los montos, pero se decidió mantener el Figma (decisión revertida el 07/10 en T12b-D).

**Local vs. producción**

| Tema | Local (desarrollo) | Producción (Vercel, prevista: el deploy es T5) |
|---|---|---|
| Servidor | `next dev`: sin prefetch, con recarga en caliente y el indicador "N" de Next | `next build` + `next start`: prefetch de links, sin indicador |
| Base de datos | PostgreSQL 17 en Docker (`pnpm db:up`), puerto 5432 | Neon (Postgres administrado) desde el Marketplace de Vercel |
| Migraciones | `pnpm db:migrate` (`prisma migrate dev`) | `pnpm db:deploy` (`prisma migrate deploy`, solo aplica las existentes) |
| Datos | `pnpm db:seed`: usuarios demo y movimientos | Seed una única vez sobre la base de producción |
| Variables | `.env` local (no se versiona); `.env.example` como plantilla | Variables de entorno del proyecto en Vercel |
| `SESSION_SECRET` | Cualquier valor de 32+ caracteres | Secreto aleatorio (`openssl rand -base64 32`), nunca el del ejemplo |
| Cookie de sesión | `httpOnly`, `SameSite=Lax`, `secure=false` (`http://localhost`) | `httpOnly`, `SameSite=Lax`, `secure=true` (solo HTTPS) |
| Cliente de Prisma | En `globalThis` para no abrir conexiones nuevas en cada recarga | Una instancia por proceso |
| `ALLOWED_DEV_ORIGINS` | Habilita la IP de la red local | Sin efecto: solo aplica a `next dev` |
| Morph "Volver" | No se ve (no hay prefetch) | Funciona |
| Tests e2e | `pnpm test:e2e` levanta `next dev` en el 3100 | Con `CI=1` levanta `next start` y prueba el build real |

El build de producción no se podía probar desde el celular por `http://` en la red local, porque la cookie `Secure` se descarta fuera de HTTPS; T19 resolvió eso con una opción explícita y solo local.

**Cómo se verificó:** el mensaje de zod tiene un test que primero falló (RED). El comportamiento del botón atrás quedó fijado en un test que solo admite el timeout de la espera de la transición (primero `test.fixme`, que nunca ejecuta el cuerpo; después `test.fail`, que aceptaba cualquier falla; al final un test normal que distingue el error por tipo) y se pondrá en rojo el día que React anime esa navegación. Revisiones: `.gitignore` aprobada; T8 aprobada con 4 enfoques y en una segunda revisión de riesgo medio. **T7b (`54b7220`) no tiene una revisión registrada.**

**Commits:** `c5cf5b4`, `54b7220`, `ab9d849`, `c4d0a2b`, `089f354`, `c3e2481`, `cb34a81`, `1e06f25`

#### T10 — Transferencias y Recibir (06/10/2026)

**Pedido:** que el dinero se pueda mover de verdad entre usuarios demo, y una pantalla para recibir.

**Decisión:** transferencias reales y Recibir, las dos (decisión del candidato); sin botón de "acreditar" simulado. Se dividió en T10a (backend), T10b (envío) y T10c (Recibir y accesos desde Home).

**Qué se hizo**

- **T10a, backend:** helpers de centavos compartidos y parseo estricto de montos; segundo usuario demo (`hincha`), alias y CVU con dígitos verificadores; transferencia en **una sola transacción**: débito con un `UPDATE` condicional (`WHERE balance >= monto`, nunca sobregira con concurrencia), crédito al destinatario, los dos movimientos enlazados a un `Transfer` y un `CHECK (balance >= 0)` como red de seguridad. Idempotencia por clave del cliente: un reintento devuelve la transferencia original sin mover dinero dos veces; la misma clave con otros datos responde 409.
- **CSRF:** el guard comparaba `Origin` con la URL del request, que refleja la dirección de escucha (`0.0.0.0` con `next dev -H`); ahora compara con el header `Host`, la misma regla que aplica Next a las Server Actions.
- **T10b/c, UI:** flujo de tres pasos (destinatario, monto, revisión) con clave de idempotencia emitida por el servidor y Server Actions; pantalla Recibir con copiar y compartir (con respaldo para contextos no seguros); accesos rápidos en Home. Los e2e que mueven dinero corren después de los de solo lectura.

**Cómo se verificó:** 439 unitarios y 38 de integración en verde al terminar la UI. La revisión de T10a pidió una corrección por un problema **crítico**: dos requests simultáneas con la misma clave podían responder 422 en lugar de repetir el resultado. Se reprodujo en rojo 3 de 3 veces con un duplicado desfasado y se corrigió volviendo a leer la clave confirmada ante un rechazo; el validador aprobó. El fix de CSRF se aprobó con 4 enfoques. La UI se aprobó con 3 advertencias que se cerraron en T14.

**Commits:** `f40a503`, `d06518f`, `99748a8`, `b3a76d6`, `3ec1782`, `b94a234`, `79a1cfa`

#### T17 — Dos monedas y formato argentino (06/10/2026)

**Pedido:** que la Mastercard opere en dólares y la Visa en pesos, con saldos y movimientos realistas.

**Decisión:** formato argentino para las dos monedas (`$ 312.400,50` y `US$ 978,85`), como desvío documentado del Figma ("978.85"): con pesos y dólares en la misma pantalla, un solo formato y símbolos distintos evitan leer el `$` de los pesos como dólares. Nunca se convierte ni se suman monedas.

**Qué se hizo**

- Un solo formateador para las dos monedas, construido desde centavos exactos, y un parser que acepta el formato argentino y rechaza lo ambiguo; un componente `Money` que lee el monto con su moneda en voz alta.
- Tarjetas, filas y detalle con el formateador compartido; el resumen del mes devuelve un total por moneda.
- Las transferencias acreditan en la tarjeta del destinatario de la misma moneda (`hincha` recibe una tarjeta en pesos); sin cuenta en esa moneda, se rechaza con `CURRENCY_MISMATCH`. Topes por moneda.
- Seed: una suscripción en pesos en el mes actual.

**Cómo se verificó:** revisión aprobada, con una advertencia que se corrigió de inmediato: la regla argentina de miles leía un `"10.555"` de la API como 10555, así que un cliente que mandara un decimal común podía mover mil veces el monto. Desde `f72883e` la API y el dominio solo aceptan montos canónicos (el punto es siempre el decimal) y el formulario convierte lo escrito antes de llegar a ellos.

**Commits:** `da809a4`, `2097ce4`, `07f5230`, `b72b974`, `075f4cc`, `f72883e`, `e5825a2`, `04da40c`

#### T13 — Vuelta de tarjeta y datos bajo demanda (06/10/2026)

**Pedido:** faltaba el ojo en la Visa. Un ojo por tarjeta, y que la tarjeta se dé vuelta al tocarla.

**Decisión:** el ojo revela saldo, número completo y CVV, **todo oculto por defecto** (decisión del candidato). Esto reemplaza la cookie de "ocultar saldo" de T6: recordar "visible" obligaría a mandar el saldo en el HTML inicial.

**Qué se hizo**

- **Datos bajo demanda:** Home renderiza la cara de la tarjeta sin saldo; ni el HTML ni el payload RSC traen saldo, número ni CVV. Al tocar el ojo, `GET /api/account/cards/:id/details` reverifica la sesión, busca la tarjeta por dueño (una ajena da 404) y responde con `Cache-Control: no-store`. Los datos se vuelven a ocultar a los 30 s, al ocultar la pestaña o al salir.
- **Números ficticios:** PAN de 16 dígitos inventado, válido por Luhn y consistente con sus últimos 4. El CVV no se guarda (PCI DSS lo prohíbe): se deriva en el servidor con HMAC, solo para la demo.
- **Vuelta:** giro 3D con resorte (banda, panel de firma, CVV); deslizar, inclinar o mantener presionado nunca la da vuelta; Enter y Espacio sí; con movimiento reducido es un fundido.

**Cómo se verificó:** e2e de vuelta y de revelado por tarjeta, más un e2e que verifica que el HTML inicial no trae datos sensibles. Revisión aprobada; una advertencia (una tarjeta sin número guardado respondía 500 al revelar) se corrigió en `30b2de2`.

**Commits:** `5f4b3cc`, `068fe0c`, `6c86e6a`, `1acf3f1`, `4b1ecaa`, `30b2de2`

---

### Fase 2 — Calidad y robustez

#### T9b — Tarjetas que escalan con su propio ancho (06/10/2026)

**Pedido (urgente, captura del candidato en Android):** a 320 px de ancho CSS se cortaba el último dígito de la tarjeta, a 280 px desaparecían los últimos 4 y a 200 px o menos la pantalla se desbordaba (el zoom de Android achica el viewport CSS).

**Decisión:** la tarjeta usaba píxeles fijos dentro de un ítem de carrusel que mide un porcentaje del ancho. Se convirtió en un *size container* con unidades de container query, calibrado para quedar idéntico a 390 px.

**Cómo se verificó:** e2e responsive de 240 a 768 px; revisión aprobada.

**Commits:** `8240624`

#### T14 — Barrido responsive y pulido de transferencias (06/10/2026)

**Pedido:** que ninguna pantalla se desborde en anchos chicos y cerrar las advertencias de T10.

**Qué se hizo**

- Ninguna ruta se desborda de costado ni corta texto entre 240 y 1024 px, y ninguna scrollea de costado a 180–200 px; 390 px y más quedan idénticos. Un e2e audita cada ruta y estado.
- Referencia corta y legible compartida por los dos movimientos (`ENV-7Q4K-92XA` / `REC-7Q4K-92XA`, base32 de Crockford), un solo formateador para el CVU enmascarado, el monto con coma se normaliza al salir del campo, el seed agrega una transferencia para "Recientes", orden determinista de recientes y, ante un rechazo del destinatario, se lo vuelve a confirmar.
- Una referencia repetida se reintenta solo ante su propio índice único (`b25c29a`).
- El e2e de "Volver" espera el prefetch real de la lista y los e2e de transferencias corren en serie.

**Cómo se verificó:** revisión con 4 enfoques aprobada.

**Commits:** `0dd6d7b`, `0436010`, `7977706`, `f881334`, `b25c29a`, `18194a6`

#### T15a y T15b — Rendimiento medido (06/10/2026)

**Pedido:** rendimiento percibido. Medir primero el build de producción y optimizar con números de antes y después.

**Qué se hizo**

- **Medición (T15a):** lo peor era el LCP de `/transferir` (2816 ms, por un HTML del servidor en `opacity: 0` hasta hidratar), zod en el bundle del cliente (89 KB gzip), el esqueleto en cada navegación desde Home por un prefetch parcial y dos pesos de Poppins sin uso.
- **Arreglos (T15b):** prefetch completo de las pantallas probables (Home → `/movimientos` de 1153 a 287 ms en un teléfono limitado); el primer paso de `/transferir` se renderiza visible desde el servidor (LCP de 2816 a 952 ms); las reglas del cliente pasaron a módulos sin zod, con el schema del servidor como fuente de verdad; se quitaron los pesos de Poppins sin uso.
- **Caché:** el prefetch completo dejaba `/movimientos` en caché 5 minutos, así que un ingreso enviado por otra persona podía tardar eso en verse; se limitó a 30 s (`staleTimes.static`). "Cargar más" incluye su validador (`zod/mini`) con la vista.

**Cómo se verificó:** mediciones de antes y después sobre el build de producción. **T15 no tiene una revisión registrada.**

**Commits:** `f95aa01`, `5886c32`, `ce05f5b`, `5d24596`, `1482292`, `92aa414`, `ca7e4b5`, `1c1a392`, `c2244aa`

#### T16 — Base de datos propia para los tests (06/10/2026)

**Pedido:** las corridas automáticas usaban la base de desarrollo y movieron dos veces los saldos que el candidato estaba probando a mano.

**Qué se hizo**

- Integración y e2e corren sobre `granabank_test`, creada, migrada y sembrada en cada corrida; el helper de URL rechaza cualquier base cuyo nombre no termine en `_test`, y el guard tiene tests.
- En el mismo lote: el texto secundario pasó de `#8a8d9b` (3,3:1 sobre blanco) a `#707382`, el gris más claro del mismo tono que llega a 4,5:1 sobre todos sus fondos (decisión del candidato, ver T12); y la pantalla de transferir se achica de vuelta hacia Enviar (ver T15c).

**Cómo se verificó:** e2e 49/49 dos veces y comprobación de que la base de desarrollo no cambió. **T16 no tiene una revisión registrada.**

**Commits:** `3ec82d3`, `b1fc44f`, `94b8b6e`, `2ee0354`, `25a3dcb`, `762eab7`

#### T19 — Vista previa de producción en el celular (06/10/2026)

**Pedido:** probar el rendimiento real del build de producción desde el teléfono.

**Decisión:** una opción explícita y solo local: `GRANABANK_LAN_PREVIEW=1` (`pnpm preview:lan`) emite una cookie de sesión sin `Secure` para que el login funcione por `http://<IP-de-la-red>`. Avisa en voz alta, está apagada por defecto y se niega a arrancar en Vercel o con un host público.

**Cómo se verificó:** revisión con 4 enfoques aprobada; el refactor `d297369` decide la vista previa desde una sola fuente de "producción".

**Commits:** `e815a7f`, `b08e6c7`, `d297369`

#### T18 — Test inestable del header de vidrio (06/10/2026)

**Pedido:** un e2e del header de vidrio con movimiento reducido fallaba 2 de 4 corridas completas y pasaba solo.

**Decisión:** la causa era real, no del test: un scroll anterior a que cargara el renderer diferido de Motion se perdía y el header quedaba congelado. Los valores ligados al scroll ahora se escriben directo en el estilo del elemento.

**Cómo se verificó:** `premium.spec.ts` diez veces seguidas, 80/80, dos veces.

**Commits:** `12177ac`

#### T18b — El seed nunca fecha movimientos en el futuro (07/10/2026)

**Pedido:** un e2e de transferencias fallaba si el seed se corría antes de las 09:00.

**Decisión:** el movimiento de Adobe de hoy se sembraba a las 09:00 hora local; antes de esa hora quedaba en el futuro, por encima de la transferencia del e2e. Las fechas salen ahora de `seedDate`, que nunca pasa de "ahora".

**Cómo se verificó:** test unitario del recorte y e2e 70/70; revisado dentro del primer tramo de T12b.

**Commits:** `51f740b`

---

### Fase 3 — Diseño y marca

#### T9 — Pulido de las tarjetas (06/10/2026)

**Pedido:** "los números de la Visa se ven horribles; todo centrado y alineado al detalle".

**Qué se hizo:** Poppins no tiene cifras tabulares, así que cada columna del odómetro se dimensiona por su dígito final (había un hueco alrededor del "1"); los grupos enmascarados se centran sobre los dígitos; la marca de Visa es el logotipo real en lugar de una caja genérica y las dos marcas terminan en el borde del contenido. Las columnas del saldo oculto se dimensionan con un dígito neutro.

**Cómo se verificó:** verificación visual a 3x y un test del kerning oculto contra un control visible. Tres revisiones de riesgo medio aprobadas.

**Commits:** `9285923`, `b5f347f`, `ccec803`, `e3a0e8a`

#### T12 — Una sola luz para toda la app (06/10/2026)

**Pedido:** profundidad visual sobria en toda la app.

**Decisión:** un solo sistema de luz, desde arriba a la izquierda: sombras en capas teñidas con la tinta y el granate, un borde superior especular y un degradé de la misma paleta en el ángulo de la luz. Los controles principales se hunden al presionarlos y los inputs se leen rehundidos. Los tokens viven en `globals.css`.

**Cómo se verificó:** revisión con 4 enfoques aprobada. La revisión señaló que el texto secundario no llegaba a AA; el candidato eligió oscurecerlo (aplicado en `b1fc44f`, T16).

**Commits:** `270281c`

#### T21 — Marca del club y login (07/10/2026)

**Pedido:** normalizar la marca con los colores institucionales del club y el escudo oficial, y rediseñar el login.

**Decisión**

- **Paleta:** granate `#70192D` (Pantone 188 C, reemplaza al `#7A1D2D` del Figma), oro `#B4982F` (Pantone 618 C: chip de moneda y acentos) y Cool Gray 7C `#9A999D`, con el contraste AA medido.
- **Escudo:** el vector oficial del club, sin redibujarlo, modificarlo ni estirarlo; relleno granate sobre fondo claro e iniciales blancas. El efecto 3D sale solo de filtros CSS (sombras teñidas, luz desde arriba a la izquierda, un brillo especular sutil), con el vector intacto.
- **Login:** degradé radial en granate (más claro alrededor del escudo, casi `#3A0D18` abajo), el escudo con estrellas (desde T29, sin estrellas), logotipo "GranaBank" en una slab serif libre (Arvo, reemplazada por Rokkitt en T25), controles adaptados al fondo oscuro y foco en oro.
- Todos los colores escritos a mano pasaron a tokens. El README aclara que los recursos de marca pertenecen al club.

**Cómo se verificó:** typecheck y unitarios en verde commit por commit (703/707/707), lint en verde y 70/70 e2e. Revisión con 4 enfoques aprobada, con 6 observaciones no bloqueantes (entre ellas el contraste del rojo de error) que se cerraron en T12a y T22.

**Commits:** `61a425f`, `e9126b1`, `2c11f24`

#### T12a — Solo colores institucionales del club (07/10/2026)

**Pedido:** usar únicamente los colores institucionales del club (granate Pantone 188 C, oro Pantone 618 C y Cool Gray 7C), sin el violeta, el naranja, el verde ni el ámbar del Figma, y sin desequilibrar el diseño.

**Decisión:** el rojo de error se mantiene como **excepción de accesibilidad** (confirmada por el candidato): se lee como error en cualquier contexto y el granate ya significa "dinero recibido". Se corrió hacia el tono del granate (`#B32D32`) y quedó bien separado de él en claridad.

**Qué se hizo**

- Todos los colores ya eran tokens en `globals.css`, así que se cambiaron los **valores**, no los nombres: los componentes y sus tests (`text-subscription`, `bg-sent-soft`…) no se tocaron.
- Suscripción y pendiente → oro oscurecido (`#6F5C14`); enviado → Cool Gray oscurecido (`#5E5D61`); completado → granate; recibido sigue granate. Los azulejos son 25 % del color oficial sobre blanco, como `primary-soft`.
- Texto principal y fondo pasaron a neutros sobre el tono del Cool Gray (`#1B1A1D`, `#F9F9FA`), sin el tinte azul del Figma. `APP_BACKGROUND_COLOR` (barra del navegador y manifest) se actualizó con el CSS.

**Cómo se verificó:** test primero. `src/app/brand-palette.test.ts` lee `globals.css`, resuelve los `var()` y verifica (1) que cada token tenga un valor de la lista permitida, (2) que todo token no neutro esté en el tono del granate o del oro (salvo la familia `danger`) y (3) que cada par texto/fondo llegue a 4,5:1. Falló (9 tests en rojo) antes de cambiar el CSS y pasó después; 729 unitarios en verde. Todos los pares de texto de los roles quedan entre 5,2:1 y 17,3:1. Revisado dentro del primer tramo de T12b.

**Commits:** `ab2c023`

#### T12b-A — UX bloqueante: transferir enfocado y cerrar sesión fuera de la barra (07/10/2026)

**Pedido (auditoría de UX):** en un iPhone (390×844) el "Continuar" del paso del monto y medio "Motivo" quedaban debajo de la barra inferior translúcida; "Cerrar sesión" era la tercera pestaña, en plena zona del pulgar; el monto no agrupaba miles al escribir y la transferencia arrancaba desde la tarjeta en dólares.

**Decisión:** "saldo visible por defecto", que también proponía la auditoría, **no se hizo**: el candidato mantuvo la decisión de T13 (todo oculto por defecto).

**Qué se hizo y por qué**

- **Transferir es una tarea enfocada:** la barra inferior se oculta en `/transferir` (pasos, comprobante, error) y `--nav-clearance` baja a 0 sin ella. La única salida es terminar o "Volver", como en las apps de bancos; la pantalla de error de `/transferir` ganó su propio "Volver".
- **Botón fijo abajo (`StepActions`):** la acción principal de cada paso es `sticky` al fondo con `mt-auto`. Se eligió `sticky` y no `fixed` para que el botón siga en el flujo del documento (orden de foco y lectura naturales). Sube por encima del teclado con `visualViewport`.
- **Deshabilitado claro:** gris plano con texto apagado; antes era el granate al 70 % y parecía tocable.
- **Barra inferior = secciones:** Inicio · Movimientos. "Transferir" no es pestaña: abriría una pantalla sin barra y Enviar/Recibir ya están a un toque en Home.
- **Perfil:** las iniciales en el header de Home abren una hoja inferior (`<dialog>` modal nativo: foco atrapado, Escape, devuelve el foco) con nombre, email y "Cerrar sesión", que pide confirmación. Se reutiliza la misma Server Action `logout`. _Revertido en T29 por decisión del candidato: la hoja y el avatar se quitaron y "Cerrar sesión" volvió a la barra inferior._
- **Monto con miles al escribir:** `editAmount` reescribe el texto en cada tecla y recalcula el cursor; solo cambia la vista, lo que muestra se parsea igual con `parseAmount`.
- **Tarjeta por defecto:** la de pesos, la de todos los días.

**Cómo se verificó:** rojo → verde en `defaultSourceCardId`, `editAmount` (43 casos), el monto en `TransferFlow`, `BottomNav`, `ProfileMenu` y `keyboardInset`. E2E nuevo `focused-flows.spec.ts` (sin barra en el flujo, cada botón visible y sin nada encima con `elementFromPoint`, cerrar sesión desde la hoja); falló 3 de 4 antes del cambio. Revisado en los tramos de T12b (ver T12b-D).

**Commits:** `8f218f9`, `e93d4c3`, `14a0787`, `a4d3c6a`, `66bb932`, `d3f3228`

#### T12b-D — Lista de movimientos agrupada y montos con signo (07/10/2026)

**Pedido (auditoría de UX):** cada fila era su propia tarjeta con sombra (entraban ~3 filas sobre la barra), una lista de 20 filas no tenía fechas y los montos sin signo, coloreados por tipo, no dejaban leer qué entra y qué sale.

**Decisión:** **el candidato revirtió la decisión del 06/10 (T7d)**: se prioriza la legibilidad de la lista sobre la fidelidad al Figma en este punto.

**Qué se hizo**

- **Superficie agrupada:** las filas de Home y Movimientos comparten una superficie blanca (`grouped-list`) con separadores de 1 px que arrancan después del ícono. Filas de ~64 px que se tiñen al pasar el mouse en lugar de elevarse.
- **Días en Movimientos:** `groupMovementsByDay` agrupa por día calendario de Buenos Aires: "Hoy", "Ayer", "5 de octubre", y el año solo si no es el actual. Los encabezados quedan pegados debajo del buscador y los chips (`StickyFiltersHeight` publica su alto en una variable CSS). "Hoy" lo decide el servidor una vez, así el navegador no nombra distinto un día al hidratar. Una tanda de "Cargar más" que continúa un día se suma a su grupo.
- **Home** usa un solo grupo, sin encabezados: cinco filas partidas en días se leerían como fragmentos.
- **Signo por dirección:** sale → `−` (U+2212), entra → `+`. Entra solo `RECEIVED`; salen `SENT` y `SUBSCRIPTION`. El monto es granate si entra y tinta si sale; el color del tipo queda en el ícono. El detalle usa la misma convención.

**Cómo se verificó:** rojo → verde en `dayOf`/`formatDayLabel`, `groupMovementsByDay` y las filas con signo, tono y lectura ("menos 95 dólares"). E2E de encabezados pegados y de días sin repetir tras "Cargar más". Al integrar T12b (A, B y D): 816 unitarios y 76/76 e2e, incluidos los que mueven dinero; la revisión de alto riesgo excedió el presupuesto como un solo candidato y se partió en 4 tramos, todos aprobados; 12 observaciones pasaron a T22.

**Commits:** `1ea74a5`, `3befcc6`

#### T12b-C2 — Tarjetas en español y segunda tarjeta en oro (07/10/2026)

**Pedido:** las tarjetas decían "Balance" y "Exp. Date", el número oculto usaba asteriscos y la segunda tarjeta era rosa, fuera de los colores del club.

**Qué se hizo**

- **Etiquetas en español:** "Saldo" y "Vence".
- **Número oculto con viñetas:** `•••• •••• •••• 1234`, agrupado 4-4-4-4 como el revelado (`formatMaskedCardNumber`). La viñeta queda en el centro óptico de los dígitos, sin corrimiento.
- **Segunda tarjeta en oro satinado** (`card-gold` `#DCCA8E`, sombra `#CDB66A`, etiquetas `#4D4219`). Se descartó una tarjeta grafito: la marca de Visa va en su azul oficial y sobre un fondo oscuro no se leería. Con el oro, las dos tarjetas son los dos colores del club; el chip de moneda toma el otro color.

**Cómo se verificó:** rojo → verde en `formatMaskedCardNumber`, `PaymentCard`, `CardReveal` y `brand-palette.test.ts` (tokens nuevos y contrastes: texto 9,0:1 / 7,3:1, etiquetas 6,1:1 / 5,0:1, Visa 8,7:1 / 7,1:1). Sin cortes de 240 a 390 px.

**Commits:** `b8ce6ed`

#### T12b-C3 — QR en Recibir y errores del login sobre granate (07/10/2026)

**Pedido (auditoría de UX):** Recibir no tenía QR y su recuadro informativo era un cuarto estilo de superficie; en el login, el aviso de credenciales incorrectas era un recuadro rosa pálido con texto rojo sobre el granate.

**Decisión:** el QR es **texto plano** a propósito (`GranaBank` / `Alias: …` / `CVU: …`); no se imita un QR interoperable de pagos, que emite un adquirente registrado. Librería `uqr` (sin dependencias); se descartó `qrcode` por sus tres dependencias.

**Qué se hizo**

- `receiveQrPayload` (dominio, puro) arma el contenido y rechaza un alias o CVU inválido. `QrCode` lo dibuja en el servidor como un solo `<path>` SVG, granate sobre blanco, zona de silencio de 4 módulos, corrección H y sin logo.
- El recuadro informativo pasó a una nota sin fondo con el ícono en el azulejo suave.
- **Login:** el aviso es un recuadro granate oscuro translúcido con texto `#FFB4AB` (8,2:1 en la zona más clara del fondo, 9,9:1 en la más oscura); los errores de campo usan el mismo color e ícono. Se mantienen `role="alert"` y el mensaje genérico.

**Cómo se verificó:** rojo → verde en el payload, la matriz → path SVG, `QrCode` con `role="img"` y el aviso del login; `brand-palette.test.ts` suma el contraste del aviso compuesto.

**Commits:** `18fac3a`, `65dda61`

#### T12b-C1 — Barra de navegación tipo iOS y acciones en el detalle (07/10/2026)

**Pedido (auditoría de UX):** la píldora "Volver" con sombra pesaba más que el contenido, y el detalle era un callejón sin salida que además repetía el estado.

**Qué se hizo**

- **`NavBar`:** chevron de 44×44 con nombre "Volver", título corto centrado y un lugar a la derecha ("Paso 2 de 3"). Se pega arriba y se vuelve vidrio con el scroll. Conserva el link real, el prefetch completo y los tipos de transición. Se borraron `BackLink` y `back-control.ts`.
- **Detalle:** se sacó la fila "Estado" (queda la etiqueta junto al monto) y se agregó una lista de acciones: compartir comprobante (Web Share API, o copiar con "Copiado"), copiar referencia y repetir transferencia.
- **Repetir:** solo para transferencias enviadas a una cuenta con alias. Lleva a `/transferir?to=alias`; el servidor valida el alias con las reglas del formulario (nunca un CVU en una URL) y lo resuelve como la búsqueda del paso 1.

**Cómo se verificó:** rojo → verde en `NavBar`, `MovementActions`, `movementShareText`, `parseTransferTo`/`resolveTransferPrefill`, el detalle y `TransferFlow` con prefill. Integración: `findById` trae el alias solo del lado que envía. E2E: chevron ≥ 44 px, un estado, copiar, repetir; `?to=` con un CVU o el alias propio se ignora.

**Commits:** `7c70f56`, `df99739`

#### T12b-C — Integración de C1, C2 y C3 (07/10/2026)

**Pedido:** integrar las tres ramas paralelas, que salieron de la misma base, en orden C2 → C3 → C1.

**Qué se hizo**

- El único conflicto fue esta bitácora; quedaron las tres entradas.
- "Copiar" al lado de cada valor en Recibir, dentro del mismo `<dd>`.
- CVU agrupado de a cuatro desde el final (`28 5059 0940 0904 1813 5201`), así nunca termina en un par suelto y el último grupo son los 4 dígitos que deja ver el enmascarado. Un solo formateador (`groupForReading`) para los dos.
- Esqueleto de Recibir con el marco de la `NavBar`.

**Tests que fallaban bajo carga:**

- `card-flip.spec.ts` fallaba 9 de 10 con 12 workers: el test tocaba la tarjeta antes de que llegaran las tarjetas y terminara la transición. Ahora espera ambas cosas: 50 de 50.
- La intro de marca podía quedar montada (1 en 95 con 12 workers): el `animationend` podía perderse durante la hidratación. Ahora también se desmonta con la promesa `finished` de la animación (test unitario primero).
- "Toques durante una transición" falló 1 de 5 solo con 12 workers en 12 núcleos; en una máquina tranquila pasa siempre. Queda anotado, sin cambios.

**Cómo se verificó:** 874 unitarios, 54 de integración y 78/78 e2e, incluidos los que mueven dinero. Revisión de alto riesgo partida en 3 tramos, todos aprobados; 12 observaciones pasaron a T22.

**Commits:** `95e5c36`, `59366b8`, `9e5bc65`, `7fefb64`, `4ecb477`, `2128ab3`, `32fcfd2`

---

### Fase 4 — Movimiento

#### T6 — Animaciones y valor agregado (05/10/2026)

**Pedido:** animaciones con sentido, ocultar el saldo y un resumen del mes.

**Decisión:** cada animación *comunica* algo (de dónde viene un elemento, que algo cambió, que se tocó un botón). Duran entre 150 y 300 ms, animan solo `transform` y `opacity` y **se desactivan con "reducir movimiento"**, con tests que lo verifican. No se agregaron librerías.

**Qué se hizo**

| Feature | Decisión y por qué |
|---|---|
| Tokens de movimiento en `globals.css` | Duraciones y curvas definidas una sola vez. |
| Feedback al tocar | Filas, chips y botones se achican a 0,97. |
| Esqueletos con brillo | Indican que algo está cargando y no que la pantalla está rota. |
| Ícono que viaja de la lista al detalle | React `<ViewTransition>`, incluido en el App Router de Next 16. Solo se anima el par tocado. |
| Filas que entran escalonadas | Solo cuando una fila se inserta; nunca se repite en un re-render. |
| Saldo que cuenta hacia arriba | El último cuadro usa el formateador real; los lectores de pantalla solo escuchan el valor final. |
| Ocultar saldo | Preferencia en una cookie que lee el servidor, para que el saldo oculto nunca parpadee visible. (Reemplazado en T13 por datos bajo demanda.) |
| Resumen del mes | Ingresos = recibidos; egresos = enviados + suscripciones; solo completados. La base suma con `groupBy` sobre `Decimal` y los centavos se combinan como enteros. El mes empieza a medianoche de Buenos Aires. Endpoint `GET /api/movements/summary?month=AAAA-MM`. |

**Limitación de entonces:** con el saldo oculto, el valor igual viajaba en los datos de la vista. T13 la eliminó: ahora el saldo no está en el HTML inicial.

**Cómo se verificó:** unitarios 263/263 · integración 21/21 · e2e 24/24 (dev y producción) · build ✅. Video en `docs/screenshots/motion-demo.webm`. Seguimientos (T6b): el mes del resumen se limita a 2000-01…2100-12 (`da04d2d`), el hover de las filas respeta "reducir movimiento" (`4eb6814`) y los tests son deterministas (`8a67dfd`). Un test del saldo **pasaba por casualidad** (verificaba `0.00` porque la animación no avanzaba en jsdom); ahora verifica el saldo real. **T6 no tiene una revisión registrada** (ver Proceso y verificación).

**Commits:** `5a6ed87`…`dd9eb60` (11), `ee38e35`, `da04d2d`, `4eb6814`, `8a67dfd`, `cb048be`

#### T7a — Versión premium (06/10/2026)

**Pedido:** integrar la rama `feat/premium-motion`, hecha en un worktree aparte y nunca integrada.

**Decisión:** en T6 se evitó sumar librerías; aquí se agrega `motion`, porque la física de resortes es difícil de lograr bien a mano. Se carga por partes (`LazyMotion`) y respeta "reducir movimiento".

**Qué se hizo:** integración con *fast-forward*, sin conflictos.

| Feature | Qué aporta |
|---|---|
| Tarjeta "viva" | Se inclina con el dedo o el mouse, con un brillo que la recorre; el carrusel tiene profundidad. |
| Saldo tipo odómetro | Los dígitos ruedan como un contador mecánico; reemplaza al conteo lineal de T6. |
| Header de vidrio y nav con indicador | El header se vuelve translúcido al hacer scroll; la píldora granate se desliza a la pestaña activa. |

**Cómo se verificó:** suites completas tras el fast-forward; la regla de `.gitignore` asociada (`c5cf5b4`) se revisó y aprobó.

**Commits:** `fa9be8c`, `fd70aa2`, `e1cac02`, `b8f428d`, `449eb72`, `3c15bde`

#### T15c — Enviar y Recibir se expanden en su pantalla (06/10/2026)

**Pedido:** disimular la latencia con movimiento, sin demorar nunca contenido que ya está listo.

**Qué se hizo:** un *container transform* (React `ViewTransition` compartido, 280 ms) hace crecer el acceso rápido hasta la pantalla de destino, y "Volver" lo achica de vuelta (`94b8b6e`). Los destinos están precargados por completo, así el par existe en el momento del cambio. Con movimiento reducido el cambio es instantáneo.

**Cómo se verificó:** e2e del cierre del morph. **Sin revisión registrada (forma parte de T15).**

**Commits:** `0ada6f9`, `94b8b6e`

#### T20 — Navegación tipo iOS (06/10/2026)

**Pedido:** que la navegación se sienta de iOS/macOS.

**Qué se hizo:** push y pop deslizan la pantalla sobre la anterior con paralaje (tipos de transición `nav-forward`/`nav-back`); las pestañas cambian con un fundido; header y barra inferior quedan quietos; los esqueletos se disuelven en el contenido; una intro de marca se reproduce una vez en la carga en frío sin demorar el LCP. Los morphs existentes se componen con esto. El botón atrás del navegador sigue sin animación (limitación de React, ver T7).

**Cómo se verificó:** e2e 70/70 cuatro veces y LCP sin cambios. Revisión con 4 enfoques aprobada. Un arreglo posterior (`273c6fc`): sin `document.activeViewTransition` (Safari, Firefox), el guard de toques suponía una transición siempre en curso y podía robar toques; ahora "desconocido" significa "no".

**Commits:** `20c027c`, `98ed24c`, `273c6fc`, `f5d0540`

#### T12b-B — Un solo lenguaje de movimiento (07/10/2026)

**Pedido:** el movimiento tenía que sentirse de iOS, no de demo: había ~9 duraciones, 3 curvas, 6 resortes (varios con rebote) y efectos decorativos.

**Decisión: un solo lenguaje** (`globals.css` + `shared/ui/motion/tokens.ts` / `springs.ts`):

| Token | Valor | Uso |
| --- | --- | --- |
| `fast` | 160 ms | presión, fundidos, máscara del saldo, esqueleto que se va |
| `base` | 280 ms | contenido que llega (filas, reveal, contenedor, trazo del check) |
| `nav` | 400 ms | pantalla entera (push / pop) |
| curva | `cubic-bezier(0.32, 0.72, 0, 1)` | la única curva (la de iOS) |
| `SPRING` | 300 / 35 (ζ ≈ 1,01) | todo lo que mueve el dedo: inclinación, vuelta, píldora, punto del carrusel |
| `ROLL_SPRING` | 170 / 24 / 0,9 (ζ ≈ 0,97) | excepción: rodillo del saldo (pasa millonésimas, invisible) |

No son duraciones (y se documentan así): el escalonado de filas (40 ms), el período del brillo del esqueleto (1,4 s) y la espera de la intro (420 ms).

**Qué se hizo**

- Se quitaron: el barrido de luz de 1,2 s sobre la primera tarjeta; el `blur` en transiciones (ahora opacidad + 4 px); los rebotes (todo pasa al resorte crítico; el check de éxito se dibuja en ~280 ms); el fundido + escalado al cambiar de pestaña; las filas que volvían a entrar con cada filtro (ahora solo la primera lista, hasta 6 filas).
- Se mantuvieron: push/pop con paralaje, rodillo del saldo, píldora, vuelta de tarjeta, presión a 0,97, esqueleto → contenido y todos los modos de movimiento reducido.
- La hoja de perfil (quitada en T29) y los pasos de transferir usan los tokens compartidos.
- La intro de marca se desmonta aunque su disolución termine antes de hidratar (`5937865`).

**Cómo se verificó:** rojo → verde en `tokens.test.ts` (3 duraciones, 1 curva, sin tiempos sueltos, sin `blur` en keyframes), `springs.test.ts` (ζ ≥ 1 salvo el rodillo), `row-entrance.test.ts` y el saldo sin desenfoque. Los e2e que fijaban el comportamiento viejo se reescribieron para el nuevo. Revisado en los tramos de T12b (ver T12b-D).

**Commits:** `5937865`, `38508a5`, `225ba72`, `c22c3bb`, `cf1d1ae`, `34513fc`

#### T23 — Motion v2: manipulación, no navegación (07/10/2026)

**Pedido:** que el movimiento se sienta como desplazar cosas con el dedo y no solo como tocar botones, inspirado en una referencia de video elegida por el candidato: Home que se construye desde un contenedor que sube, un carrusel arrastrable de destinatarios, el paso del monto que se transforma en su lugar y una sola superficie sin cortes de pantalla. El candidato eligió los tres paquetes: M1 (transferencia continua), M2 (gestos globales) y M3 (coreografía de Home e inercia de las tarjetas).

**Decisión:** el saldo sigue oculto por defecto (T13); el conteo se reproduce al revelarlo, nunca al cargar. Cada gesto tiene un equivalente sin gesto (botones o teclado).

**Qué se hizo** (tres ramas en paralelo, integradas en orden transferencia → gestos → Home):

- **Transferir en una sola superficie:** "Recientes" es una tira que se arrastra (la ficha centrada crece, las vecinas asoman), la ficha elegida viaja al encabezado, sube un teclado numérico propio y el botón fijo cambia de texto sin ser reemplazado. Con teclado: flechas, Inicio/Fin, Enter y dígitos.
- **Gestos compartidos:** deslizar desde el borde izquierdo para volver (detalle, Recibir) y bajar las hojas inferiores con el dedo para cerrarlas. _La única hoja era la de perfil; en T29, por decisión del candidato, se quitó junto con su gesto de arrastre._
- **Home se construye una vez** detrás de la disolución del escudo, y las tarjetas se empujan con el dedo con inercia.
- **Una sola física** en `shared/ui/gestures/drag-physics.ts`: seguimiento 1:1, banda elástica de iOS (0,55), velocidad del dedo en sus últimos 100 ms, proyección con la desaceleración de un scroll de iOS y asentamiento críticamente amortiguado que nunca se pasa de su lugar. Antes había tres copias; las tarjetas conservan lo suyo (el lanzamiento que gira una sola tarjeta y una resistencia de borde más tenue).
- **Seed con destinatarios:** cinco personas ficticias con tarjeta en dólares y en pesos, y transferencias pasadas hacia ellas, para que "Recientes" tenga seis fichas. Los saldos del seed no cambian: son datos fijos que los e2e verifican, no la suma de los movimientos.
- **Integración:** un solo conflicto, en `e2e/fixtures/layout-audit.ts` (las dos ramas agregaron una excepción para contenido que sale de la pantalla a propósito); se conservaron las dos.

**Tests inestables bajo carga:** corriendo en paralelo, algunos e2e perdían su primer toque. Se arreglaron sin aflojar ninguna aserción: un fixture compartido espera a que Home termine de llegar y construirse; el ojo de una tarjeta fuera de pantalla se trae al frente con su punto antes de tocarlo; el botón fijo se comprueba cuando la pantalla ya se asentó; los lanzamientos se envían con marcas de tiempo propias. En la física, la velocidad al soltar dejaba de valer cero de golpe a los 50 ms de reposo; ahora decae con la pausa.

**Cómo se verificó:** rojo → verde en hasta seis recientes, la pausa antes de soltar que frena el lanzamiento y la proyección compartida de las tarjetas. 994 unitarios, 54 de integración y 106/106 e2e; gestos tres veces con un worker (153/153) y la suite en paralelo cuatro veces (168/168, dos veces). Revisión en 5 tramos, todos aprobados; 23 observaciones no bloqueantes (13 advertencias) pasaron a T26.

**Commits:** `0860957`, `bbeb7dc`, `e405684`, `d68ff1a`, `28ee606`, `20e4285`, `8a57840`, `74b52e4`, `0b4c509`, `8375e58`, `90f3fef`, `6305bbc`, `b443c69`, `92f08bf`, `c9682bb`, `07c6e69`

---

### Fase 5 — Legibilidad y cierre

#### T11 — Checklist, tokens y pantallas para Figma (07/10/2026)

**Pedido:** verificar el enunciado contra el build actual y llevar el sistema visual a Figma sin copiar valores a mano.

**Qué se hizo**

- **Checklist:** 42 puntos verificados con evidencia; se corrigió una contradicción del README (`f135f51`, `a668497`).
- **`pnpm tokens:figma`** lee los bloques `@theme` y `:root` de `globals.css` y escribe `design/tokens.figma.json` en formato DTCG (colores en hex final, sombras, familias tipográficas, duraciones y la curva). La descripción de cada token sale del comentario que tiene arriba en el CSS. Salida determinista.
- **Un solo resolvedor** (`src/shared/lib/design-tokens.ts`) para `var()`, `rgb()` y `color-mix()`; `brand-palette.test.ts` usa el mismo.
- **`--check`** falla si el JSON commiteado quedó viejo; un test hace lo mismo dentro de `pnpm test`.
- **`pnpm screens:capture`** (Playwright) guarda 18 PNG de 390×844 @2x en `design/screens/` (sin versionar). Solo envía una transferencia con `CAPTURE_ALLOW_MUTATION=1`, y se niega si `DATABASE_URL` no es una base `_test`.
- **Archivo de Figma** armado con esos insumos: portada y fundamentos, las 18 pantallas y un antes/después, con variables de color y movimiento, estilos de efecto y de texto.

**Cómo se verificó:** rojo → verde en el parser, el resolvedor (cadenas de `var()`, alfa, `color-mix()`, ciclos), sombras, agrupado DTCG, orden y detección de archivo viejo. La captura se verificó contra `next start` sobre `granabank_test`, mirando las imágenes. 894 unitarios. Revisión de alto riesgo aprobada; 6 observaciones pasaron a T22.

**Commits:** `f135f51`, `a668497`, `f6a5d3b`, `be36118`, `4695cc9`

#### T22 — Pase de legibilidad (07/10/2026)

**Pedido:** los evaluadores van a leer sobre todo el código; que se lea de arriba hacia abajo antes de entregarlo, sin cambiar lo que hace.

**Decisión:** cambios que preservan el comportamiento, sin debilitar aserciones; nombres por intención en lugar de comentarios; los comentarios que quedan explican el porqué, no la historia del cambio. Cada bug encontrado se arregla junto con el test que lo reproduce. Cinco ramas en paralelo, una por área, integradas en orden herramientas → shared → auth/cuenta → movimientos → transferencias, sin conflictos.

**Qué se hizo**

- **Herramientas:** `globals.css` en secciones con título; fixtures compartidos en `e2e/fixtures`; los e2e y la captura esperan condiciones reales en lugar de tiempos; el seed declara las tarjetas de cada usuario como datos; tests que fallan si un token de color se declara dos veces o si el ícono se aparta del escudo oficial.
- **Shared:** formas del monto con nombre, helpers de dinero y fechas más planos; tests nuevos: el QR decodifica a su contenido en nivel H y la barra se vuelve vidrio al scrollear.
- **Auth y cuenta:** los grupos enmascarados salen del mismo formateador; handlers y efectos con nombre.
- **Movimientos:** filtros en su propio módulo, helpers de dominio por intención; tests del límite de las fechas del seed (independiente del huso), del respaldo de compartir y del tope del escalonado inicial.
- **Transferencias:** la máquina de estados del envío se lee de arriba hacia abajo; pasos partidos en piezas de presentación con nombre; la transacción con pasos nombrados; pantalla "sin tarjeta" extraída.
- **Integración:** se borró una sombra sin usos, valores exportados que solo usaba su módulo pasaron a privados y el README suma un "Tour del código".

**Bugs que encontró el pase:**

- **Borrar sobre un punto abierto** en el monto: con `12.|`, retroceso volvía a escribir el punto. Ahora lo quita (`12.|` → `12|`).
- **`color-mix()` sin normalizar** en la exportación a Figma: porcentajes que no suman 100 % ahora se escalan como dice CSS Color 5; sumas en cero o fuera de rango se rechazan.
- **QR de Recibir con identificadores inválidos:** un alias o CVU guardado inválido rompía la pantalla. Ahora no se muestra el QR y la pantalla sigue con los datos.

**Cómo se verificó:** 924 unitarios, 54 de integración y 79/79 e2e dos veces. Revisión en 5 tramos, todos aprobados; quedaron 9 sugerencias y 1 advertencia no bloqueantes.

**Commits:** `21c82f8`…`2f06347` (35), entre ellos `e4bb0c6` (punto abierto), `fdb85bb` (`color-mix()`) y `1d8e9d7` (QR)

#### T24 — Sin referencias a documentos externos (07/10/2026)

**Pedido:** que no quede ninguna referencia a documentos externos de marca, ni en la documentación ni en el código.

**Qué se hizo:** README, esta bitácora y el checklist (`b639361`); después comentarios, tests y descripciones de los tokens exportados a Figma (`d0d3f21`), que describen los colores como los institucionales del club y el escudo como su vector oficial. Los mensajes de commit del historial local también se reescribieron (solo los mensajes; el código no cambió), por eso los hashes de esta bitácora son los actuales.

**Decisión:** el club autorizó el uso de sus recursos de marca para este challenge. Su tipografía comercial no estuvo disponible en un formato utilizable, por eso se eligió una alternativa libre (T25).

**Cómo se verificó:** búsqueda de las referencias en todo el repositorio y en los mensajes del historial; `pnpm tokens:figma --check` en verde con el JSON regenerado.

**Commits:** `b639361`, `d0d3f21`

#### T25 — Tipografía de display: Rokkitt (07/10/2026)

**Pedido:** una tipografía de display para el logotipo, los títulos y los montos grandes.

**Decisión:** Rokkitt (Google Fonts, licencia OFL, variable 100–900), elegida por comparación visual como la alternativa libre más cercana a la tipografía del club. Reemplaza a Arvo; Poppins sigue en toda la interfaz.

**Qué se hizo:** se carga una vez en el layout raíz (`--font-display`). La usan el logotipo (en negrita), el título de la barra de navegación, los encabezados de pantalla y los montos grandes (saldo de la tarjeta, monto a transferir, detalle). Medida en Chromium, su altura de x es 0,40 em (Poppins 0,55) y sus dígitos 0,60 em (Poppins 0,74): títulos 2 px más grandes, montos 4 px. Sus dígitos son proporcionales y sin variante tabular, con márgenes laterales parejos, así que el odómetro dejó la corrección óptica que necesitaba el "1" de Poppins y la máscara se alineó al centro de los nuevos dígitos.

**Cómo se verificó:** test primero: la familia de display exportada es Rokkitt. Un e2e nuevo registra cuadro a cuadro la posición y el ancho de cada columna del odómetro y exige que no cambien mientras rueda. Revisado dentro de los tramos de T23.

**Commits:** `ee3e709`, `01020cf`, `51139a8`, `93a853c`

#### T26 — Pase sobre las observaciones de T23 (07/10/2026)

**Pedido:** revisar una por una las observaciones no bloqueantes de T23 antes de la entrega.

**Decisión:** cada observación se verifica primero; después se corrige con un test que falla antes, se fortalece el test, o se refuta con evidencia. Tres ramas en paralelo: transferencias (7 puntos), gestos y fixtures de e2e (12) y seed + bitácora (4).

**Qué se hizo (6 bugs reales, corregidos con test primero):**

- **Carrusel de recientes:** un asentamiento en curso ya no se traga un alias escrito en el campo (la tira se redirige a esa ficha), y mientras se busca un destinatario, arrastrar o usar las flechas ya no elige a otra persona (`cc772aa`).
- **Teclado:** la pulsación larga de borrar se cancela si el teclado se desmonta con el dedo apoyado, y una pulsación que termina fuera de la tecla ya no anula el siguiente borrado (`b46ec73`).
- **Gestos:** una presión de mouse que salía del elemento antes de convertirse en arrastre bloqueaba todos los arrastres siguientes; ahora una presión nueva la reemplaza (`b4ed103`).
- **Deslizar para volver con bfcache:** si la vuelta terminaba en una carga completa, la pantalla quedaba corrida y sin gestos; ahora vuelve a su lugar en el `pageshow` persistido (`43a58ee`).
- **Auditoría de layout de los e2e:** `overflow-x: hidden` solo hace que `overflow-y` sea `auto`, así que la excepción pensada para las tarjetas eximía cualquier contenedor que ocultara un desborde, justo lo que la auditoría busca. Ahora las tarjetas se declaran explícitamente (`47bb605`).
- **Seed:** los movimientos del segundo usuario y de los destinatarios se cuentan desde los datos en lugar de un número fijo, y la transacción tiene más tiempo que los 5 s por defecto de Prisma (`28cc013`).

Además: tests que miden en lugar de copiar constantes, un sondeo del tirón de borde de las tarjetas, la prueba de que un arrastre vertical nunca las mueve, reabrir una hoja después de bajarla (test quitado en T29 con la hoja), y la lista de excepciones de las tarjetas al modelo compartido de gestos.

**Cómo se verificó:** 1007 unitarios, 54 de integración y 113/113 e2e. Revisión de alto riesgo aprobada. Quedan 3 observaciones menores abiertas (ver Limitaciones conocidas).

**Commits:** `28cc013`, `bdeb9b6`, `cc772aa`, `b46ec73`, `4ea8e5f`, `b4ed103`, `43a58ee`, `47bb605`, `20a0053`, `9cd0ff1`, `81f2985`, `b462d26`, `ff12385`

#### T29 — Vuelta al diseño: Recibir, cerrar sesión y escudo del login (07/10/2026)

**Pedido:** en un iPhone (390×844) la barra inferior tapaba la mitad del QR de Recibir hasta hacer scroll; "Cerrar sesión" tenía que volver a donde estaba en el diseño original, no en los datos del cliente; y sacar las estrellas del escudo del login.

**Decisión:** seguir el diseño original. El cierre de sesión vuelve a la barra inferior como tercer ícono, sin confirmación (el diseño no tiene); como es un botón, solo se activa con un toque, nunca con un arrastre. El escudo del login es el oficial sin estrellas, sin recolorear: sobre el fondo granate se apoya en un disco blanco.

**Qué se hizo:**

- **Recibir:** el QR pasa justo debajo del alias y el CVU que codifica, antes de "Compartir mis datos", y se ajustaron los espacios (y el QR a 192 px), así que entra entero sobre la barra sin scroll; queda a 18 px de ella (`a32c541`).
- **Cerrar sesión:** botón de la barra inferior que envía la Server Action `logout` (la inyecta el layout). Se quitaron el avatar del header de Home, la hoja de perfil, el componente de hoja inferior (no quedaba otro uso), su CSS y su regla de arrastre (`3cc6c13`).
- **Escudo del login:** `escudo.svg` sobre un disco blanco con sombras teñidas de granate; se borraron los dos SVG con estrellas y sus entradas y tests (`32e856b`).

**Cómo se verificó:** rojo → verde en el e2e del QR (su borde inferior estaba en 917 px con la barra en 764), en `BottomNav` (tres ítems, el último "Cerrar sesión", que llama a la acción) y en el escudo del login. E2E nuevos: cerrar sesión desde la barra con un toque, un arrastre que sale del botón no cierra la sesión, y Home sin avatar; se quitaron los de la hoja de perfil. 998 unitarios y 108/108 e2e sobre el build de producción; formato, lint y typecheck limpios. Capturas a 390×844 de login, Home y Recibir revisadas.

**Commits:** `a32c541`, `3cc6c13`, `32e856b`, `1166ddf`

#### T30 — Buscador de destinatario (07/10/2026)

**Pedido:** en el primer paso de Transferir, buscar al destinatario por nombre, alias o CVU en un solo campo, en lugar de un campo de alias o CVU separado de los recientes.

**Decisión:** un solo campo, "Buscar por nombre, alias o CVU", que filtra el carrusel de Recientes en el navegador y elige la primera coincidencia. Si lo escrito es un alias o CVU válido que no es de un reciente, ofrece buscarlo en el servidor ("Buscar «…»"), también junto a coincidencias parciales. Arrastrar el carrusel elige sin reescribir la búsqueda.

**Qué se hizo:**

- **Búsqueda:** coincidencia sin mayúsculas ni tildes, un CVU por sus últimos dígitos visibles (con o sin espacios), y la detección de cuándo lo escrito merece una búsqueda en el servidor, con las reglas del servidor (`2a4eeb6`).
- **Carrusel:** se recentra cuando la búsqueda achica la lista (`f90d971`).
- **Paso 1:** el campo es un combobox sobre el carrusel; sin coincidencias lo dice ("Sin coincidencias en tus recientes") y el lector de pantalla escucha cuántos recientes quedan (`bbf75dc`). El subtítulo pasa a "Buscá por nombre, alias o CVU, o elegí de tus recientes." (`ed62b15`).

**Integración con T29:** las dos ramas se aplicaron sin conflictos. Al juntarlas:

- **Base de tests reservada:** dos corridas de e2e a la vez (o una corrida y `pnpm db:test`) se recargaban el seed una a la otra: la primera perdía saldos y búsquedas a mitad de los tests, y eso parecía una carrera de la app. Reproducido recargando el seed durante una corrida (5 de 16 fallaron: el saldo seguía oculto o faltaba un elemento); ahora cada corrida toma un lock de PostgreSQL y la segunda falla enseguida (`789f8a4`).
- **Tests inestables:** dos toques llegaban mientras la pantalla todavía se revelaba (una transición de vista no recibe toques): la fila del movimiento enviado (4 de 8 con la CPU saturada) y el ojo de la tarjeta después de volver a Home (`a7d5478`). Y pegar "adobe" en el buscador de Movimientos mientras el resumen y la lista se revelan deja el texto en el campo sin que React reciba el cambio, así que la búsqueda nunca sale (2 de 220 corridas, visto con una sonda instrumentada); el test espera a que la pantalla se asiente: 0 de 200 (`3e8b928`).
- **Tests explícitos:** los e2e encuentran el buscador por su rol y nombre completo, no por "Alias o CVU" como subcadena (`d502f18`).
- **Capturas:** `pnpm screens:capture` ya no abre la hoja de perfil (quitada en T29) y suma la búsqueda filtrada y la oferta de buscar un alias: 18 pantallas, verificadas contra la base de tests (`b15276b`).

**Cómo se verificó:** test primero en el subtítulo del paso 1. 1017 unitarios, 54 de integración y 110 e2e sobre el build de producción; formato, lint, typecheck y `tokens:figma --check` limpios.

**Commits:** `2a4eeb6`, `f90d971`, `bbf75dc`, `789f8a4`, `d502f18`, `a7d5478`, `ed62b15`, `b15276b`, `f94c728`, `3e8b928`

#### T31 — Pegar en el buscador durante la animación (08/10/2026)

**Problema:** pegar "adobe" en el buscador de Movimientos mientras el resumen y la lista se revelan dejaba el texto en el campo, pero la búsqueda nunca salía. En T30 el test esperaba a que la pantalla se asentara; un usuario real no espera.

**Causa:** React apaga su sistema de eventos al empezar a confirmar una transición de vista y lo vuelve a encender recién en el callback de `startViewTransition`, cuando el navegador ya capturó la pantalla vieja. Bajo carga, el navegador entrega el `input` del pegado justo en ese hueco: el campo muestra el texto y `onChange` nunca corre (sondeado: 5 de 240 corridas, sin `onChange` y con el valor interno de React todavía vacío). Lo mismo pasa con lo que se escribe antes de hidratar: React conserva el texto en el campo sin avisar.

**Solución:** `MovementSearch` agenda la búsqueda desde el evento `input` nativo del propio campo (un listener en el elemento, que no depende del sistema de eventos de React) y, al montar, adopta el texto que difiere del valor del servidor (`defaultValue`). `onChange` solo refleja el texto, para que React no vuelva a poner el anterior.

**Cómo se verificó:** test primero. Dos unitarios (un `input` que React no ve y texto escrito antes de hidratar) y dos e2e en `e2e/search-paste.spec.ts` que ponen el pegado exactamente en ese hueco y antes de hidratar: rojos antes del arreglo (3 de 3 y 1 de 1), verdes después (20 de 20 con `--repeat-each=10 --workers=4`). Se quitó la espera de `movements.spec.ts`: el recorrido completo pasó 200 de 200 con 8 workers. 1019 unitarios y 106 e2e sobre el build de producción; formato, lint y typecheck limpios.

#### T32 — Texto escrito antes de hidratar en el buscador de destinatario (08/10/2026)

**Problema:** el buscador de destinatario de `/transferir` ("Buscar por nombre, alias o CVU") es un campo controlado igual que el de Movimientos, con el mismo riesgo que T31 dejó abierto. Lo que se escribía antes de que la pantalla hidratara quedaba en el campo, pero los recientes no se filtraban ni se elegía ninguno: "Continuar" seguía con el texto vacío.

**Causa:** la misma que T31. React conserva el texto escrito sobre el HTML del servidor sin disparar `onChange`, y el estado de la búsqueda (en `TransferFlow`) se quedaba en "". El hueco de la transición de vista también aplica en teoría, pero hoy no se alcanza en este campo: un sondeo con `startViewTransition` interceptado mostró que mientras el buscador está en pantalla React no inicia ninguna (la única es la navegación que lo trae, antes de insertarlo; la búsqueda del alias y el cambio de paso no animan con transiciones de vista).

**Solución:** el patrón de T31, sin cambiar dónde vive el estado. `RecipientStep` sigue la búsqueda desde el evento `input` nativo del campo (con `useEffectEvent`) y, al montar, adopta el texto que difiere de `defaultValue`. `onChange` solo refleja el texto. Queda local: un hook compartido para dos campos no simplificaba ninguno.

**Cómo se verificó:** test primero. Dos unitarios en `TransferFlow.test.tsx` (un `input` que React no ve y texto escrito antes de hidratar) y un e2e en `e2e/search-paste.spec.ts` que escribe "matias" con los scripts retenidos: rojos antes del arreglo (2 de 2 y 3 de 3, el campo con el texto y los 6 recientes sin filtrar), verdes después (el spec entero 30 de 30 con `--repeat-each=10 --workers=4`). 1021 unitarios y 109 e2e en dev; lint y typecheck limpios.

#### T33 — README con la marca del club y requerimientos (08/10/2026)

**Pedido:** que el README sea una buena primera impresión para los evaluadores: con la identidad del Club Atlético Lanús, completo frente a la app actual y con la prueba de que cada requerimiento de la consigna se cumple.

**Decisión:** encabezado con el escudo oficial (`public/brand/escudo.svg`), el nombre, el lema del Figma y el link al repositorio; una tabla de requerimientos con dónde se cumple cada uno, enlazada a `docs/CHECKLIST.md`; un diagrama de flujo en Mermaid (se renderiza en GitHub y queda como texto revisable, sin imágenes aparte), armado desde las rutas reales y la protección de `proxy.ts`.

**Qué se hizo:** capturas nuevas desde el build de producción a 390×844 @2x (login, Inicio, Movimientos, detalle, los tres pasos de Transferir sin enviar nada, Recibir, filtro y búsqueda vacía); se quitaron las capturas y el video que mostraban la paleta anterior y no tenían otra referencia. Instrucciones de clonado con el repositorio real, el teclado propio del monto en lugar de `inputMode="decimal"`, la búsqueda que no pierde lo escrito (T31, T32) y los conteos de tests al día. El checklist se verificó requerimiento por requerimiento contra el código, con la ruta de cada evidencia.

**Cómo se verificó:** Prettier sobre los tres documentos, cada link relativo del README apunta a un archivo existente y el diagrama se renderizó con `@mermaid-js/mermaid-cli` sin errores de sintaxis.

#### T34 — E2E del destinatario sin contar recientes (08/10/2026)

**Problema:** el e2e de T32 esperaba exactamente un reciente después de escribir "matias". Eso dependía de los datos: el proyecto e2e con escrituras comparte la base y puede sumar recientes.

**Solución:** el test exige que Matías Herrera quede elegido, que todo reciente visible coincida con "matías" y que, al borrar el texto, haya más recientes que antes. Sigue fallando si se ignora lo escrito antes de hidratar: se comprobó quitando esa lectura en `RecipientStep` (Matías Herrera no queda elegido).

**Cómo se verificó:** `--repeat-each=5` en Chromium móvil, 15 de 15.

#### T35 — Índice trigram para la búsqueda de movimientos (08/10/2026)

**Problema:** la búsqueda (`unaccent(columna) ILIKE unaccent('%texto%')` sobre contraparte y descripción) no podía usar ningún índice: un B-tree no sirve para un término en el medio del texto, y `unaccent()` es `STABLE`, así que no se puede indexar su resultado. Con muchos movimientos por usuario, cada búsqueda recorre todas sus filas.

**Solución:** una migración activa `pg_trgm`, crea `immutable_unaccent(text)` (llama a `public.unaccent` con el diccionario explícito, por eso puede declararse `IMMUTABLE`) y dos índices GIN `gin_trgm_ops` sobre `immutable_unaccent("counterparty")` y `immutable_unaccent("description")`. La consulta del repositorio usa la misma función: Postgres solo usa un índice de expresión si la consulta repite esa expresión. El resultado de la búsqueda no cambia (ya ignoraba acentos y mayúsculas). Prisma no describe índices de expresión en el schema; `prisma migrate diff` contra el schema queda vacío, así que no intenta borrarlos. Ambas extensiones están disponibles en Neon.

**Cómo se verificó:** test primero. Un test de integración crea 20 000 movimientos de un usuario dentro de una transacción que siempre se revierte, corre `EXPLAIN` sobre el `WHERE` real del repositorio y exige los dos índices: rojo antes de la migración (`Seq Scan`), verde después (`BitmapOr` sobre `Movement_counterparty_search_idx` y `Movement_description_search_idx`). En la base de desarrollo, con `enable_seqscan = off`, la consulta real muestra `Bitmap Index Scan on "Movement_counterparty_search_idx"`. Términos de menos de 3 letras no generan trigramas y no aprovechan el índice.

**Por qué sin `CONCURRENTLY`:** los índices se crean con un `CREATE INDEX` común, que bloquea las escrituras en `Movement` mientras se construyen. `CREATE INDEX CONCURRENTLY` no puede correr dentro de una transacción y Prisma aplica cada migración dentro de una. Con una tabla chica (la de la demo) el bloqueo dura un instante y es aceptable; con millones de filas en producción convendría crear los índices aparte, con `CONCURRENTLY`, fuera de la migración.

#### T36 — Límites de intentos en PostgreSQL (08/10/2026)

**Problema:** nada frenaba probar contraseñas contra el login ni pedir los datos de una tarjeta una y otra vez. Un contador en memoria no sirve en serverless (cada instancia tiene el suyo) y sumar Redis agregaba un servicio más para la demo.

**Solución:** contadores de ventana fija en una tabla de PostgreSQL (`RateLimitBucket`), la única pieza que comparten todas las instancias. Cada intento es **una sola sentencia** (`INSERT … ON CONFLICT DO UPDATE SET count = count + 1 RETURNING count`), así que pedidos simultáneos no pueden colarse. Login: 5 intentos fallidos por email y 20 por IP cada 15 minutos; el intento se cuenta antes de verificar la contraseña y se devuelve si sale bien, y pasado el límite no se verifica nada ("Demasiados intentos. Probá de nuevo en N minutos.", igual para un email inexistente). Revelado de tarjeta: 10 por usuario cada 10 minutos, 429 con `Retry-After` y un aviso en la tarjeta; cada revelado exitoso queda en una tabla de auditoría (`CardDetailsReveal`). La IP sale de `x-forwarded-for`/`x-real-ip`, que Vercel pisa con la real; sin ese proxy el límite por IP sería solo orientativo y el de email sigue valiendo. Las ventanas viejas se borran en el 1 % de los pedidos, sin cron. Se eligió ventana fija sobre ventana deslizante: una fila por clave en vez de una por intento, a cambio de permitir hasta el doble en el borde entre ventanas.

**Tests sin tropezar con los límites:** los límites no se apagan con una variable de entorno. Los e2e vacían todos los contadores al empezar y los de cada usuario al iniciar sesión. Un primer intento vaciaba **todos** los contadores en cada login y falló: los archivos de e2e corren en paralelo y uno borraba lo que otro estaba contando. Por eso el reseteo quedó acotado al usuario de cada escenario.

**Cómo se verificó:** test primero. Rojo antes de implementar: el 11.º revelado respondía 200 en vez de 429, 6 tests del login (el 6.º intento fallido, por IP, email normalizado, éxito que no cuenta) fallaban y la ruta REST del login fallaba sin el límite. Verde después. Integración contra PostgreSQL: de 25 pedidos en paralelo pasan exactamente 10, ventanas, devolución, limpieza, el 6.º login fallido bloqueado y 10 filas de auditoría para 10 revelados. E2E: el 6.º intento en el formulario muestra el aviso y, con el cupo gastado, el ojo de la tarjeta muestra cuánto esperar y la API responde 429.

#### T36c — Login sin bloqueo por terceros y observaciones de la revisión (08/10/2026)

**Problema:** la revisión de T36 (aprobada, con advertencias) encontró que el límite de 5 intentos fallidos **por email** se contaba igual para todos: cualquiera que conociera un email podía bloquear al dueño de la cuenta durante 15 minutos, incluso con la contraseña correcta. Además, la limpieza de ventanas viejas se esperaba dentro del pedido (y un error ahí lo convertía en 500), una devolución que fallaba hacía fallar un login correcto y la devolución recalculaba la ventana en lugar de usar la del intento.

**Solución:** el límite ajustado pasa a ser **por email + IP** (5 cada 15 minutos): quien lo agota se bloquea a sí mismo. Se suma un tope por email de 50 cada 15 minutos para frenar a quien reparte intentos entre muchas IP, y se mantiene el de 20 por IP. Sin IP, todos esos pedidos comparten un cupo de 5 por email. Un login correcto devuelve cada intento en la ventana en la que se contó; si la devolución falla, se registra y el login sigue. La limpieza corre después de la respuesta con `after()` de Next (en Vercel extiende la invocación con `waitUntil`), nunca rechaza y solo registra el error; fuera de un pedido corre en segundo plano. Limpieza menor: se borró `combineDecisions` (sin uso), la tarjeta usa la ventana de la política en lugar de un 600 escrito a mano y las dos rutas comparten `rateLimitedError` para el 429 con `Retry-After`. En e2e, el reseteo por usuario también vacía los contadores por email + IP y por IP, y el escenario del 429 usa un usuario propio, creado y borrado por el test, en vez del segundo usuario de la demo.

**Cómo se verificó:** test primero. Rojo antes de implementar: 5 tests unitarios del login (un atacante desde otra IP bloqueaba al dueño, el tope de 50, la devolución en su ventana, la devolución que falla, sin IP) y 2 de la limpieza (el pedido esperaba la limpieza; un error en ella lo hacía fallar). Verde después. Integración: un atacante agota el cupo desde una IP y el mismo email desde otra IP sigue verificando la contraseña; la devolución resta en la ventana del intento aunque ya haya empezado la siguiente. Una corrida e2e falló una vez en "el 6.º intento" porque el escenario cruzó el borde de una ventana de 15 minutos (4 intentos en una, 2 en la otra): es el costo conocido de la ventana fija, y la corrida siguiente pasó completa.

#### T36b — Texto de la tarjeta derecho mientras se inclina (08/10/2026)

**Problema:** al inclinar la tarjeta de Home, todo el texto (saldo, número, también revelado, titular y vencimiento) giraba en 3D con la superficie y se veía torcido y con bordes dentados.

**Solución:** la tarjeta pasa a tener dos capas. El arte (degradé, brillo, sombra, banda magnética y logo de la marca) sigue inclinándose y girando en 3D igual que antes. El texto y los controles van en una capa plana encima que nunca rota: con la inclinación solo se desplaza hasta 5 px (paralaje, de los mismos _motion values_), así que se ve nítido. En la vuelta, el texto de cada cara se angosta con la cara y se desvanece antes de que quede de canto (el frente se va antes de ~53°, el reverso aparece después de ~127°), así nunca se ve espejado ni despegado. El orden del DOM, las etiquetas, el botón de vuelta, los ojos y el modo de movimiento reducido no cambian.

**Cómo se verificó:** test primero. Rojo antes de implementar: el test que pide que la superficie que rota no contenga el texto fallaba (no había capa de texto). Verde después. Playwright contra el servidor de desarrollo, a escala 2: capturas en reposo, inclinación máxima (con y sin el número revelado), media vuelta, reverso inclinado y con un dedo en el celular; `getComputedStyle` confirma que la capa de texto tiene solo traslación (`matrix(1, 0, 0, 1, 4.7, -4.6)`) mientras el arte tiene una `matrix3d` con rotación. Los e2e de la tarjeta pasan.

#### T37 — Sesiones revocables (08/10/2026)

**Problema:** la sesión era un JWT firmado sin estado. Cerrar sesión solo borraba la cookie: una copia del token (robada o guardada) seguía sirviendo hasta vencer, hasta 30 días con "Recordarme". Era la limitación de la decisión de T2 (JWT en lugar de sesiones en base).

**Decisión del usuario:** solo del lado del servidor, **sin interfaz nueva**. "Cerrar sesión en todos los dispositivos" queda disponible en la capa de datos y documentado.

**Solución:** una tabla `Session` (id opaco de 256 bits al azar, usuario con `ON DELETE CASCADE`, creación, vencimiento y `revokedAt`). Al iniciar sesión se inserta la fila y el JWT pasa a llevar su id (`jti`) además del usuario; se conserva la firma, que permite descartar un token falsificado sin consultar la base. El reparto de responsabilidades sigue la guía de autenticación de Next:

| Dónde | Qué verifica | Por qué |
| ----- | ------------ | ------- |
| `proxy.ts` | Firma y vencimiento del token, sin base | Corre en cada pedido, incluidas las precargas; la guía pide evitar consultas a la base ahí. Es un filtro optimista. |
| `getCurrentUser()` / `requireUser()` | Además, que la sesión exista, no esté revocada ni vencida y sea del usuario del token | Es la autoridad: la usan páginas, Server Actions y rutas de la API. Una sola consulta (sesión + usuario), memorizada por pedido con `cache()`. |

Cerrar sesión (Server Action o `POST /api/auth/logout`) revoca la fila y después borra la cookie. `revokeAllSessionsForUser(userId)` revoca todas las sesiones vivas de un usuario. Las filas revocadas o vencidas de un usuario se borran cuando vuelve a iniciar sesión: no hace falta un cron. Los tokens emitidos antes de este cambio (sin `jti`) dejan de valer y piden iniciar sesión de nuevo. "Recordarme" no cambia.

**Cómo se verificó:** test primero. Rojo antes de implementar: 7 tests unitarios del token (payload con `jti`, rechazo de un token sin id de sesión, generador de ids) y 6 de integración (token con sesión revocada, vencida o borrada; logout que revoca en el servidor; cierre en todos los dispositivos sin tocar a otro usuario; limpieza al volver a entrar). Verde después. Un e2e nuevo cierra sesión, vuelve a poner la cookie copiada y comprueba que la API responde 401 y la página manda a `/login`. El seed (`pnpm db:seed`) sigue funcionando y `prisma migrate diff` queda vacío.

#### T39 — Pase final de código limpio (08/10/2026)

**Pedido:** antes de cerrar, un pase de nombres, código muerto, comentarios y consistencia, sin cambiar el comportamiento: ni funciones nuevas, ni UI, ni textos, ni dependencias, ni API, ni esquema.

El commit anterior a este pase, `05495e8`, sí cambia comportamiento y no es parte de T39: es la corrección de la revisión de T37. Si falla la limpieza de sesiones vencidas, el inicio de sesión sigue; si falla la revocación al cerrar sesión, la cookie se borra igual y la falla queda en el log. Es una decisión consciente: que el usuario siempre pueda salir en su dispositivo pesa más que el caso raro de una sesión que queda viva en el servidor hasta vencer.

**Qué se limpió:**

- **Tarjeta (`LivingCard`):** el fundido de movimiento reducido estaba repetido en cuatro capas; ahora es un solo helper. Los umbrales del coseno de la vuelta tienen nombre y su ángulo en el código (texto completo hasta ~18°, desaparece a ~53°; el reverso, simétrico entre ~127° y ~162°).
- **Reverso (`PaymentCardBack`):** la posición y el alto de la banda magnética se definían dos veces (arte y capa de texto); ahora son una constante. El espacio que se reserva para el logo usa la misma clase que el logo (`BRAND_LOGO_SLOT`). Comentario de la banda corregido.
- **Sesiones:** la función del repositorio `revokeAllUserSessions` se parecía demasiado a la del servidor `revokeAllSessionsForUser`. Pasa a llamarse `revokeSessionsByUserId`, junto a `revokeSessionById`; `revokeAllSessionsForUser` sigue siendo la capacidad del servidor que documenta el README.
- **E2E:** tres fixtures abrían y cerraban su propia conexión a la base; ahora comparten `withTestDb`. El reseteo por usuario se llama `resetRateLimitsBeforeSignIn` y su comentario aclara que también vacía todos los contadores por IP del login.
- **Código muerto:** se borró `ChevronRightIcon` (sin uso). `initialsOf` y las listas de anchos del audit de layout dejaron de exportarse (solo se usan en su archivo). El formato del monto reutiliza `groupThousands` de `format.ts` en lugar de una copia de la misma expresión regular.
- **Formato:** dos archivos que `prettier --check` marcaba quedaron formateados.
- **Test más estricto:** "una fila de sesión por inicio de sesión" ahora cuenta las sesiones vivas antes y después y exige exactamente una más (antes solo pedía que hubiera alguna).

**Cómo se verificó:** typecheck, lint y Prettier limpios; 1065 unitarios, 72 de integración y la suite e2e completa (112 pasan, 4 omitidos) sin cambios en su resultado. Ningún test se borró ni se relajó.

#### T5 — Deploy (pendiente)

**Pedido:** repositorio en GitHub y deploy en Vercel con Neon.

**Estado:** el repositorio ya está publicado ([techfixdev/challenge-tecnico-clublanus](https://github.com/techfixdev/challenge-tecnico-clublanus)); el deploy sigue pendiente. Publicar es una decisión del candidato y no se hace sin su aprobación explícita. Los pasos de producción están en la tabla "Local vs. producción" (T7).

---

## 6. Limitaciones conocidas

- **Gesto de volver en iOS Safari:** en el navegador (no instalada como app), el gesto propio de Safari para ir atrás puede ganar un toque que empieza justo en el borde; entonces vuelve Safari y no el gesto de la app. El chevron de la barra no depende de un gesto.
- **Botón atrás del navegador sin morph:** React restaura esa navegación de forma síncrona y no inicia view transitions. Un test fija el comportamiento y se pondrá en rojo cuando el framework lo soporte.
- **QR de Recibir:** codifica el alias y el CVU como texto; no es un estándar interbancario de pagos.
- **Saldos del seed:** son datos fijos de la demo (los e2e los verifican), no la suma de los movimientos sembrados.
- **Tipografía:** Rokkitt reemplaza a la tipografía comercial del club, que no estuvo disponible en un formato utilizable.
- **Rojo de error:** es una excepción de accesibilidad a la paleta institucional (granate, oro y Cool Gray).
- **Datos de tarjeta ficticios:** PAN inventado y CVV derivado en el servidor solo para la demo; en un sistema real el PAN va cifrado o tokenizado.
- **Límites de intentos de ventana fija:** en el borde entre dos ventanas pueden pasar hasta el doble de intentos en poco tiempo (y un e2e que cruza ese borde puede fallar, muy de vez en cuando); el límite por IP confía en los headers del proxy (Vercel). Quien reparte 50 intentos fallidos entre muchas IP sí bloquea la cuenta hasta que termina la ventana.
- **Cerrar sesión en todos los dispositivos sin interfaz:** existe en el servidor (`revokeAllSessionsForUser`), pero por decisión de producto no tiene botón ni ruta (T37).
- **Desktop:** se muestra la columna móvil centrada; el Figma es solo mobile y la alternativa responsive quedó archivada.
- **Tests bajo carga extrema:** "Toques durante una transición" falló 1 de 5 solo con 12 workers en 12 núcleos (más carga que el CI); en condiciones normales pasa siempre.
- **Observaciones menores abiertas tras T26:** tres, no bloqueantes, en `RecipientCarousel.tsx`, `RecipientCarousel.test.tsx` y `e2e/gestures.spec.ts` (esta última de nivel advertencia).
- **Revisiones no registradas:** T6, T7b, T15 y T16 no tienen una revisión automática registrada.
- **Deploy pendiente (T5):** el repositorio ya es público; el deploy espera la aprobación del candidato.

---

## 7. Estructura del proyecto

Organización por features ("screaming architecture"): la carpeta cuenta qué hace la app, no qué framework usa. Cada feature separa **dominio** (reglas puras, testeables), **datos** (repositorios con Prisma), **UI** (componentes) y, cuando hace falta, **server** (código que solo corre en el servidor: Server Actions, sesión). `app/` solo contiene rutas delgadas que conectan las piezas. El README tiene un "Tour del código" más detallado.

```
src/
├── app/                        ← solo rutas (delgadas): conectan features
│   ├── (app)/                  ← zona logueada
│   │   ├── (home)/             Home
│   │   ├── movimientos/        lista y detalle (404 real)
│   │   ├── transferir/         flujo de envío
│   │   └── recibir/            alias, CVU y QR
│   ├── api/                    ← REST: auth, movements, account, transfers (con tests)
│   └── login/
├── features/
│   ├── auth/       domain/ data/ server/ ui/
│   ├── account/    domain/ data/ server/ ui/
│   ├── movements/  domain/ data/ ui/
│   └── transfers/  domain/ data/ server/ ui/
├── shared/
│   ├── config/
│   ├── lib/        db, errores de base, respuestas de la API, dinero, formato, fechas, tokens de diseño
│   └── ui/         componentes compartidos + brand/ gestures/ motion/ qr/
└── proxy.ts                    ← protección de rutas (+ test)
prisma/   schema · migrations · seed
e2e/      specs de Playwright + fixtures/
scripts/  base de tests, tokens para Figma, captura de pantallas
docs/     BITACORA.md · CHECKLIST.md · design/ · screenshots/
```

**Convenciones**

- Los tests viven al lado del archivo que prueban (`x.ts` + `x.test.ts`). Los de integración contra la base usan `x.integration.test.ts`.
- Las carpetas entre paréntesis (`(app)`, `(home)`) son *route groups* de Next: organizan el código sin cambiar la URL.
- Las dependencias van en una sola dirección: `ui` y `data` dependen de `domain`, nunca al revés. El dominio no conoce Prisma ni React.

---

## 8. Cómo correrlo

Los pasos completos, los scripts y la descripción de la API están en el [README](../README.md). Resumen:

```bash
pnpm install
cp .env.example .env
pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm dev               # http://localhost:3000

pnpm test              # unitarios
pnpm test:integration  # integración (requiere Postgres; usa granabank_test)
pnpm test:e2e          # end-to-end (requiere Postgres; usa granabank_test)
```
