# Atal — Checklist quirúrgica residual · Ronda 4

**Rama:** `feature/atal-unified-visual-system`  
**Origen:** 8 capturas móviles posteriores a la primera ejecución de QA  
**Alcance:** marca, verde oficial, Atal IA, encabezado, Inicio y navegación inferior.  
**Protección:** sin cambios en rutas, datos, stores, IndexedDB o lógica clínica.

## Estado

- `IMPLEMENTADO`: cambio presente en componentes o capas visuales finales.
- `PENDIENTE QA`: debe comprobarse en la aplicación renderizada antes de fusionar.

## Verde y marca

- [x] R4-01 — Verde oficial único `#7EB695`. **IMPLEMENTADO / PENDIENTE QA**
- [x] R4-02 — Neutralizar verdes oscuros, saturados o azulados. **IMPLEMENTADO / PENDIENTE QA**
- [x] R4-03 — Fondos suaves derivados únicamente por transparencia. **IMPLEMENTADO / PENDIENTE QA**
- [x] R4-04 — Símbolo de Atal alineado con el verde oficial. **IMPLEMENTADO / PENDIENTE QA**
- [x] R4-05 — Símbolos de Atal IA alineados con el verde oficial. **IMPLEMENTADO / PENDIENTE QA**
- [x] R4-06 — Botones principales con el verde oficial. **IMPLEMENTADO / PENDIENTE QA**

## Atal IA

- [x] R4-07 — Eliminar el copy “Borrador editable”. **IMPLEMENTADO / PENDIENTE QA**
- [x] R4-08 — Reacomodar el título del borrador. **IMPLEMENTADO / PENDIENTE QA**
- [x] R4-09 — Reducir la altura del encabezado. **IMPLEMENTADO / PENDIENTE QA**
- [x] R4-10 — Ajustar tamaño y posición del símbolo central. **IMPLEMENTADO / PENDIENTE QA**
- [x] R4-11 — Permitir que el último chip se vea completo al desplazarse. **IMPLEMENTADO / PENDIENTE QA**
- [x] R4-12 — Márgenes inicial y final del carrusel. **IMPLEMENTADO / PENDIENTE QA**
- [x] R4-13 — Separación entre chips y tarjeta del borrador. **IMPLEMENTADO / PENDIENTE QA**
- [x] R4-14 — Unificar verdes internos de Atal IA. **IMPLEMENTADO / PENDIENTE QA**
- [x] R4-15 — Reducir protagonismo de cápsulas `0%`. **IMPLEMENTADO / PENDIENTE QA**
- [x] R4-16 — Aviso “Conversación recuperada” dentro del flujo, sin superposición. **IMPLEMENTADO / PENDIENTE QA**
- [x] R4-17 — Placeholder del compositor más legible. **IMPLEMENTADO / PENDIENTE QA**

## Encabezado e Inicio

- [x] R4-18 — Campana de 44 × 44 px, icono proporcionado y punto legible. **IMPLEMENTADO / PENDIENTE QA**
- [x] R4-19 — Métricas de Inicio sin colisiones. **IMPLEMENTADO / PENDIENTE QA**
- [x] R4-20 — Iconos clínicos invertidos: superficie blanca, glifo y borde semánticos. **IMPLEMENTADO / PENDIENTE QA**

## Logotipo y navegación

- [x] R4-21 — Retirar “Fisioterapia” y conservar símbolo + Atal. **IMPLEMENTADO / PENDIENTE QA**
- [x] R4-22 — Eliminar subrayado de navegación activa. **IMPLEMENTADO / PENDIENTE QA**
- [x] R4-23 — Dock con material liquid glass plano, sin degradados. **IMPLEMENTADO / PENDIENTE QA**
- [x] R4-24 — Estado activo mediante cápsula menta suave. **IMPLEMENTADO / PENDIENTE QA**
- [x] R4-25 — Botón Atal IA integrado al mismo material del dock. **IMPLEMENTADO / PENDIENTE QA**

## Archivos

- `src/components/atal/AtalLogo.tsx`
- `src/features/atal-ai/components/ConversationalDraftCard.tsx`
- `src/styles/atal-residual-polish.css`
- `src/styles/atal-residual-compat.css`
- `src/main.tsx`

## Validación obligatoria

- [ ] Ejecutar `npm run build`.
- [ ] Revisar Inicio en 360–430 px.
- [ ] Revisar Atal IA con conversación, chips, borrador abierto y toast.
- [ ] Revisar el encabezado y la campana con y sin notificaciones.
- [ ] Revisar el dock en Inicio y Atal IA.
- [ ] Revisar Atención clínica y Reportes recientes.
- [ ] Revisar modo oscuro.
- [ ] Confirmar ausencia de recortes, superposiciones, overflow y errores de consola.
