# Design QA — Atal Premium Native Clinical

## Dirección visual aplicada

- Sistema mobile-first con superficies continuas, filas compactas y menos tarjetas anidadas.
- Navegación inferior translúcida con blur, borde tenue, sombra ligera y soporte de `safe-area-inset-bottom`.
- Navegación contextual oculta durante sheets, selectores, modales y editores; el scroll del fondo queda bloqueado.
- Encabezado compacto sin identidad ficticia “CD”; el acceso de cuenta usa un icono neutral.
- Copy clínico breve y orientado a acciones. Se eliminó de Inicio el bloque “Recomendación de Atal IA”.
- Estados comunicados también por iconografía, texto, contraste y composición, sin depender únicamente del color.

## Temas

- **Graphite Clinical:** preservado como modo oscuro.
- **Blue Clinical:** incorporado al `ThemeContext` existente, con `#2563EB` como primario, `#173B72` profundo, `#EAF2FF` claro, `#F8FAFD` como fondo y `#101827` como texto principal.
- El logotipo conserva el verde oficial en todos los temas.
- La interfaz operativa evita rojo, amarillo, mostaza, dorado, beige, crema y café. Las prioridades usan jerarquía neutral y azul clínico.

## Tipografía

Se eligió **Inter Variable** como única familia de interfaz. Se sirve localmente en WOFF2 con subconjunto latino, rango real `100 900`, `font-display: swap`, optical sizing y números tabulares en métricas. Esto evita pesos sintetizados, reduce solicitudes tipográficas y mantiene compatibilidad con PWA/Android.

Fuentes consultadas:

- [Inter — sitio oficial](https://rsms.me/inter/): diseño para pantallas, variable font y optical sizing.
- [Inter — repositorio oficial](https://github.com/rsms/inter): distribución WOFF2 y licencia SIL Open Font License 1.1.
- [WCAG 2.1 — Text Spacing](https://www.w3.org/WAI/WCAG21/Understanding/text-spacing): espaciado y legibilidad sin pérdida de contenido.

## Flujos preservados y verificados

- `atal:store:v2`, versión 2, `useSyncExternalStore`, migraciones y relaciones por ID.
- Creación de paciente y plan; selección múltiple desde la biblioteca existente.
- Borrador de Atal IA: edición tipo nota, cancelar, guardar sección, aplicar atómicamente, auditoría y deshacer.
- Recomendaciones de ejercicios revisables; los elementos de biblioteca conservan `sourceExerciseId` y se deduplican.
- Sesión guiada con campos numéricos que admiten estado vacío y normalizan al finalizar la edición.
- Blue Clinical, Graphite Clinical, scroll superior en navegación principal y restauración contextual en historial.
- Registro y recarga del service worker en build de producción, conservando `atal:store:v2`.

## Skeletons

El fallback de rutas selecciona una estructura estable según la pantalla: Inicio, Pacientes, Perfil, Planes, Plan, Actividad, Atal IA, Sesión, Ejercicios y Ajustes. Las variantes usan tonos fríos del tema activo, reservan las dimensiones de la interfaz real y respetan `prefers-reduced-motion`.

## Rendimiento

- Se conservaron las rutas lazy y se añadió precarga por intención (`pointerenter`/focus) y durante tiempo ocioso.
- El router y sus acciones se memoizan para evitar renders derivados de identidades nuevas.
- La tipografía pasó de varios archivos Poppins a un único WOFF2 de Inter Variable.
- No se añadieron dependencias visuales, retrasos artificiales, spinners globales ni lecturas remotas por render.

## Matriz visual automatizada

Se ejecutó Chromium headless sobre 10 rutas en:

- 360 × 800
- 390 × 844
- 412 × 915
- 1024 × 900

La matriz comprueba overflow horizontal, presencia de “CD”, bloque eliminado de recomendación, colores prohibidos calculados, sheets sin navegación inferior, retorno de la barra, scroll superior, tokens de ambos temas, compositor con viewport reducido y edición numérica sin cero atrapado. Resultado: sin hallazgos y sin errores de consola.

El navegador remoto integrado bloqueó la URL local; la misma validación se ejecutó con Chromium headless aislado, sin añadir Playwright ni Chromium a las dependencias del repositorio.
