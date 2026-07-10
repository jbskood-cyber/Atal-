# Atal v1 - Repositorio Inicial Listo

Este es un **scaffold técnico inicial mínimo** para el proyecto **Atal v1**. Ha sido diseñado de forma deliberadamente minimalista, limpia y modular, listo para ser conectado a un repositorio de GitHub bajo el nombre `atal-v1`.

Tanto la pantalla actual como toda la estructura técnica sirven únicamente como un **contenedor de arranque vacío y ejecutable**. La reconstrucción final de Atal será realizada desde cero por **ChatGPT Work** y **Codex**, siguiendo estrictamente los 79 mockups oficiales y los documentos técnicos D003 y D004.

---

## 🚀 Requisitos Técnicos Cubiertos

El proyecto está preconfigurado para ejecutarse de manera inmediata con las tecnologías requeridas:
- **React 19**
- **TypeScript 5 (Strict Mode)**
- **Tailwind CSS v4** (Integrado y funcional)
- **ESLint** (Configurado para mantener el código libre de advertencias y errores)
- **React Router Dom** (Instalado y disponible para configurar el enrutamiento posterior)
- **Next.js 15** (Como motor del contenedor para facilitar el levantamiento, previsualización y despliegue inmediato en puerto 3000)

---

## 📂 Estructura del Proyecto

La estructura del código incluye los directorios básicos recomendados para facilitar la futura transición y la adición de componentes de producto:

```text
├── app/                     # Rutas y vistas de Next.js (Visualización en /)
│   ├── globals.css          # Estilos globales y Tailwind CSS
│   ├── layout.tsx           # Diseño del layout raíz con metaetiquetas de Atal v1
│   └── page.tsx             # Pantalla única temporal responsive
├── src/                     # Estructura del repositorio limpio para reconstrucción
│   ├── routes/              # Directorio reservado para enrutamiento
│   ├── components/          # Directorio para componentes reutilizables
│   ├── styles/              # Directorio para estilos CSS/SCSS adicionales
│   └── assets/              # Directorio para imágenes, SVGs y fuentes
├── package.json             # Scripts y dependencias oficiales del proyecto
├── tsconfig.json            # Configuración estricta de TypeScript
├── eslint.config.mjs        # Configuración de ESLint
└── README.md                # Esta guía del scaffold temporal
```

---

## 🛠️ Scripts Disponibles

Puedes utilizar los siguientes comandos estándar para controlar el ciclo de vida del desarrollo:

- **Instalar dependencias**:
  ```bash
  npm install
  ```

- **Ejecutar en modo desarrollo**:
  ```bash
  npm run dev
  ```

- **Ejecutar verificación de tipos (TypeScript)**:
  ```bash
  npm run typecheck
  ```

- **Ejecutar análisis de código (Lint)**:
  ```bash
  npm run lint
  ```

- **Construir el proyecto para producción**:
  ```bash
  npm run build
  ```

---

## ⚠️ Recordatorio Importante para Desarrollo Futuro

Este repositorio no contiene:
- Ninguna base de datos o almacenamiento persistente (Firebase, Supabase, SQL, etc.).
- Autenticación ni llamadas a APIs de inteligencia artificial.
- Lógica de negocio de pacientes, planes, ejercicios, reportes o pagos.
- Datos mock, plantillas copiadas de proyectos anteriores, ni variables de entorno de producción ficticias.

Es un **contenedor técnico puro e higiénico**. ¡Listo para la acción!
