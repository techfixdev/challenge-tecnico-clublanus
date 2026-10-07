# Checklist del challenge — GranaBank

Estado de cada requerimiento del enunciado, con la evidencia que lo respalda. Se tilda solo lo verificado.

Leyenda: `[x]` hecho y verificado · `[ ]` pendiente · ⏳ en curso

Última actualización: 07/10/2026 (verificado contra `c52164e`)

---

## Requerimientos funcionales

- [x] Mostrar una lista de elementos → movimientos en `/movimientos`, agrupados por día ("Hoy", "Ayer", fecha), y "Últimos movimientos" en Home.
- [x] Ver el detalle de un elemento → `/movimientos/[id]`, con 404 real para ids inexistentes y acciones (compartir, copiar, repetir transferencia).
- [x] Estado de carga → `loading.tsx` por pantalla y skeletons con brillo por sección (`<Suspense>`).
- [x] Estado de error → `error.tsx` con reintento (`RouteError`) en la app, Movimientos, Transferir y Recibir.
- [x] Estado vacío → `MovementsEmptyState` (búsqueda o filtro sin resultados).
- [x] App funcional y navegable → login → Home → lista → detalle → volver → cerrar sesión (desde el perfil), cubierto por los e2e.

## Requerimientos técnicos

- [x] Frontend con Next.js y TypeScript → Next 16.3 (App Router), TS estricto.
- [x] Backend con API routes de Next → `src/app/api/` (auth, movements, account, transfers). Ver README, "API".
- [x] Base de datos relacional → PostgreSQL 17 (docker compose en local).
- [x] ORM → Prisma 7 con migraciones y seed.

## No excluyentes (suman puntos)

- [x] Validaciones → zod en el formulario, en el body de la API y en los query params.
- [x] Componentes y estructura → feature-first (`features/{auth,movements,account,transfers}`), con capas domain / data / ui.
- [x] Estados y lógica de datos → filtros en la URL, paginación por cursor, Server Components y repositorio.
- [x] Detalles de UX → errores por campo, feedback al tocar, animaciones con "reducir movimiento", ocultar saldo. Ver README, "Accesibilidad y UX".

## Qué se evalúa (cómo lo cubrimos)

- [x] Claridad del código → lint y typecheck limpios, tests al lado del código (874 unitarios, 54 de integración, 78 e2e).
- [x] Seguir el diseño → layout y pantallas del Figma (`docs/design/`); los desvíos son deliberados y documentados: paleta del Manual de Marca, formato argentino, montos con signo y cierre de sesión en el perfil. Ver README, "Marca" y "Decisiones técnicas".
- [x] Organización del proyecto → estructura documentada en el README y en la bitácora.
- [x] Criterio técnico → decisiones con su porqué en el README ("Decisiones técnicas") y en la bitácora.
- [x] Uso de herramientas → Prisma, zod, Vitest, Playwright, CI, revisiones por commit.
- [x] Explicar lo hecho → bitácora con el porqué de cada decisión y preparación de entrevista local.

## Entregables (excluyentes)

- [ ] Link al repositorio de GitHub → **pendiente de tu confirmación** (todavía no se sube nada).
- [ ] Deploy en Vercel (con Neon) → **pendiente de tu confirmación**.
- [x] README: cómo correr el proyecto → sección "Cómo correrlo".
- [x] README: decisiones técnicas → sección "Decisiones técnicas".
- [x] README: qué mejoraría → sección "Qué mejoraría con más tiempo".

---

## Estado al 07/10/2026

### Hecho hoy

- [x] Colores solo de la marca (T12a): cada rol de la UI usa granate, oro o Cool Gray 7C; el rojo de error queda como excepción documentada (`43bf0f2`).
- [x] Marca del club (T21): paleta oficial como tokens, escudo extraído del manual y login rediseñado (`afd20d9`, `ee169df`, `80d077c`).
- [x] UX móvil (T12b-A): Transferir sin barra inferior, cierre de sesión en una hoja de perfil, separador de miles al tipear y cuenta en pesos por defecto (`e2d8581`, `9bf6390`, `fc6b41c`).
- [x] Movimiento (T12b-B): un solo lenguaje de animación sobrio, con tokens compartidos (`745e493`).
- [x] Lista tipo billetera (T12b-D): agrupada por día, montos con `+`/`−` y color por dirección (`8096a5e`, `72500af`).
- [x] Pulido (T12b-C): barra de navegación tipo iOS en lugar de "Volver", acciones en el detalle con `/transferir?to=`, tarjetas en español con segunda tarjeta dorada, QR en Recibir y alerta del login sobre granate (`09b4b6c`, `83e1fc1`, `494f619`, `f0634f5`, `ee38e92`).
- [x] Fix del seed para los e2e: ningún movimiento demo queda con fecha futura (`9da2b6c`).

### Pendiente, en orden

- [ ] Figma (T11): tokens exportables (`pnpm tokens:figma` → JSON DTCG, ⏳ en curso) y capturas de pantallas y estados. El MCP de Figma ya está configurado; falta que autentiques tu cuenta tras reiniciar.
- [ ] Pasada de legibilidad (T22): código limpio antes de subirlo, incluidas las observaciones no bloqueantes de las revisiones.
- [ ] Bitácora y guía para la entrevista al día.
- [ ] Subir a GitHub y deployar en Vercel (solo con tu OK).
- [x] Revisar todo juntos y commitear (local) → todo commiteado en `feat/granabank`, con lint, tipos y tests en verde; las revisiones automáticas aprobadas quedan registradas por tarea en el documento de tareas local.
