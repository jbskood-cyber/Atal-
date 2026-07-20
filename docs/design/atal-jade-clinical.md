# Atal Jade Clinical

Sistema cromático global para unificar Atal antes de aplicar cambios pantalla por pantalla.

## Principio central

- Colores sólidos únicamente.
- Prohibidos los degradados en iconos, chips, tarjetas, botones y navegación.
- Los contenedores de icono usan jade suave sólido con el símbolo blanco.
- El verde se reserva para marca, acción primaria, progreso alto y éxito.
- La estructura se construye con blanco, negro y grises fríos.
- Amarillo, rojo y azul aparecen solo cuando existe un estado semántico real.

## Paleta clara

| Token | Valor | Uso |
|---|---:|---|
| `--atal-brand-logo` | `#2F8A70` | Logotipo y detalles de marca |
| `--atal-icon-solid` | `#559E88` | Fondo sólido de iconos con símbolo blanco |
| `--atal-action-primary` | `#137A5A` | CTA principal |
| `--atal-accent` | `#2F8A70` | Línea activa, check y detalles pequeños |
| `--atal-canvas` | `#F7F9F8` | Fondo general |
| `--atal-surface` | `#FFFFFF` | Tarjetas, inputs, sheets y navegación |
| `--atal-surface-selected` | `#F1F4F3` | Selección neutra |
| `--atal-text-primary` | `#151A1E` | Texto principal |
| `--atal-text-secondary` | `#5E6965` | Texto secundario |
| `--atal-border-subtle` | `#E2E7E4` | Divisores y bordes ligeros |

## Paleta oscura

| Token | Valor | Uso |
|---|---:|---|
| `--atal-canvas` | `#0B0C0D` | Fondo negro profundo |
| `--atal-surface` | `#151817` | Superficie principal |
| `--atal-surface-raised` | `#1C211F` | Sheets y superficies elevadas |
| `--atal-icon-solid` | `#3F9278` | Iconos sólidos con símbolo blanco |
| `--atal-action-primary` | `#24785F` | CTA principal |
| `--atal-accent` | `#55A88A` | Estados activos y detalles |
| `--atal-text-primary` | `#F4F6F5` | Texto principal |
| `--atal-text-secondary` | `#A9B2AE` | Texto secundario |
| `--atal-border-subtle` | `#2B312E` | Divisores |

## Estados semánticos

| Estado | Claro | Oscuro |
|---|---:|---:|
| Éxito | `#1F8A5B` | `#55A88A` |
| Atención | `#B66B16` | `#D99A45` |
| Riesgo/error | `#C83D4A` | `#E36A75` |
| Información | `#3F6F8E` | `#73A2BF` |

## Progreso

- Bajo: coral sólido.
- Intermedio: gris frío sólido.
- Alto: jade sólido.
- Completo: verde sólido con texto blanco.
- Nunca usar amarillo como decoración de progreso.

## Regla de distribución

- 80% blanco, negro y grises fríos.
- 15% jade de marca.
- 5% estados semánticos.

## Migración

El archivo `app/atal-theme-tokens.css` incluye alias compatibles con los nombres anteriores (`--green`, `--mint`, `--ink`, etc.) para permitir una adopción gradual sin romper rutas, componentes ni comportamiento.

La aplicación de estos tokens a `app/globals.css` y a cada componente debe hacerse en una fase separada y validada visualmente. Esta definición no rediseña pantallas por sí sola.
