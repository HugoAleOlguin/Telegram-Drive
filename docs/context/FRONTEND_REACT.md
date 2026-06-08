# Frontend en React - Deep Dive Técnico

El frontend de Telegram Drive está construido con **React 19**, **TypeScript** y **Vite 7**. Utiliza CSS puro (Vanilla CSS) estructurado a través de CSS Modules para encapsular estilos y CSS custom properties para el sistema de diseño.

---

## 1. Enrutamiento y Estados de Pantalla

La aplicación no utiliza un enrutador pesado basado en URLs (como react-router), sino un estado simple de pantalla en [App.tsx](file:///c:/Users/HuGOD777/proyectos%20prime/telegram%20drive/src/App.tsx):
* **`'loading'`**: Pantalla de carga inicial mientras se comprueba si existe una sesión activa llamando a `authCheckSession()`.
* **`'login'`**: Pantalla de inicio de sesión de dos pasos ([LoginPage.tsx](file:///c:/Users/HuGOD777/proyectos%20prime/telegram%20drive/src/pages/LoginPage/LoginPage.tsx)).
* **`'drive'`**: Panel principal del gestor de archivos ([DrivePage.tsx](file:///c:/Users/HuGOD777/proyectos%20prime/telegram%20drive/src/pages/DrivePage/DrivePage.tsx)).

---

## 2. Sistema de Diseño y Tokens CSS

Los estilos base se configuran en [tokens.css](file:///c:/Users/HuGOD777/proyectos%20prime/telegram%20drive/src/styles/tokens.css). Se mantiene la regla estricta de **solo tema oscuro** (AMOLED black).

### Paleta de Colores de Fondo y Superficies
* `--surface-bg`: `#000000` (Fondo principal AMOLED).
* `--surface-panel`: `#0C0C0E` (Fondo de tarjetas, modales y barras).
* `--surface-input`: `#171719` (Campos de entrada).
* `--surface-hover`: `#202022` (Efectos hover en botones e items).
* `--surface-divider`: `rgba(255, 255, 255, 0.05)` (Bordes sutiles y divisores).

### Colores de Acento Dinámicos
Los colores principales (`--tg-accent`, `--tg-accent-dark`, y `--tg-accent-dim`) son dinámicos y pueden ser personalizados por el usuario. El script [accent-colors.ts](file:///c:/Users/HuGOD777/proyectos%20prime/telegram%20drive/src/utils/accent-colors.ts) expone la función `applyAccentColor(hex)` que altera las variables directamente en el `:root` del documento:
```typescript
export function applyAccentColor(hex: string) {
  document.documentElement.style.setProperty('--tg-accent', hex);
  document.documentElement.style.setProperty('--tg-accent-dark', darkenHex(hex, 15));
  document.documentElement.style.setProperty('--tg-accent-dim', `${hex}1F`); // 12% alpha
}
```
Esto permite aplicar temas instantáneamente sin recargar la página.

---

## 3. Internacionalización (i18n)

El proveedor de traducción en [src/locales/index.tsx](file:///c:/Users/HuGOD777/proyectos%20prime/telegram%20drive/src/locales/index.tsx) maneja el soporte de idiomas (EN y ES).

* **Acceso mediante Hook**: `const { t, ml, lang, setLang } = useTranslation();`
* **Traducción con Interpolación**:
  ```typescript
  t('stats', { c: fileCount, s: formattedSize })
  ```
  La función `t()` reemplaza las llaves `{key}` por el valor pasado dinámicamente.
* **Meses Localizados**: La función `ml(index)` devuelve el nombre del mes correspondiente (0-11) en el idioma seleccionado actual, facilitando la agrupación temporal.

---

## 4. Gestión de Estado y Caching (TanStack Query)

Se utiliza **TanStack Query (React Query)** para gestionar el estado de los archivos y reducir las llamadas redundantes al puente Tauri.

* **Listado de Archivos**:
  ```typescript
  const { data: files = [], isLoading } = useQuery({
    queryKey: ['files'],
    queryFn: listFiles,
    staleTime: 10_000, // Los datos se consideran frescos por 10 segundos
  });
  ```
* **Invalidación de Cache**: Al subir, renombrar o eliminar un archivo, se llama a `qc.invalidateQueries({ queryKey: ['files'] })` para forzar una sincronización limpia de la base de datos local al frontend.

---

## 5. Agrupación y Filtrado en DrivePage

Para optimizar el rendimiento y evitar cálculos pesados en cada renderizado, `DrivePage` implementa filtros mediante `useMemo`:

1. **`pf` (Filtered & Sorted Files)**:
   Filtra los archivos en base a la categoría seleccionada (`all` o tipos específicos como `image`, `video`, etc.) y la query de búsqueda (`searchQuery`). Luego, los ordena por fecha, nombre o tamaño según las preferencias seleccionadas.
2. **`grps` (Monthly Grouping)**:
   Agrupa la lista resultante de archivos `pf` en secciones por año y mes (`YYYY-MM`) usando la fecha de creación:
   ```typescript
   const grps = useMemo(() => {
     const m = new Map<string, DriveFile[]>();
     for (const f of pf) {
       const k = formatMonthKey(new Date(f.createdAt * 1000));
       if (!m.has(k)) m.set(k, []);
       m.get(k)!.push(f);
     }
     return Array.from(m.entries()).sort((a, b) => b[0].localeCompare(a[0]));
   }, [pf]);
   ```
   Esto divide visualmente el grid en agrupaciones mensuales (ej: "Mayo 2026", "Abril 2026").

---

## 6. Drag & Drop y Carga de Archivos

`DrivePage` intercepta eventos de arrastrar y soltar archivos en la ventana principal de la aplicación:
* `onDragOver` activa la pantalla de overlay (`isDragOver = true`) con un estilo de desenfoque y texto animado que indica que se pueden soltar archivos.
* `onDrop` cancela el overlay e invoca `hUp()`, el cual abre la ventana de carga para procesar y subir los archivos de forma asíncrona.
* Se mantiene una cola visual en `UploadQueue` indicando el progreso (si está pendiente, cargando, completado o si falló con algún error de comunicación).
