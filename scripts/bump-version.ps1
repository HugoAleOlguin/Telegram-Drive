param(
    [Parameter(Mandatory = $true)]
    [string]$NewVersion
)

$ErrorActionPreference = "Stop"

if ($NewVersion -notmatch '^\d+\.\d+\.\d+$') {
    Write-Host "ERROR: Formato invalido. Usa X.Y.Z (ej: 1.7.0)" -ForegroundColor Red
    exit 1
}

$Root = Split-Path $PSScriptRoot -Parent

$match = Select-String -Path "$Root\src-tauri\Cargo.toml" -Pattern '^version = "(\d+\.\d+\.\d+)"'
if (-not $match) {
    Write-Host "ERROR: No se pudo leer la version actual desde Cargo.toml" -ForegroundColor Red
    exit 1
}
$Old = $match.Matches[0].Groups[1].Value

Write-Host "`n==============================" -ForegroundColor Cyan
Write-Host " BUMP VERSION" -ForegroundColor Cyan
Write-Host "  Actual:  v$Old" -ForegroundColor Yellow
Write-Host "  Nueva:   v$NewVersion" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Cyan

$files = New-Object System.Collections.ArrayList
[void]$files.Add(@{ P = "src-tauri/Cargo.toml";        O = "version = `"$Old`"";     N = "version = `"$NewVersion`"";     L = "Cargo.toml" })
[void]$files.Add(@{ P = "src-tauri/tauri.conf.json";   O = "`"version`": `"$Old`"";  N = "`"version`": `"$NewVersion`"";  L = "tauri.conf.json" })
[void]$files.Add(@{ P = "package.json";                O = "`"version`": `"$Old`"";  N = "`"version`": `"$NewVersion`"";  L = "package.json" })
[void]$files.Add(@{ P = "package-lock.json";           O = "`"version`": `"$Old`"";  N = "`"version`": `"$NewVersion`"";  L = "package-lock.json" })
[void]$files.Add(@{ P = "src/locales/index.tsx";       O = "version: 'v$Old'";       N = "version: 'v$NewVersion'";       L = "locales/index.tsx" })

Write-Host "`nArchivos a modificar:" -ForegroundColor Cyan
foreach ($f in $files) {
    $fullPath = Join-Path $Root $f.P
    if (Test-Path $fullPath) {
        $content = Get-Content $fullPath -Raw
        if ($content.Contains($f.O)) {
            Write-Host "  [OK] $($f.L) -- $($f.P)" -ForegroundColor Green
        } else {
            Write-Host "  [--] $($f.L) -- patron no encontrado en $($f.P)" -ForegroundColor Red
        }
    } else {
        Write-Host "  [!!] $($f.L) -- archivo no existe: $($f.P)" -ForegroundColor Yellow
    }
}

$confirm = Read-Host "`nAplicar cambios? (s/N)"
if ($confirm -ne "s" -and $confirm -ne "S") {
    Write-Host "Cancelado." -ForegroundColor Yellow
    exit 0
}

$updated = 0
$failed = 0

foreach ($f in $files) {
    $fullPath = Join-Path $Root $f.P
    if (-not (Test-Path $fullPath)) {
        Write-Host "  [!!] Saltando $($f.P) (no existe)" -ForegroundColor Yellow
        $failed++
        continue
    }

    $content = Get-Content $fullPath -Raw
    if ($content.Contains($f.O)) {
        $newContent = $content.Replace($f.O, $f.N)
        Set-Content -Path $fullPath -Value $newContent -NoNewline
        Write-Host "  [OK] $($f.L)" -ForegroundColor Green
        $updated++
    } else {
        Write-Host "  [--] $($f.L) -- patron no encontrado" -ForegroundColor Red
        $failed++
    }
}

Write-Host "`n==============================" -ForegroundColor Cyan
Write-Host " RESUMEN" -ForegroundColor Cyan
Write-Host "  Actualizados:  $updated" -ForegroundColor Green
Write-Host "  Fallidos:      $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Gray" })
Write-Host "  Version:       $Old -> $NewVersion" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
Write-Host "==============================" -ForegroundColor Cyan

if ($failed -gt 0) { exit 1 }
Write-Host "`nUsa 'npm run tauri build' para compilar." -ForegroundColor Cyan
