# Auditoría funcional local de Atal

Fecha: 2026-07-17

Esquema operativo: `atal:store:v2`

Alcance: MVP local-first, sin Supabase, autenticación, pagos ni despliegue.

## Fuente única y migración

`src/data/atalStore.ts` es la fuente operativa para pacientes, planes, ejercicios, expedientes, sesiones terminadas, notas, actividad, notificaciones, ajustes y comentarios. `src/data/atal-demo.ts` se usa únicamente para el seed de la primera ejecución. La tienda publica cambios mediante `useSyncExternalStore` y escribe una instantánea completa, por lo que una operación que falle al persistir no reemplaza el estado anterior en memoria.

Se recuperan las claves históricas `atal:local-patients:v1`, `atal:local-plans:v1`, `atal:local-exercises:v1` y `atal:clinical-records:v1` antes de crear el store v2. Las conversaciones y borradores de IA mantienen repositorios versionados propios. Los borradores guiados conservan la clave compuesta `patientId + planId`. Las claves antiguas no se borran durante la migración.

## Matriz de rutas

| Ruta | Funcionalidad visible | Fuente de datos | Acción real y persistencia | Verificación |
|---|---|---|---|---|
| `/` | Inicio, métricas, alertas y actividad reciente | Store v2, sesiones y eventos | Navega a pacientes, planes y reportes reales | Compila; respuesta HTTP 200 |
| `/patients` | Lista, búsqueda, filtros y orden | Store v2 | Refleja crear, editar, archivar y restaurar sin recarga | Compila; HTTP 200 |
| `/patients/new` | Alta de paciente y expediente | Store v2 | Operación conjunta paciente + expediente; nota opcional | Compila; HTTP 200 |
| `/patients/:id` | Perfil, plan activo, notas, historial y métricas | Store v2 | Edita datos; notas CRUD; archiva/restaura; abre plan/expediente | Compila; HTTP 200 |
| `/patients/:id/clinical-record` | Documento clínico editable e imprimible | Store v2 + versiones | Guarda versión, asocia plan vigente y abre impresión A4/PDF | Compila; HTTP 200 |
| `/patients/:id/portal-preview` | Plan activo o pausado y progreso reciente | Store v2 + borrador de sesión | Revisa ejercicios, reanuda o reinicia solo el borrador actual | Compila; HTTP 200 |
| `/patients/:id/session` | Sesión guiada sin shell clínico | Plan y ejercicios del store; IndexedDB para medios | Persiste borrador por paciente/plan y crea `SessionRecord` al finalizar | Compila; HTTP 200 |
| `/plans` | Estados y contadores reales | Store v2 | Filtros activos, borradores, pausados, completados y archivados | Compila; HTTP 200 |
| `/plans/new` | Constructor manual | Pacientes y ejercicios del store | Crea borrador relacionado por IDs y actualiza expediente asociado | Compila; HTTP 200 |
| `/plans/:id` | Edición, ejercicios, progreso y estado | Store v2 | Guarda dirty state; activa, pausa, completa, archiva, restaura, duplica y elimina si es seguro | Compila; HTTP 200 |
| `/exercises` | Biblioteca, búsqueda y archivo | Store v2 + miniaturas IndexedDB | Lista reacciona a altas, ediciones, archivo y restauración | Compila; HTTP 200 |
| `/exercises/new` | Alta completa con medio local | Store v2 + IndexedDB | Crea ejercicio y guarda imagen/video/secuencia con rollback ante error | Compila; HTTP 200 |
| `/exercises/:id` | Detalle y edición | Store v2 + IndexedDB | Edita, duplica, archiva, restaura, reemplaza medio y elimina si no está relacionado | Compila; HTTP 200 |
| `/activity` | Seguimiento y reportes | `SessionRecord` | Filtra sesiones reales y pendientes de revisión | Compila; HTTP 200 |
| `/activity/:id` | Reporte de sesión | `SessionRecord`, paciente y plan | Guarda observación y marca reporte/notificación como revisados | Compila; HTTP 200 |
| `/assistant` | Centro de mando conversacional exclusivo, contexto real, acordeón de borrador y compositor multimodal | Repositorios IA v1 + `atal:store:v2` | Consulta, prepara y confirma cambios; oculta shell clínico; aplica entidades y comandos sobre la fuente única | Compila; HTTP 200; flujo local verificado |
| `/assistant/drafts/:draftId` | Revisión profunda editable sin shell clínico | Draft IA + Store v2 | Regenera sección y aplica la misma operación atómica del chat | Compila; HTTP 200 |
| `/exports` | CSV/JSON/backup | Store v2 | Descargas Blob reales; el backup excluye binarios grandes | Compila; HTTP 200 |
| `/settings` | Preferencias | Store v2 | Toggles persistentes, densidad real y acceso a subsecciones | Compila; HTTP 200 |
| `/settings/profile` | Perfil profesional | Store v2 | Guarda nombre, especialidad y clínica | Compila; HTTP 200 |
| `/settings/privacy` | Privacidad local | Store v2 | Persiste bloqueo y separación clínica | Compila; HTTP 200 |
| `/settings/ai` | Preferencias de Atal IA | Store v2 | Persiste sugerencias, alertas e instrucciones | Compila; HTTP 200 |
| `/settings/appearance` | Claro / Graphite Clinical / sistema | Theme repository local | Persiste apariencia y la aplica a toda la app | Compila; HTTP 200 |
| `/settings/feedback` | Ayuda y comentarios | Store v2 | Guarda historial y usa Web Share, portapapeles o descarga real | Compila; HTTP 200 |
| `/system-states` | Estados vacíos, carga, error y éxito | UI local | Referencia funcional de estados del producto | Compila; HTTP 200 |

## Recorridos críticos inspeccionados

- Alta manual: el guardado crea paciente y expediente en una única mutación; las notas opcionales generan evento.
- Plan manual: crea borrador, conserva relaciones por ID, y el detalle permite guardar y cambiar estado con conflicto explícito si ya existe un plan activo.
- Atal IA: tiene encabezado y compositor propios, contexto por IDs de paciente/plan/ejercicio, tarjeta plegable con una sola sección abierta y un editor único por sección. Las consultas leen `atal:store:v2`; los borradores aplican en una mutación atómica; los comandos delicados exigen confirmación. Crear, actualizar y reemplazar un plan activo emite cambios reactivos y eventos de auditoría.
- Sesión guiada: usa el plan activo del paciente, impide iniciar planes pausados, persiste progreso por paciente + plan y genera un registro terminado sin duplicados.
- Reporte: se deriva de la sesión terminada; observación y revisión persisten y actualizan notificaciones.
- Exportaciones: pacientes y progreso son CSV; planes y respaldo son JSON; todos se generan mediante `Blob`.
- Medios: los metadatos viven en el ejercicio y los binarios en IndexedDB, nunca en `localStorage`.

## Evidencia técnica

- `npm run typecheck`: aprobado.
- `npm run build`: aprobado.
- `git diff --check`: aprobado tras correcciones de whitespace.
- Flujo específico de Atal IA: aprobado con alta atómica de paciente/expediente/ejercicio/plan, actualización del mismo ejercicio por ID, reemplazo atómico de plan activo, deshacer de ambos estados y bloqueo por conflicto de versión.
- Navegación HTTP: todas las rutas de la matriz respondieron 200 mediante Vite.
- Endpoint Gemini sin secreto en el entorno de verificación: devolvió el error controlado y accionable esperado. No se declaró una llamada viva exitosa.
- Dependencias: no se añadió ninguna.

## Limitación de la verificación

El entorno de construcción no proporcionó un navegador interactivo conectado, por lo que no se afirma una validación humana de cada gesto/tamaño físico. La compilación, el enrutamiento, la persistencia implementada y los estados de error sí quedaron verificados; la prueba visual final corresponde a Google AI Studio con `GEMINI_API_KEY` configurada como secreto del servidor.
