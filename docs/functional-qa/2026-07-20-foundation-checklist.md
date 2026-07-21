# Atal — Bloque 1: base funcional e integridad

Base: `main` en `8dba87df94926aa39d7741961d540323ec931874`.

## Implementación

- [x] Una única aplicación canónica mediante `AppCloseout`.
- [x] Espacio de trabajo real vacío en instalaciones nuevas.
- [x] Datos demo separados y disponibles solo mediante inicialización explícita.
- [x] Asociación determinista expediente–plan, priorizando el plan activo.
- [x] Duplicación de planes sin reemplazar la asociación clínica vigente.
- [x] Duplicación de ejercicios con registros multimedia independientes.
- [x] Limpieza de copias creadas dentro de un plan si se descartan los cambios.
- [x] Validación central de pacientes, planes y ejercicios.
- [x] Protección de cambios no guardados en la edición de planes.
- [x] Atal IA conserva ejercicios existentes al añadir ejercicios a un plan.
- [x] Atal IA bloquea borradores con contradicciones clínicas.
- [x] Cliente y servidor comparten el mismo límite de solicitud de Atal IA.
- [x] El portal y la sesión guiada usan las indicaciones reales del profesional.
- [x] Pruebas de regresión sin dependencias nuevas mediante `node:test`.
- [x] Comando agregado: `npm run quality`.
- [x] Capas visuales, dock, temas y verde oficial sin modificaciones.

## Verificación de ejecución

- [ ] Ejecutar `npm ci` en un checkout limpio.
- [ ] Ejecutar `npm run typecheck`.
- [ ] Ejecutar `npm test`.
- [ ] Ejecutar `npm run build`.
- [ ] Recorrido móvil en IA Studio o ChatGPT Work.

La ejecución se realizará como una única ronda final para evitar workflows repetidos y notificaciones innecesarias.
