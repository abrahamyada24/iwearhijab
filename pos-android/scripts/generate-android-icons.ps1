Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourcePath = Join-Path $projectRoot 'icon.png'
$resourceRoot = Join-Path $projectRoot 'android\app\src\main\res'

if (-not (Test-Path -LiteralPath $sourcePath)) {
    throw "Icon source not found: $sourcePath"
}

$source = [System.Drawing.Image]::FromFile($sourcePath)

function Write-PngIcon {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][int]$Size,
        [Parameter(Mandatory = $true)][double]$Scale,
        [Parameter(Mandatory = $true)][bool]$TransparentBackground
    )

    $folder = Split-Path -Parent $Path
    [System.IO.Directory]::CreateDirectory($folder) | Out-Null

    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $bitmap.SetResolution(96, 96)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    if ($TransparentBackground) {
        $graphics.Clear([System.Drawing.Color]::Transparent)
    } else {
        $graphics.Clear([System.Drawing.Color]::FromArgb(255, 20, 86, 190))
    }
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
    $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $targetMax = [int][Math]::Round($Size * $Scale)
    $ratio = [Math]::Min($targetMax / $source.Width, $targetMax / $source.Height)
    $targetWidth = [int][Math]::Round($source.Width * $ratio)
    $targetHeight = [int][Math]::Round($source.Height * $ratio)
    $x = [int](($Size - $targetWidth) / 2)
    $y = [int](($Size - $targetHeight) / 2)
    $graphics.DrawImage($source, $x, $y, $targetWidth, $targetHeight)
    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)

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
    Write-PngIcon -Path (Join-Path $folder 'ic_launcher.png') -Size $density.Legacy -Scale 0.92 -TransparentBackground $false
    Write-PngIcon -Path (Join-Path $folder 'ic_launcher_round.png') -Size $density.Legacy -Scale 0.86 -TransparentBackground $false
    Write-PngIcon -Path (Join-Path $folder 'ic_launcher_foreground.png') -Size $density.Foreground -Scale 0.66 -TransparentBackground $true
}

$source.Dispose()
Write-Host 'Android launcher icons generated.'
