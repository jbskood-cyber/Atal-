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
npm run build
```

## Dirección visual

- B001/B002: sistema oficial de marca.
- M003/M004: navegación e Inicio en modo claro.
- M080 Graphite Clinical: modo oscuro oficial.
- M065: referencia histórica; no se utiliza como fuente principal.

El selector está en `Ajustes → Apariencia` y conserva la preferencia localmente.

## Alcance

Las rutas de pacientes, planes, ejercicios, actividad, reportes, exportaciones, Atal IA, ajustes y vista local del paciente están conectadas con datos de demostración. Supabase, Google Login, pagos, correos, APIs y despliegue se incorporarán en una fase posterior; no forman parte de este cierre visual.
