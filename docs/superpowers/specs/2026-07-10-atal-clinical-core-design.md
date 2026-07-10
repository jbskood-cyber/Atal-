# Atal v1 — Diseño del Gran Bloque 1: núcleo clínico funcional

Fecha: 10 de julio de 2026  
Estado: aprobado para planificación técnica  
Repositorio: `jbskood-cyber/Atal-`  
Rama de construcción: `main`  
Superficie de revisión: preview de Google AI Studio

## 1. Objetivo

Transformar el scaffold temporal de Atal en una aplicación web clínica, navegable y funcional que reproduzca fielmente los mockups oficiales y permita gestionar pacientes, ejercicios y planes terapéuticos dentro del preview de Google AI Studio.

La prioridad de esta etapa es la fidelidad visual y el funcionamiento del núcleo clínico. No se implementarán servicios externos ni despliegues adicionales.

## 2. Fuentes de verdad

La implementación respetará esta jerarquía:

1. Mockups M001–M079: composición, geometría, densidad, estados, estética y comportamiento responsive visible.
2. D003: contratos funcionales, reglas de producto, datos mínimos y criterios de aceptación.
3. D004: fronteras técnicas, rutas, pruebas y proceso de entrega, excepto cualquier apartado de infraestructura expresamente diferido por esta especificación.
4. Código en `main`: implementación concreta sin inventar reglas de producto.

Cuando dos mockups sean variantes, se implementará primero el marcado como Principal. Las alternativas solo aportarán detalles que no contradigan la referencia principal.

## 3. Alcance

### 3.1 Fundamentos visuales

- Sustituir por completo la pantalla “Repositorio inicial listo”.
- Crear tokens de color, tipografía, espaciado, radios, bordes, sombras, superficies y modo oscuro.
- Incorporar la marca final de cuatro bucles.
- Crear componentes propios de Atal; no adoptar una apariencia genérica de librerías visuales.
- Preparar rutas reproducibles para cada pantalla incluida.
- Mantener TypeScript estricto y el proyecto ejecutable en Google AI Studio.

### 3.2 Shell y navegación

Referencias principales: M003, M004, M065, M076 y M077.

- Navegación inferior móvil con Inicio, Pacientes y Planes.
- Menú secundario para Ejercicios, Seguimiento, Reportes y Ajustes.
- Acceso independiente a Atal IA.
- Navegación equivalente de escritorio mediante sidebar.
- Encabezados, acciones, navegación hacia atrás y estados activos.
- Ocultamiento de controles inferiores cuando el teclado cubra formularios.
- Tema claro, oscuro y preferencia del sistema.
- Inicio alimentado por el mismo estado local de pacientes y planes.

### 3.3 Pacientes

Referencias: M005, M009, M021, M030, M031, M032, M041, M042 y M069.

- Crear, editar, buscar, filtrar, ordenar, archivar y restaurar pacientes.
- Abrir un expediente con resumen, métricas, historial, notas y documentos.
- Validar campos obligatorios y duplicados probables.
- Confirmar acciones destructivas.
- Actualizar inmediatamente listas, contadores y relaciones.
- Conservar un único propietario conceptual, aunque todavía no exista autenticación.

### 3.4 Biblioteca de ejercicios

Referencias: M012, M014, M022, M025 y M039.

- Crear y editar plantillas de ejercicio.
- Buscar y filtrar por nombre, región y categoría.
- Consultar instrucciones, precauciones, dosis y medios.
- Seleccionar varios ejercicios para un plan.
- Mantener separada la plantilla reutilizable de la prescripción asignada a un plan.
- Permitir que la configuración del plan cambie sin modificar la plantilla original.

### 3.5 Planes terapéuticos

Referencias: M007, M008, M023, M028, M036, M037, M038, M039, M040 y M061.

- Crear planes asociados a pacientes.
- Guardar borradores.
- Añadir, eliminar y reordenar ejercicios.
- Personalizar series, repeticiones, duración y notas por ejercicio.
- Configurar título, objetivo, duración y frecuencia.
- Revisar antes de activar.
- Mantener como máximo un plan activo por paciente.
- Mostrar resumen y progreso.
- Preparar visualmente compartir, copiar enlace y descargar PDF sin backend real.

### 3.6 Estados transversales

Referencias: M062, M064, M069, M070, M073, M074 y M075 cuando apliquen al alcance.

- Estados vacíos.
- Skeletons de carga.
- Errores recuperables.
- Confirmaciones.
- Búsqueda sin resultados.
- Formularios incompletos.
- Límites.
- Acciones en progreso.
- Estado offline visual, sin implementar sincronización remota.

## 4. Fuera de alcance

No se implementará en este bloque:

- Netlify o cualquier configuración de despliegue adicional.
- Rama `production`.
- Login o Google OAuth.
- Supabase, PostgreSQL, Storage o RLS.
- Gemini o llamadas reales de IA.
- Mercado Pago, Stripe o webhooks.
- Resend o correo transaccional.
- Suscripciones reales.
- Dominio definitivo.
- Datos de producción.
- Portal público conectado a backend.
- PDFs finales generados en servidor.

Las pantallas visibles relacionadas con futuras integraciones solo podrán aparecer como estados visuales coherentes; no incluirán secretos, llamadas falsas ni proveedores simulados.

## 5. Arquitectura local temporal

La interfaz no accederá directamente a `localStorage`. Se implementará una capa de contratos y un adaptador local reemplazable.

Operaciones mínimas:

- `createPatient(input)`
- `updatePatient(patientId, patch)`
- `archivePatient(patientId)`
- `restorePatient(patientId)`
- `createExerciseTemplate(input)`
- `updateExerciseTemplate(exerciseId, patch)`
- `createPlan(input)`
- `updatePlan(planId, patch)`
- `activatePlan(planId)`
- `resetDemoData()`

El adaptador local:

- iniciará con fixtures deterministas;
- persistirá cambios en el navegador;
- conservará relaciones e identificadores estables;
- permitirá restablecer la información inicial;
- podrá sustituirse posteriormente por Supabase sin cambiar las pantallas.

Los componentes consumirán modelos de vista o contratos de dominio. No se crearán snapshots globales ni un contexto único que contenga toda la aplicación.

## 6. Rutas del bloque

- `/` o `/app`: Inicio.
- `/patients`: lista de pacientes.
- `/patients/new`: nuevo paciente.
- `/patients/:patientId`: resumen.
- `/patients/:patientId/metrics`: métricas.
- `/patients/:patientId/history`: historial.
- `/patients/:patientId/documents`: notas y documentos.
- `/exercises`: biblioteca.
- `/exercises/new`: nuevo ejercicio.
- `/exercises/:exerciseId`: detalle.
- `/plans`: lista de planes.
- `/plans/new`: nuevo plan.
- `/plans/:planId`: resumen.
- `/plans/:planId/edit`: constructor.
- `/plans/:planId/progress`: progreso.
- `/plans/:planId/review`: revisión y activación.
- `/settings/appearance`: apariencia mínima necesaria para tema.

No se añadirá protección de rutas hasta implementar autenticación.

## 7. Flujos de aceptación

### Flujo de paciente

1. Abrir Pacientes.
2. Buscar y filtrar.
3. Crear un paciente válido.
4. Abrir su expediente.
5. Editar datos y agregar notas.
6. Archivar y restaurar.
7. Ver el cambio reflejado en Inicio.

### Flujo de ejercicio

1. Abrir la biblioteca.
2. Buscar y filtrar.
3. Crear una plantilla.
4. Abrir su detalle.
5. Editarla.
6. Seleccionarla desde un plan.

### Flujo de plan

1. Crear un plan para un paciente.
2. Añadir ejercicios.
3. Personalizar y reordenar.
4. Guardar como borrador.
5. Revisar.
6. Activar.
7. Ver el plan activo en Pacientes, Planes e Inicio.
8. Recargar el preview y conservar el estado.

## 8. Fidelidad visual

Viewports de comprobación:

- Móvil: 430 × 764 CSS px.
- Escritorio: 1440 × 810 CSS px.
- Oscuro: mismo viewport de la pantalla equivalente.

Cada pantalla deberá conservar:

- jerarquía y orden;
- alineación y agrupación;
- ancho y densidad;
- márgenes y espaciados;
- tipografía y truncado;
- colores y estados;
- iconografía;
- botones y controles;
- navegación fija;
- scroll y safe areas;
- comportamiento responsive.

La inspección combinará capturas, superposición visual y revisión humana. Una ruta funcional que no coincide de forma perceptible con su mockup seguirá incompleta.

## 9. Calidad y verificación

Antes de considerar terminado el bloque:

- la pantalla temporal habrá desaparecido;
- todas las rutas del alcance serán navegables;
- los controles visibles del núcleo clínico tendrán comportamiento;
- la persistencia local sobrevivirá a una recarga;
- no existirán claves ni secretos;
- TypeScript pasará sin errores;
- lint pasará sin errores;
- el build de Google AI Studio finalizará correctamente;
- los flujos de paciente, ejercicio y plan estarán verificados;
- móvil, escritorio y modo oscuro estarán revisados visualmente.

## 10. Estrategia de Git

- El trabajo se realizará en `main`, por decisión explícita del propietario.
- Cada avance se dividirá en commits coherentes y recuperables.
- `main` deberá permanecer ejecutable al cerrar cada checkpoint.
- GitHub será la fuente de verdad.
- No se importará código del repositorio anterior.
- No se modificará infraestructura externa durante este bloque.

## 11. Orden de implementación

1. Estabilizar scaffold y tokens visuales.
2. Construir shell móvil y escritorio.
3. Implementar capa local y datos deterministas.
4. Implementar Pacientes.
5. Implementar Ejercicios.
6. Implementar Planes.
7. Integrar Inicio con el estado clínico.
8. Añadir estados transversales y modo oscuro.
9. Ejecutar pruebas funcionales.
10. Corregir fidelidad visual pantalla por pantalla.

## 12. Definición de terminado

El Gran Bloque 1 estará terminado cuando `main` muestre en Google AI Studio una aplicación Atal que ya no parezca un scaffold, reproduzca los mockups del alcance, permita gestionar pacientes, ejercicios y planes, conserve cambios localmente, funcione en móvil y escritorio y esté preparada para sustituir el adaptador local por servicios reales en una fase posterior.
