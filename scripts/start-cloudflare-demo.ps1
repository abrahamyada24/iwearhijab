[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDirectory = Join-Path $repoRoot 'pos-be'
$backendEnvFile = Join-Path $backendDirectory '.env'
$runtimeDirectory = Join-Path $repoRoot '.demo-runtime\kasirpos'
$backendPidFile = Join-Path $runtimeDirectory 'backend.pid'
$tunnelPidFile = Join-Path $runtimeDirectory 'cloudflared.pid'
$backendOutputLog = Join-Path $runtimeDirectory 'backend.log'
$backendErrorLog = Join-Path $runtimeDirectory 'backend-error.log'
$tunnelOutputLog = Join-Path $runtimeDirectory 'cloudflared.log'
$tunnelErrorLog = Join-Path $runtimeDirectory 'cloudflared-error.log'
$healthUrl = 'http://127.0.0.1:5100/api/health'

function Get-ManagedProcess {
    param(
        [Parameter(Mandatory = $true)][string]$PidFile,
        [Parameter(Mandatory = $true)][string]$ExpectedProcessName
    )

    if (-not (Test-Path -LiteralPath $PidFile)) {
        return $null
    }

    $storedPid = (Get-Content -LiteralPath $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($storedPid -notmatch '^\d+$') {
        Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
        return $null
    }

    $process = Get-Process -Id ([int]$storedPid) -ErrorAction SilentlyContinue
    if (-not $process -or $process.ProcessName -ne $ExpectedProcessName) {
        Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
        return $null
    }

    return $process
}

function Test-BackendHealth {
    try {
        $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 4
        return $health.server -eq 'ONLINE' -and $health.database -eq 'CONNECTED'
    } catch {
        return $false
    }
}

function Wait-ForBackend {
    param([int]$TimeoutSeconds = 40)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-BackendHealth) {
            return $true
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Find-TunnelUrl {
    $combinedLog = ''
    foreach ($logPath in @($tunnelOutputLog, $tunnelErrorLog)) {
        if (Test-Path -LiteralPath $logPath) {
            $combinedLog += "`n" + (Get-Content -LiteralPath $logPath -Raw -ErrorAction SilentlyContinue)
        }
    }

    # Abaikan endpoint API Cloudflare; yang dibutuhkan adalah hostname acak Quick Tunnel.
    $match = [regex]::Match($combinedLog, 'https://(?!api\.)[a-z0-9-]+\.trycloudflare\.com', 'IgnoreCase')
    if ($match.Success) {
        return $match.Value
    }
    return $null
}

function Wait-ForTunnelUrl {
    param([int]$TimeoutSeconds = 45)

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $url = Find-TunnelUrl
        if ($url) {
            return $url
        }
        Start-Sleep -Seconds 1
    }
    return $null
}

Write-Host ''
Write-Host '=== KasirPOS Cloudflare Demo Launcher ===' -ForegroundColor Cyan
Write-Host ''

if (-not (Test-Path -LiteralPath $backendEnvFile)) {
    throw "File konfigurasi tidak ditemukan: $backendEnvFile"
}

$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if (-not $nodeCommand) {
    $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
}
if (-not $nodeCommand) {
    throw 'Node.js tidak ditemukan di PATH.'
}

$cloudflaredCommand = Get-Command cloudflared.exe -ErrorAction SilentlyContinue
if (-not $cloudflaredCommand) {
    $cloudflaredCommand = Get-Command cloudflared -ErrorAction SilentlyContinue
}
$cloudflaredExecutable = if ($cloudflaredCommand) { $cloudflaredCommand.Source } else { $null }
if (-not $cloudflaredExecutable) {
    $cloudflaredCandidates = @(
        (Join-Path $env:ProgramFiles 'cloudflared\cloudflared.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'cloudflared\cloudflared.exe'),
        (Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\cloudflared.exe')
    )
    $cloudflaredExecutable = $cloudflaredCandidates |
        Where-Object { $_ -and (Test-Path -LiteralPath $_) } |
        Select-Object -First 1
}
if (-not $cloudflaredExecutable) {
    throw 'cloudflared tidak ditemukan. Instal dengan: winget install --id Cloudflare.cloudflared --exact'
}

New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null

$backendProcess = Get-ManagedProcess -PidFile $backendPidFile -ExpectedProcessName 'node'
$backendWasExternal = $false

if ($backendProcess) {
    Write-Host "Backend sudah berjalan (PID $($backendProcess.Id))." -ForegroundColor DarkGray
} elseif (Test-BackendHealth) {
    $backendWasExternal = $true
    Write-Host 'Backend sudah berjalan dari terminal/proses lain.' -ForegroundColor Yellow
} else {
    Set-Content -LiteralPath $backendOutputLog -Value ''
    Set-Content -LiteralPath $backendErrorLog -Value ''
    $backendStartParameters = @{
        FilePath = $nodeCommand.Source
        ArgumentList = @('src/app.js')
        WorkingDirectory = $backendDirectory
        WindowStyle = 'Hidden'
        RedirectStandardOutput = $backendOutputLog
        RedirectStandardError = $backendErrorLog
        PassThru = $true
    }
    $backendProcess = Start-Process @backendStartParameters
    Set-Content -LiteralPath $backendPidFile -Value $backendProcess.Id
    Write-Host "Menyalakan backend (PID $($backendProcess.Id))..."
}

if (-not (Wait-ForBackend)) {
    if ($backendProcess -and -not $backendWasExternal) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $backendPidFile -Force -ErrorAction SilentlyContinue
    }
    Write-Host ''
    Write-Host 'Backend gagal terhubung ke database. Periksa log:' -ForegroundColor Red
    Write-Host "  $backendErrorLog"
    throw 'Health check backend gagal.'
}

Write-Host 'Backend dan database: ONLINE' -ForegroundColor Green

$tunnelProcess = Get-ManagedProcess -PidFile $tunnelPidFile -ExpectedProcessName 'cloudflared'
if ($tunnelProcess) {
    Write-Host "Cloudflare Tunnel sudah berjalan (PID $($tunnelProcess.Id))." -ForegroundColor DarkGray
} else {
    Set-Content -LiteralPath $tunnelOutputLog -Value ''
    Set-Content -LiteralPath $tunnelErrorLog -Value ''
    $tunnelStartParameters = @{
        FilePath = $cloudflaredExecutable
        ArgumentList = @('tunnel', '--url', 'http://127.0.0.1:5100')
        WorkingDirectory = $repoRoot
        WindowStyle = 'Hidden'
        RedirectStandardOutput = $tunnelOutputLog
        RedirectStandardError = $tunnelErrorLog
        PassThru = $true
    }
    $tunnelProcess = Start-Process @tunnelStartParameters
    Set-Content -LiteralPath $tunnelPidFile -Value $tunnelProcess.Id
    Write-Host "Menyalakan Cloudflare Quick Tunnel (PID $($tunnelProcess.Id))..."
}

$tunnelUrl = Wait-ForTunnelUrl
if (-not $tunnelUrl) {
    Write-Host ''
    Write-Host 'URL Quick Tunnel tidak ditemukan. Periksa log:' -ForegroundColor Red
    Write-Host "  $tunnelErrorLog"
    throw 'Cloudflare Quick Tunnel gagal memberikan URL.'
}

try {
    Set-Clipboard -Value $tunnelUrl
    $clipboardMessage = 'URL sudah disalin ke clipboard.'
} catch {
    $clipboardMessage = 'URL tidak dapat disalin otomatis; salin dari baris di bawah.'
}

Write-Host ''
Write-Host 'Demo lokal berhasil dijalankan.' -ForegroundColor Green
Write-Host "Tunnel URL : $tunnelUrl" -ForegroundColor Cyan
Write-Host $clipboardMessage
Write-Host ''
Write-Host 'Jika URL ini berbeda dari API_PROXY_TARGET di Cloudflare Pages:' -ForegroundColor Yellow
Write-Host '1. Ubah API_PROXY_TARGET ke URL di atas.'
Write-Host '2. Simpan dan buat deployment Pages baru.'
Write-Host ''
Write-Host 'Jendela launcher ini boleh ditutup. Jangan sleep/matikan laptop selama demo.'
Write-Host 'Untuk mematikan demo, klik STOP_KASIRPOS_DEMO.cmd.'
