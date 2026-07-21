# Atal — QA Bloque 3: entrega al paciente

## Alcance

Validar el flujo completo:

`plan guardado → vista previa → PDF local → descarga → impresión → compartir nativo`

## Integridad técnica

- [ ] Rama exacta: `feature/atal-patient-delivery`.
- [ ] `npm ci` finaliza sin errores.
- [ ] `npm run typecheck` finaliza con 0 errores.
- [ ] `npm test` reporta 21 pruebas aprobadas y 0 fallidas.
- [ ] `npm run build` finaliza correctamente.
- [ ] No existen errores de consola al abrir la entrega ni al generar el archivo.
- [ ] No se añadió ninguna dependencia de generación PDF ni servicio externo.
- [ ] No se crearon workflows automáticos.

## Modelo clínico

- [ ] El documento usa únicamente el plan persistido.
- [ ] El título, objetivo, duración, frecuencia e indicaciones coinciden con el plan.
- [ ] El orden de los ejercicios coincide con `exerciseIds`.
- [ ] Cada ejercicio conserva series, repeticiones o tiempo, descanso, posición, instrucciones, precauciones, material y dolor máximo.
- [ ] El documento incluye profesional, especialidad y clínica.
- [ ] Un paciente archivado queda bloqueado.
- [ ] Un plan archivado queda bloqueado.
- [ ] Un plan vacío o con ejercicios faltantes queda bloqueado.
- [ ] Planes en borrador, pausados o completados requieren confirmación y muestran su estado en el PDF.

## PDF real

- [ ] El archivo comienza con `%PDF-1.4`.
- [ ] El MIME es `application/pdf`.
- [ ] El nombre termina en `.pdf` y no contiene caracteres de ruta inseguros.
- [ ] El PDF abre en un visor real de Android, iOS o escritorio.
- [ ] El formato es A4 vertical.
- [ ] La primera página contiene paciente, profesional, resumen e indicaciones.
- [ ] Los ejercicios aparecen en páginas clínicas legibles.
- [ ] Todas las páginas muestran numeración y nota de seguridad.
- [ ] Los acentos en español se muestran correctamente.
- [ ] Los textos largos crean páginas de continuación sin recortes.

## Multimedia

- [ ] Una imagen local compatible aparece en el PDF.
- [ ] Una secuencia usa una imagen compatible disponible.
- [ ] Un video o animación usa un placeholder y no bloquea el PDF.
- [ ] Un ejercicio sin `mediaId` usa un placeholder y no bloquea el PDF.
- [ ] No se realiza ninguna solicitud de red para convertir o subir multimedia.

## Acciones

- [ ] “Descargar PDF” crea un archivo real y muestra páginas y tamaño.
- [ ] “Compartir” entrega un objeto `File` al menú nativo cuando el navegador lo permite.
- [ ] Un navegador sin Web Share descarga el PDF como respaldo.
- [ ] Cancelar el menú de compartir no provoca una descarga inesperada.
- [ ] “Imprimir” muestra exclusivamente el documento canónico.
- [ ] No se afirma que WhatsApp recibió el documento; solo se abre el menú del sistema.

## Consistencia con el portal

- [ ] El portal y el PDF muestran el mismo plan guardado.
- [ ] El orden y la dosis de los ejercicios coinciden.
- [ ] El plan puede abrirse desde “Entregar al paciente” y “Ver y descargar plan”.
- [ ] Cambios no guardados en el editor activan la protección antes de navegar.

## Validación visual

- [ ] Viewports 360, 390, 412 y 430 px.
- [ ] Modo claro y oscuro.
- [ ] Verde oficial `#7EB695`.
- [ ] Sin degradados.
- [ ] Dock, temas y capas visuales existentes intactos.
- [ ] La nueva pantalla no presenta overflow horizontal.
- [ ] La vista impresa no incluye navegación, dock ni controles.

## Casos mínimos

1. Plan activo con tres ejercicios e imagen local.
2. Plan activo sin imágenes.
3. Plan pausado confirmado explícitamente.
4. Plan borrador confirmado explícitamente.
5. Paciente archivado.
6. Plan archivado.
7. Plan con diez ejercicios e instrucciones largas.
8. Compartir soportado, no soportado, cancelado y fallido.
