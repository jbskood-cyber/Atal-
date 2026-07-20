# Atal — Checklist quirúrgica de QA visual

**Rama:** `feature/atal-unified-visual-system`  
**Base protegida:** `c745ec64824f721b797109b1e4344749090095e0`  
**Capturas revisadas:** 16  
**Alcance:** presentación, legibilidad, espaciado y superposición. Sin cambios en rutas, datos, almacenamiento o lógica clínica.

## Estado de la checklist

- `IMPLEMENTADO`: existe una regla específica en `src/styles/atal-surgical-qa.css`.
- `PENDIENTE QA`: requiere revisar la aplicación renderizada en Google AI Studio antes de fusionar.

## Bloque 1 — Pantallas principales y Atal IA

- [x] G01 — Escala y jerarquía tipográfica global. **IMPLEMENTADO / PENDIENTE QA**
- [x] G02 — Contraste de textos secundarios. **IMPLEMENTADO / PENDIENTE QA**
- [x] G03 — Contenedores de iconos coherentes. **IMPLEMENTADO / PENDIENTE QA**
- [x] G04 — Flechas, enlaces y acciones secundarias. **IMPLEMENTADO / PENDIENTE QA**
- [x] G05 — Separación de contenido respecto de elementos fijos. **IMPLEMENTADO / PENDIENTE QA**
- [x] H01 — Contraste del subtítulo de Nuevo paciente. **IMPLEMENTADO / PENDIENTE QA**
- [x] H02 — Alineación del resumen clínico. **IMPLEMENTADO / PENDIENTE QA**
- [x] H03 — Legibilidad y área táctil de Ver todo. **IMPLEMENTADO / PENDIENTE QA**
- [x] H04 — Legibilidad de Más opciones. **IMPLEMENTADO / PENDIENTE QA**
- [x] P01 — Densidad y padding de filas de pacientes. **IMPLEMENTADO / PENDIENTE QA**
- [x] P02 — Contraste de diagnósticos. **IMPLEMENTADO / PENDIENTE QA**
- [x] P03 — Alineación de avatar, texto, estado y flecha. **IMPLEMENTADO / PENDIENTE QA**
- [x] PL01 — El dock no debe tapar el último plan. **IMPLEMENTADO / PENDIENTE QA**
- [x] PL02 — Escala tipográfica de Planes. **IMPLEMENTADO / PENDIENTE QA**
- [x] PL03 — Filtros compactos en una sola banda desplazable. **IMPLEMENTADO / PENDIENTE QA**
- [x] PL04 — Filas de planes alineadas con Pacientes. **IMPLEMENTADO / PENDIENTE QA**
- [x] PL05 — Espacio inferior seguro. **IMPLEMENTADO / PENDIENTE QA**
- [x] AI01 — Conversación visible debajo del encabezado. **IMPLEMENTADO / PENDIENTE QA**
- [x] AI02 — Chips sin recorte lateral. **IMPLEMENTADO / PENDIENTE QA**
- [x] AI03 — Desplazamiento horizontal con márgenes. **IMPLEMENTADO / PENDIENTE QA**
- [x] AI04 — Indicadores de 0% neutrales. **IMPLEMENTADO / PENDIENTE QA**
- [x] AI05 — Iconos del borrador con sistema aprobado. **IMPLEMENTADO / PENDIENTE QA**
- [x] AI06 — El compositor no debe ocultar el borrador. **IMPLEMENTADO / PENDIENTE QA**
- [x] AI07 — Espacio inferior y scroll seguro. **IMPLEMENTADO / PENDIENTE QA**
- [x] AI08 — Bordes, radios y jerarquía del borrador. **IMPLEMENTADO / PENDIENTE QA**

## Bloque 2 — Ajustes, preferencias y formularios

- [x] G06 — Cabecera secundaria unificada. **IMPLEMENTADO / PENDIENTE QA**
- [x] G07 — Títulos interiores proporcionados. **IMPLEMENTADO / PENDIENTE QA**
- [x] G08 — Iconos verdes con glifo blanco. **IMPLEMENTADO / PENDIENTE QA**
- [x] G09 — Inputs, textareas y selectores estandarizados. **IMPLEMENTADO / PENDIENTE QA**
- [x] G10 — Botones de guardar alineados. **IMPLEMENTADO / PENDIENTE QA**
- [x] G11 — Espacios verticales equilibrados. **IMPLEMENTADO / PENDIENTE QA**
- [x] S01 — Escala de la pantalla Ajustes. **IMPLEMENTADO / PENDIENTE QA**
- [x] S02 — Tarjeta Perfil profesional. **IMPLEMENTADO / PENDIENTE QA**
- [x] S03 — Switches uniformes. **IMPLEMENTADO / PENDIENTE QA**
- [x] AP01 — Indicador de tema seleccionado visible. **IMPLEMENTADO / PENDIENTE QA**
- [x] AP02 — Iconos y alturas de las opciones de apariencia. **IMPLEMENTADO / PENDIENTE QA**
- [x] AIP01 — Encabezado de Preferencias de Atal IA. **IMPLEMENTADO / PENDIENTE QA**
- [x] AIP02 — Altura y tipografía del textarea. **IMPLEMENTADO / PENDIENTE QA**
- [x] AIP03 — Botón Guardar cambios alineado. **IMPLEMENTADO / PENDIENTE QA**
- [x] PV01 — Bloque Información clínica protegida. **IMPLEMENTADO / PENDIENTE QA**
- [x] PV02 — Distribución de texto y switch. **IMPLEMENTADO / PENDIENTE QA**
- [x] PF01 — Etiquetas, valores y placeholders uniformes. **IMPLEMENTADO / PENDIENTE QA**
- [x] PF02 — Alturas y espacios del formulario. **IMPLEMENTADO / PENDIENTE QA**
- [x] PF03 — Botón alineado con el formulario. **IMPLEMENTADO / PENDIENTE QA**
- [x] FB01 — Tamaño del título de ayuda. **IMPLEMENTADO / PENDIENTE QA**
- [x] FB02 — Contraste de placeholders. **IMPLEMENTADO / PENDIENTE QA**
- [x] FB03 — Bloque Adjuntar captura más compacto. **IMPLEMENTADO / PENDIENTE QA**
- [x] FB04 — Botón deshabilitado legible. **IMPLEMENTADO / PENDIENTE QA**
- [x] FB05 — Separación respecto del historial y el dock. **IMPLEMENTADO / PENDIENTE QA**

## Bloque 3 — Plan clínico y expediente

- [x] PC01 — Todo guardado no tapa Administrar estado. **IMPLEMENTADO / PENDIENTE QA**
- [x] PC02 — Todo guardado no tapa campos. **IMPLEMENTADO / PENDIENTE QA**
- [x] PC03 — Aviso de guardado compacto. **IMPLEMENTADO / PENDIENTE QA**
- [x] PC04 — Flujo sin superposición. **IMPLEMENTADO / PENDIENTE QA**
- [x] PC05 — Tarjetas de Estado y Progreso compactas. **IMPLEMENTADO / PENDIENTE QA**
- [x] PC06 — Altura determinada por el contenido. **IMPLEMENTADO / PENDIENTE QA**
- [x] PC07 — Pestañas legibles. **IMPLEMENTADO / PENDIENTE QA**
- [x] PC08 — Estado seleccionado consistente. **IMPLEMENTADO / PENDIENTE QA**
- [x] PC09 — Botones completamente visibles. **IMPLEMENTADO / PENDIENTE QA**
- [x] PE01 — Alineación de ejercicios. **IMPLEMENTADO / PENDIENTE QA**
- [x] PE02 — Flechas deshabilitadas visibles. **IMPLEMENTADO / PENDIENTE QA**
- [x] PE03 — Áreas táctiles de controles. **IMPLEMENTADO / PENDIENTE QA**
- [x] PE04 — Ajustes del plan sin superposición. **IMPLEMENTADO / PENDIENTE QA**
- [x] EP01 — Pestañas del expediente legibles. **IMPLEMENTADO / PENDIENTE QA**
- [x] EP02 — Iconos de secciones estandarizados. **IMPLEMENTADO / PENDIENTE QA**
- [x] EP03 — Jerarquía y separación de bloques. **IMPLEMENTADO / PENDIENTE QA**
- [x] EP04 — Ver todo y flechas coherentes. **IMPLEMENTADO / PENDIENTE QA**
- [x] EP05 — Espacio inferior antes del dock. **IMPLEMENTADO / PENDIENTE QA**

## Validación obligatoria antes de fusionar

- [ ] Ejecutar `npm run build`.
- [ ] Revisar Inicio, Pacientes, Planes y Atal IA en móvil.
- [ ] Revisar Ajustes, Apariencia, Preferencias de Atal IA, Privacidad, Perfil y Ayuda.
- [ ] Revisar las cuatro pestañas del plan clínico.
- [ ] Revisar Expediente del paciente.
- [ ] Revisar tema oscuro.
- [ ] Confirmar que no existen recortes, superposiciones, overflow ni errores de consola.
