# Ikon KasirPOS: huruf K putih pada kotak biru. Tidak memakai gambar merek lama.
Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$resourceRoot = Join-Path $projectRoot 'android\app\src\main\res'

function Write-KasirPosIcon {
    param([string]$Path, [int]$Size, [double]$Scale = 1, [bool]$Transparent = $false, [bool]$Round = $false)
    [System.IO.Directory]::CreateDirectory((Split-Path -Parent $Path)) | Out-Null
    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $background = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(20, 86, 190))
    if (-not $Transparent) {
        if ($Round) { $graphics.FillEllipse($background, 0, 0, $Size, $Size) }
        else { $graphics.FillRectangle($background, 0, 0, $Size, $Size) }
    }
    $coordinates = @(18,15, 26,15, 26,30, 39,15, 49,15, 34,32, 50,49, 39,49, 26,35, 26,49, 18,49)
    $points = for ($index = 0; $index -lt $coordinates.Count; $index += 2) {
        $x = (($coordinates[$index] - 32) * $Scale + 32) * $Size / 64
        $y = (($coordinates[$index + 1] - 32) * $Scale + 32) * $Size / 64
        New-Object System.Drawing.PointF($x, $y)
    }
    $graphics.FillPolygon([System.Drawing.Brushes]::White, [System.Drawing.PointF[]]$points)
    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $background.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
}

$densities = @(
    @{ Name = 'mdpi'; Legacy = 48; Foreground = 108 },
    @{ Name = 'hdpi'; Legacy = 72; Foreground = 162 },
    @{ Name = 'xhdpi'; Legacy = 96; Foreground = 216 },
    @{ Name = 'xxhdpi'; Legacy = 144; Foreground = 324 },
    @{ Name = 'xxxhdpi'; Legacy = 192; Foreground = 432 }
)
foreach ($density in $densities) {
    $folder = Join-Path $resourceRoot "mipmap-$($density.Name)"
    Write-KasirPosIcon -Path (Join-Path $folder 'ic_launcher.png') -Size $density.Legacy
    Write-KasirPosIcon -Path (Join-Path $folder 'ic_launcher_round.png') -Size $density.Legacy -Round $true
    Write-KasirPosIcon -Path (Join-Path $folder 'ic_launcher_foreground.png') -Size $density.Foreground -Scale 0.62 -Transparent $true
}
Write-KasirPosIcon -Path (Join-Path $projectRoot 'icon.png') -Size 512
Write-KasirPosIcon -Path (Join-Path $projectRoot 'src\assets\icon.png') -Size 512
Write-KasirPosIcon -Path (Join-Path $projectRoot '..\pos-desktop\icon.png') -Size 512
Write-Host 'Ikon huruf K KasirPOS selesai dibuat.'
