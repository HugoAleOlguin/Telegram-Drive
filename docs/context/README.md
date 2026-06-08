# Guía de Contexto para Agentes de IA - Telegram Drive

Este directorio contiene la documentación técnica estructurada y detallada en formato 1:1 para que cualquier agente de IA o desarrollador comprenda instantáneamente la arquitectura, los flujos y las restricciones del proyecto.

## Mapa de Documentación

| Archivo | Contenido |
| :--- | :--- |
| [README.md](file:///c:/Users/HuGOD777/proyectos%20prime/telegram%20drive/docs/context/README.md) | Esta guía de inicio, reglas del proyecto y mapa general. |
| [ARCHITECTURE.md](file:///c:/Users/HuGOD777/proyectos%20prime/telegram%20drive/docs/context/ARCHITECTURE.md) | Flujo general frontend-backend, sincronización e indexación local. |
| [BACKEND_RUST.md](file:///c:/Users/HuGOD777/proyectos%20prime/telegram%20drive/docs/context/BACKEND_RUST.md) | Deep dive en Tauri 2, rusqlite y grammers (MTProto Telegram client). |
| [FRONTEND_REACT.md](file:///c:/Users/HuGOD777/proyectos%20prime/telegram%20drive/docs/context/FRONTEND_REACT.md) | Tokens CSS, i18n, React Query y vistas. |
| [IMPROVEMENTS.md](file:///c:/Users/HuGOD777/proyectos%20prime/telegram%20drive/docs/context/IMPROVEMENTS.md) | Análisis de bugs resueltos y propuestas detalladas de mejora técnica. |

---

## Reglas Críticas e Invariantes del Proyecto

Al modificar o analizar este código, **NUNCA** debes violar estas reglas (establecidas en [AGENTS.md](file:///c:/Users/HuGOD777/proyectos%20prime/telegram%20drive/AGENTS.md)):

1. **Tema Oscuro Únicamente**: No existe ni debe agregarse soporte para tema claro. El archivo [tokens.css](file:///c:/Users/HuGOD777/proyectos%20prime/telegram%20drive/src/styles/tokens.css) está diseñado puramente para dark mode AMOLED.
2. **Sin Fondos Personalizados**: El fondo de la aplicación es fijo con un efecto de glassmorphism premium. No reintroducir deslizadores de desenfoque ni selector de fondos.
3. **Sin Gestión de Carpetas**: El almacenamiento es plano. Se sube directamente a los Mensajes Guardados del usuario (Saved Messages) con `folder_id = 'self'`.
4. **i18n Estricto**: Todo texto visible en el frontend debe pasar a través del hook `useTranslation()` y estar definido en [src/locales/index.tsx](file:///c:/Users/HuGOD777/proyectos%20prime/telegram%20drive/src/locales/index.tsx).
5. **Animaciones**: Las reglas `@keyframes` deben residir únicamente en [global.css](file:///c:/Users/HuGOD777/proyectos%20prime/telegram%20drive/src/styles/global.css). Los módulos de CSS de los componentes deben reutilizar las clases utilitarias de animación.
6. **No Re-agregar Código Eliminado**: Se eliminó permanentemente el minijuego de la serpiente (SnakeGame), el explorador de archivos redundante y el soporte de árbol de carpetas.

---

## Flujos de Trabajo Comunes en Desarrollo

### Ejecutar en Desarrollo
```bash
npm run tauri dev
```
*Nota: Se requiere ejecutar el terminal con privilegios de Administrador en Windows debido al bindeo de puertos internos de Tauri.*

### Compilar para Producción
```bash
npm run tauri build
```

### Generar Ejecutable Portable
```bash
npm run portable
```
