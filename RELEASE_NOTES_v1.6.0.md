## v1.6.0 — Auto-update + Nuevo icono

### Novedades

- **Actualización automática**: Telegram Drive ahora puede actualizarse solo. Andá a *Settings → Buscar actualizaciones* para ver si hay una versión más nueva, descargarla e instalarla con un solo clic. La app se reinicia automáticamente con la nueva versión.
- **Nuevo icono**: Actualizado el logo de la aplicación.

### Cómo publicar una release

```bash
git tag v1.6.0
git push origin v1.6.0
```

GitHub Actions buildeará el EXE y el ZIP portable, y creará la Release automáticamente.

### Assets

- `Telegram Drive.exe` — Ejecutable portable (arrastrar y ejecutar)
- `TelegramDrive_v1.6.0_portable.zip` — Versión portable comprimida
