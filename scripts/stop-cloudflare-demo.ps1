[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$runtimeDirectory = Join-Path $repoRoot '.demo-runtime\iwear'

$targets = @(
    @{ Label = 'Cloudflare Tunnel'; PidFile = (Join-Path $runtimeDirectory 'cloudflared.pid'); ProcessName = 'cloudflared' },
    @{ Label = 'Backend Iwearing Hijab'; PidFile = (Join-Path $runtimeDirectory 'backend.pid'); ProcessName = 'node' }
)

Write-Host ''
Write-Host '=== Stop Iwearing Hijab Cloudflare Demo ===' -ForegroundColor Cyan
Write-Host ''

foreach ($target in $targets) {
    if (-not (Test-Path -LiteralPath $target.PidFile)) {
        Write-Host "$($target.Label): tidak dikelola launcher atau sudah berhenti." -ForegroundColor DarkGray
        continue
    }

    $storedPid = (Get-Content -LiteralPath $target.PidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($storedPid -notmatch '^\d+$') {
        Remove-Item -LiteralPath $target.PidFile -Force -ErrorAction SilentlyContinue
        Write-Host "$($target.Label): PID tidak valid; file status dibersihkan." -ForegroundColor Yellow
        continue
    }

    $process = Get-Process -Id ([int]$storedPid) -ErrorAction SilentlyContinue
    if ($process -and $process.ProcessName -eq $target.ProcessName) {
        Stop-Process -Id $process.Id -Force
        [void]$process.WaitForExit(5000)
        Write-Host "$($target.Label): berhenti." -ForegroundColor Green
    } else {
        Write-Host "$($target.Label): proses sudah tidak aktif." -ForegroundColor DarkGray
    }

    Remove-Item -LiteralPath $target.PidFile -Force -ErrorAction SilentlyContinue
}

Write-Host ''
Write-Host 'Demo telah dihentikan. URL Quick Tunnel sebelumnya tidak lagi aktif.' -ForegroundColor Yellow
