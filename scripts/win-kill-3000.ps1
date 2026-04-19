# Libera el puerto 3000 en Windows (otra instancia de Node suele dejar la API vieja).
$ErrorActionPreference = 'SilentlyContinue'
$pids = Get-NetTCPConnection -LocalPort 3000 -State Listen | Select-Object -ExpandProperty OwningProcess -Unique
if ($pids) {
  $pids | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
  Write-Host "Cerrados procesos en puerto 3000: $($pids -join ', ')"
} else {
  Write-Host "Puerto 3000 sin listener (ya libre)."
}
