# Validación E2E determinista con Playwright

## Propósito

Este documento define el método recomendado para validar Atal de forma rápida, reproducible y autónoma sin depender de Google AI Studio, una sesión interactiva de navegador o la computadora del usuario.

La fuente de verdad para los resultados es GitHub Actions.

## Resumen ejecutivo

El método consiste en:

1. levantar directamente la aplicación Atal con Vite;
2. ejecutar Playwright contra `http://127.0.0.1:3000`;
3. sembrar un estado ficticio y determinista en `atal:store:v2` antes de cada prueba;
4. interceptar únicamente `/api/atal-ai/analyze` para sustituir la respuesta externa de Gemini por fixtures controlados;
5. ejecutar la interfaz real, los contratos reales, el registro de herramientas, la política de riesgo, las transacciones, la auditoría y Deshacer;
6. ejecutar todo en GitHub Actions;
7. guardar reportes, capturas, videos y trazas cuando existe un fallo.

## Diferencia frente al intento anterior

### Enfoque anterior: automatizar Google AI Studio

El intento anterior usaba Playwright o control de computadora sobre la interfaz exterior de Google AI Studio.

Ese enfoque era lento y frágil porque:

- Atal estaba dentro de un preview o iframe administrado por AI Studio;
- la interfaz exterior tenía latencia propia;
- las recargas reconstruían el preview;
- los eventos globales `load` y `networkidle` no representaban correctamente que Atal estuviera lista;
- el tamaño de la ventana podía cambiar y ocultar controles;
- los clics podían caer en el panel exterior en vez de la aplicación;
- los datos de una prueba podían contaminar la siguiente;
- el resultado dependía de una sesión autenticada y de que la computadora permaneciera disponible.

En la práctica se estaba validando la capacidad del agente para controlar AI Studio, no el producto Atal.

### Enfoque actual: probar Atal directamente

La suite actual elimina toda la capa exterior de AI Studio.

Playwright inicia el servidor de Atal mediante `webServer`, abre la aplicación directamente y trabaja con selectores semánticos. La configuración está en `playwright.config.mjs`.

Las respuestas de Gemini se sustituyen de forma determinista en la frontera HTTP. No se simula el núcleo local de Atal.

Esto significa que permanecen bajo prueba real:

- la interfaz React;
- la normalización de respuestas;
- los contratos tipados;
- la resolución de entidades;
- el registro de herramientas;
- la clasificación de riesgo;
- la confirmación;
- las transacciones atómicas;
- los invariantes;
- la auditoría;
- Deshacer;
- la persistencia en `atal:store:v2`.

## Por qué siete pruebas pueden ser suficientes para un gate crítico

La suite de Block 4.1 contiene siete escenarios, pero no son siete comprobaciones simples. Cada escenario contiene múltiples assertions sobre interfaz, persistencia y estado interno.

Los escenarios actuales están en `e2e/block-4-1-critical.spec.mjs`:

1. **Dolor clínico**
   - rechaza texto no numérico;
   - conserva la versión anterior;
   - nunca persiste ni muestra `NaN`;
   - acepta coma decimal;
   - incrementa exactamente una versión;
   - persiste después de recargar.

2. **Consulta de Atal IA sin mutación**
   - muestra el resumen esperado;
   - compara el store completo antes y después;
   - demuestra que una consulta no modifica información clínica.

3. **Escritura reversible y Deshacer**
   - no modifica antes de la revisión;
   - exige confirmación;
   - aplica la nota;
   - registra auditoría estructurada;
   - excluye datos privados de la auditoría;
   - Deshacer restaura el estado anterior;
   - registra el resultado `undone`.

4. **Operación sensible**
   - prepara la acción;
   - cancelar produce cero mutaciones;
   - confirmar aplica únicamente sobre el plan objetivo;
   - registra el éxito correcto.

5. **Ambigüedad de identidad**
   - detecta nombres equivalentes tras normalización;
   - muestra una elección explícita;
   - evita crear o modificar una entidad arbitraria.

6. **Conflicto de versión**
   - crea un borrador;
   - simula una edición manual posterior;
   - detecta el borrador obsoleto;
   - deshabilita Aplicar;
   - conserva la versión más reciente sin mutación parcial.

7. **Smoke móvil y persistencia**
   - usa viewport de 390 px;
   - abre expediente, plan, ejercicio y Atal IA;
   - comprueba ausencia de overflow horizontal grave;
   - comprueba modo Claro y Graphite Clinical;
   - comprueba ausencia de errores fatales de página o consola.

El objetivo de esta suite es cubrir los riesgos críticos introducidos por Block 4.1, no repetir todas las pruebas unitarias ni recorrer manualmente cada combinación posible del producto.

## Qué no cubre todavía

La suite crítica no sustituye una auditoría total del producto. Actualmente no cubre exhaustivamente:

- cada estado posible de pacientes, planes y ejercicios;
- todas las rutas de la sesión guiada;
- cada variante de reporte;
- todos los tamaños y orientaciones de pantalla;
- accesibilidad completa con axe o lector de pantalla;
- pruebas visuales pixel a pixel;
- rendimiento y presupuestos de carga;
- modo offline y actualización del service worker;
- todos los errores posibles del endpoint de Gemini;
- una conversación real contra Gemini en cada ejecución.

Esos controles pueden añadirse por capas sin ralentizar el gate principal.

## Estrategia recomendada de crecimiento

### Capa 1 — Gate crítico de pull request

Debe mantenerse pequeña y rápida.

Objetivo aproximado:

- 7 a 12 escenarios;
- Chromium;
- un worker en CI;
- duración de pocos minutos;
- únicamente riesgos de seguridad, persistencia y regresiones principales.

Se ejecuta en cada pull request.

### Capa 2 — Regresión funcional ampliada

Puede crecer a 15–30 escenarios independientes:

- pacientes;
- expedientes;
- planes;
- ejercicios;
- sesiones guiadas;
- reportes;
- ajustes;
- errores de red;
- borradores y recuperación.

Puede ejecutarse en cada PR mientras conserve una duración razonable o mediante un workflow separado.

### Capa 3 — Matriz visual y accesibilidad

Ejecutar en un workflow separado o programado:

- 360, 390, 412 y 430 px;
- escritorio y tablet;
- Claro y Graphite Clinical;
- screenshots de referencia;
- navegación con teclado;
- contraste y nombres accesibles;
- reduced motion.

### Capa 4 — Integración real con Gemini

Debe ser un smoke breve y controlado, no la suite principal:

- una consulta sencilla;
- una propuesta estructurada;
- comprobación de que no existe error de API key.

No debe modificar información real y no debe ser requisito para ejecutar las pruebas deterministas locales.

## Arquitectura de archivos

- `playwright.config.mjs`
  - configura Chromium;
  - inicia Vite con `webServer`;
  - define timeouts, retries y artifacts.

- `e2e/fixtures.mjs`
  - crea el estado ficticio;
  - crea conversaciones y borradores;
  - siembra localStorage;
  - intercepta `/api/atal-ai/analyze`;
  - permite leer el store desde assertions.

- `e2e/block-4-1-critical.spec.mjs`
  - contiene los escenarios críticos independientes.

- `.github/workflows/e2e.yml`
  - instala dependencias con `npm ci`;
  - instala Playwright sin modificar el lockfile;
  - instala Chromium;
  - ejecuta la suite;
  - publica `playwright-report/` y `test-results/`.

## Reglas para escribir nuevas pruebas

1. Cada prueba debe poder ejecutarse sola.
2. Cada prueba debe sembrar su propio estado.
3. Solo se usan datos ficticios.
4. No se depende del orden de ejecución.
5. No se reutilizan cambios dejados por otra prueba.
6. Se usan `getByRole`, `getByLabel`, `getByText` o `getByPlaceholder` antes que selectores CSS internos.
7. No se usan coordenadas.
8. No se usan esperas largas arbitrarias.
9. Se usan assertions web-first de Playwright.
10. Las respuestas externas de Gemini se interceptan, pero el núcleo local nunca se reemplaza por mocks.
11. Una prueba de escritura debe comprobar el estado antes y después.
12. Una prueba de error debe comprobar cero mutación parcial.
13. Los eventos de auditoría deben revisarse por estructura y privacidad.
14. Los fallos deben conservar captura, video o trace cuando esté disponible.

## Clasificación de fallos

### Fallo del producto

Existe cuando el comportamiento incorrecto es reproducible directamente en Atal, por ejemplo:

- una acción modifica datos antes de confirmarse;
- una consulta modifica el store;
- una operación parcial queda persistida;
- una entidad ambigua se elige automáticamente;
- Deshacer no restaura el estado;
- aparece un error React fatal.

### Fallo de la prueba

Existe cuando la expectativa o el selector no representan el flujo real, por ejemplo:

- esperar el diálogo de confirmación antes de pulsar `Aplicar cambios`;
- buscar una etiqueta que cambió pero el comportamiento sigue correcto;
- sembrar un fixture inválido.

Debe corregirse la prueba sin alterar el producto.

### Fallo del entorno

Existe cuando GitHub Actions no puede instalar dependencias, Chromium no arranca o el runner falla antes de ejecutar la aplicación.

No debe clasificarse como fallo de Atal.

## Ejecución local

Con dependencias disponibles:

```bash
npm ci
npm install --no-save --no-package-lock @playwright/test@1.61.1
npx playwright install chromium
npx playwright test
```

Para abrir el reporte:

```bash
npx playwright show-report
```

## Ejecución en GitHub Actions

El workflow `e2e` se ejecuta automáticamente en pull requests y también puede iniciarse mediante `workflow_dispatch`.

La evidencia se publica como artifact `playwright-evidence` durante 14 días.

## Prompt reutilizable para Codex

Usa el siguiente prompt cuando un bloque nuevo necesite pruebas E2E rápidas y deterministas:

```text
Actúa como responsable autónomo de validación E2E del proyecto Atal.

OBJETIVO

Crear o ampliar una suite Playwright pequeña, determinista y ejecutable en GitHub Actions para validar los riesgos críticos del bloque actual.

No automatices Google AI Studio.
No uses @Computadora para la suite principal.
No dependas de una API key real.
No despliegues la aplicación.
No uses datos clínicos reales.

FUENTE DE VERDAD

Repositorio:
jbskood-cyber/Atal-

Rama:
<BRANCH>

HEAD esperado:
<EXPECTED_SHA>

Pull request:
<PR_NUMBER>

Contrato del bloque:
<CONTRACT_PATH>

Antes de modificar código:

1. lee el contrato canónico;
2. confirma rama, HEAD y working tree;
3. inspecciona `playwright.config.mjs`, `e2e/fixtures.mjs`, las suites existentes y `.github/workflows/e2e.yml`;
4. ejecuta o consulta el baseline actual;
5. identifica los riesgos nuevos introducidos por el bloque.

DISEÑO DE LA SUITE

- Prueba directamente Atal mediante el `webServer` de Playwright.
- Usa `http://127.0.0.1:3000`.
- Usa Chromium como gate principal.
- Mantén cada prueba independiente.
- Siembra `atal:store:v2` con datos ficticios mínimos y deterministas.
- Limpia o reemplaza conversaciones, borradores y tema para cada escenario.
- Intercepta únicamente `/api/atal-ai/analyze` cuando se necesite controlar una respuesta de Gemini.
- No simules el registro de herramientas, la política de riesgo, la resolución de entidades, las transacciones, la auditoría ni Deshacer.
- Usa el código real de Atal para todo lo anterior.

SELECCIÓN DE PRUEBAS

No construyas una matriz gigantesca.

Selecciona entre 5 y 12 escenarios que cubran los riesgos más importantes del bloque:

- regresión directa del defecto corregido;
- consulta sin mutación;
- escritura antes y después de confirmación;
- cancelación con cero cambios;
- operación sensible;
- Deshacer;
- ambigüedad;
- conflicto o concurrencia;
- persistencia después de reload;
- smoke móvil;
- errores fatales de consola o página;
- privacidad de auditoría.

Cada escenario debe comprobar múltiples condiciones relevantes, no únicamente que una pantalla sea visible.

MÉTODO

- Usa `getByRole`, `getByLabel`, `getByText` y `getByPlaceholder`.
- No uses coordenadas.
- No uses sleeps arbitrarios.
- Usa assertions web-first.
- Compara el store completo o las entidades afectadas antes y después.
- Comprueba cero mutación parcial en fallos.
- Comprueba auditoría estructurada y ausencia de datos privados.
- Conserva screenshot, video y trace en fallos.

TDD Y CORRECCIONES

Si una prueba descubre un fallo reproducible del producto:

1. conserva la prueba roja;
2. documenta el comportamiento esperado y actual;
3. realiza una corrección quirúrgica;
4. ejecuta la suite específica;
5. ejecuta toda la suite E2E;
6. ejecuta quality;
7. publica un commit enfocado.

Si falla una expectativa incorrecta del test, corrige solamente el test.
No cambies el producto para satisfacer un test mal diseñado.

GITHUB ACTIONS

Mantén o amplía `.github/workflows/e2e.yml`.

Debe:

- ejecutar `npm ci`;
- instalar Playwright sin modificar `package-lock.json` cuando todavía no sea dependencia del proyecto;
- instalar Chromium y dependencias del sistema;
- ejecutar la suite con un worker en CI;
- subir `playwright-report/` y `test-results/` si la ejecución no fue cancelada.

VALIDACIÓN FINAL

Confirma con evidencia fresca:

- quality PASS;
- E2E PASS;
- número exacto de pruebas aprobadas y fallidas;
- artifact publicado;
- `package-lock.json` intacto, salvo autorización explícita;
- `atal:store:v2` y versión 2 intactos;
- PR abierto, draft y sin fusionar.

Publica en el PR:

# Validación E2E determinista — <BLOCK_NAME>

Incluye:

- SHA;
- riesgos cubiertos;
- escenarios añadidos;
- assertions principales;
- resultado exacto de quality;
- resultado exacto de E2E;
- artifact;
- fallos de producto corregidos;
- fallos de test corregidos;
- limitaciones y puntos no cubiertos.

No marques el PR como listo y no fusiones sin autorización explícita del usuario.
```

## Cuándo añadir más pruebas

Añade pruebas cuando:

- una regresión real fue descubierta;
- se incorpora una nueva herramienta de Atal IA;
- cambia una regla de riesgo o confirmación;
- cambia la estructura persistida;
- aparece una nueva operación sensible;
- se añade una ruta crítica del paciente o fisioterapeuta;
- un bug costoso puede reproducirse automáticamente.

No añadas pruebas redundantes únicamente para aumentar el número total.

La métrica principal es la cobertura de riesgos y regresiones relevantes, no la cantidad bruta de casos.
