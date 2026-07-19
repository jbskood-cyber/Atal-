# Atal

Aplicación web clínica mobile-first para fisioterapeutas. La versión actual es un prototipo frontend navegable: reproduce la experiencia visual aprobada con datos locales, sin autenticación ni integraciones externas.

## Stack actual

- React 19 + TypeScript
- Vite 6
- React Router (navegación SPA instantánea)
- Tailwind CSS v4 y CSS de producto
- Poppins autohospedada

La cabecera y la navegación permanecen montadas mientras cambia el contenido de cada ruta. Esto evita recargas y compilaciones de páginas durante el uso dentro de AI Studio.

## Uso

```bash
npm install
npm run dev
```

El servidor de desarrollo usa el puerto `3000`. Verificaciones disponibles:

```bash
npm run typecheck
npm run test
npm run build
```

## Dirección visual

- Atal Green: identidad principal sobre superficies claras, con verde estructural para navegación y acciones.
- Atal Dark: entorno grafito de alto contraste con el mismo acento verde.
- El selector está en `Ajustes → Apariencia` y conserva la preferencia localmente.
- Una preferencia histórica no reconocida, incluida `blue`, migra automáticamente a Atal Green.

## Alcance

Las rutas de pacientes, planes, ejercicios, actividad, reportes, exportaciones, Atal IA, ajustes y vista local del paciente están conectadas con datos de demostración. Supabase, Google Login, pagos, correos, APIs y despliegue se incorporarán en una fase posterior; no forman parte de este cierre visual.
