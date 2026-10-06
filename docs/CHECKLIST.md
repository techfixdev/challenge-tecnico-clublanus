# Checklist del challenge — GranaBank

Estado de cada requerimiento del enunciado, con la evidencia que lo respalda. Se tilda solo lo verificado.

Leyenda: `[x]` hecho y verificado · `[ ]` pendiente · ⏳ en curso

Última actualización: 06/10/2026

---

## Requerimientos funcionales

- [x] Mostrar una lista de elementos → movimientos en `/movimientos` y "Últimos movimientos" en Home.
- [x] Ver el detalle de un elemento → `/movimientos/[id]`, con 404 real para ids inexistentes.
- [x] Estado de carga → `loading.tsx` y skeletons con brillo por sección (`<Suspense>`).
- [x] Estado de error → `movimientos/error.tsx` con reintento (`RouteError`).
- [x] Estado vacío → `MovementsEmptyState` (búsqueda o filtro sin resultados).
- [x] App funcional y navegable → recorrida completa en navegador real (06/10/2026): login → Home → lista → detalle → volver → logout.

## Requerimientos técnicos

- [x] Frontend con Next.js y TypeScript → Next 16.3 (App Router), TS estricto.
- [x] Backend con API routes de Next → `src/app/api/` (auth, movimientos, resumen, tarjetas).
- [x] Base de datos relacional → PostgreSQL 17 (docker compose en local).
- [x] ORM → Prisma 7 con migraciones y seed.

## No excluyentes (suman puntos)

- [x] Validaciones → zod en el formulario, en el body de la API y en los query params.
- [x] Componentes y estructura → feature-first (`features/{auth,movements,account}`), con capas domain / data / ui.
- [x] Estados y lógica de datos → filtros en la URL, paginación por cursor, Server Components y repositorio.
- [x] Detalles de UX → errores por campo, feedback al tocar, animaciones con "reducir movimiento", ocultar saldo.

## Qué se evalúa (cómo lo cubrimos)

- [x] Claridad del código → lint y typecheck limpios, tests al lado del código.
- [x] Seguir el diseño → comparado contra Figma (`docs/design/`); filas y montos se mantienen como en el diseño.
- [x] Organización del proyecto → estructura documentada en el README y en la bitácora.
- [x] Criterio técnico → decisiones con su porqué en el README ("Decisiones técnicas") y en la bitácora.
- [x] Uso de herramientas → Prisma, zod, Vitest, Playwright, revisiones por commit.
- [x] Explicar lo hecho → bitácora con el porqué de cada decisión (T1–T7) y preparación de entrevista local.

## Entregables (excluyentes)

- [ ] Link al repositorio de GitHub → **pendiente de tu confirmación** (todavía no se sube nada).
- [ ] Deploy en Vercel (con Neon) → **pendiente de tu confirmación**.
- [x] README: cómo correr el proyecto → sección "Cómo correrlo".
- [x] README: decisiones técnicas → sección "Decisiones técnicas".
- [x] README: qué mejoraría → sección "Qué mejoraría con más tiempo".

---

## Trabajo en curso (06/10/2026)

- [x] Ordenar los scripts sueltos de Playwright (`.gitignore`, `c5cf5b4`).
- [x] Mergear la versión premium (`feat/premium-motion`): tarjeta viva, saldo tipo odómetro, header glass, indicador de la nav.
- [x] Morph de vuelta (detalle → lista): con "Volver" funciona en producción, porque el prefetch trae la lista antes de navegar (e2e en verde). En `next dev` no hay prefetch y por eso no se ve. Con el botón atrás del navegador no se anima: React no inicia la transición. Queda como limitación conocida, documentada en el README y con un test que fija el comportamiento actual y avisa cuando el framework lo soporte.
- [x] Bitácora T7 con la tabla local vs. producción (`docs/BITACORA.md`).
- [x] Puntos de entrevista en `ENTREVISTA.md` (solo local, no se versiona).
- [x] Pulido de las tarjetas: odómetro sin huecos en el "1" (Poppins no trae cifras de ancho fijo), asteriscos centrados con los dígitos, logo Visa real y bordes alineados, medido en capturas a 3x (`9285923`). Con el saldo oculto el ancho no delata el monto (`b5f347f`).
- [x] Login por API: mensajes en español aunque falten campos (`089f354`).
- [x] Transferencias reales entre usuarios demo, en una transacción atómica que impide saldo negativo, con idempotencia y referencia corta compartida (`99748a8`, `79a1cfa`, `0436010`).
- [x] Pantalla Recibir con alias y CVU para copiar y compartir, con alternativa para http (`79a1cfa`).
- [x] Ninguna pantalla se desborda ni corta texto entre 240 y 1024 px (zoom de accesibilidad incluido), con un test e2e que lo vigila (`8240624`, `0dd6d7b`).
- [ ] ⏳ Rendimiento: medir el build de producción y optimizar con números de antes y después.
- [ ] Sistema de luz: degradés, sombras y reflejos coherentes en toda la app.
- [ ] Transiciones que enmascaran la carga (el botón se expande hasta la pantalla).
- [ ] Tarjeta que gira al tocarla; el ojito revela saldo, número y CVU (ocultos por defecto).
- [ ] Tokens de diseño exportables a Figma (`pnpm tokens:figma` → JSON DTCG).
- [ ] Lista de pantallas y estados para capturar en Figma (requiere conectar tu cuenta de Figma).
- [ ] Revisar todo juntos y commitear (local).
- [ ] Subir a GitHub y deployar (solo con tu OK).
