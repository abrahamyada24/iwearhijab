Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$source = [System.Drawing.Image]::FromFile((Join-Path $root 'logo web.PNG'))
$resources = Join-Path $root 'pos-android/android/app/src/main/res'
$attributes = New-Object System.Drawing.Imaging.ImageAttributes
$matrix = New-Object System.Drawing.Imaging.ColorMatrix
$matrix.Matrix00 = 0
$matrix.Matrix11 = 0
$matrix.Matrix22 = 0
$matrix.Matrix40 = 1
$matrix.Matrix41 = 1
$matrix.Matrix42 = 1
$attributes.SetColorMatrix($matrix)
function Write-Icon([string]$Path, [int]$Size, [double]$Scale, [bool]$Transparent = $false) {
    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear($(if ($Transparent) { [System.Drawing.Color]::Transparent } else { [System.Drawing.ColorTranslator]::FromHtml('#a8747a') }))
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $width = [int]($Size * $Scale)
    $height = [int]($width * $source.Height / $source.Width)
    $rect = New-Object System.Drawing.Rectangle([int](($Size-$width)/2), [int](($Size-$height)/2), $width, $height)
    $graphics.DrawImage($source, $rect, 0, 0, $source.Width, $source.Height, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
    $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
}
try {
    Copy-Item -LiteralPath (Join-Path $root 'logo web.PNG') -Destination (Join-Path $root 'pos-android/src/assets/brand-monogram.png') -Force
    foreach ($density in @(@('mdpi',48,108), @('hdpi',72,162), @('xhdpi',96,216), @('xxhdpi',144,324), @('xxxhdpi',192,432))) {
        $folder = Join-Path $resources ('mipmap-' + $density[0])
        Write-Icon (Join-Path $folder 'ic_launcher.png') $density[1] 0.78
        Write-Icon (Join-Path $folder 'ic_launcher_round.png') $density[1] 0.72
        Write-Icon (Join-Path $folder 'ic_launcher_foreground.png') $density[2] 0.60 $true
    }
    Write-Icon (Join-Path $root 'pos-android/icon.png') 512 0.78
    Write-Icon (Join-Path $root 'pos-android/src/assets/icon.png') 512 0.78
    Write-Icon (Join-Path $root 'pos-fe/src/app/apple-icon.png') 180 0.78
    $favicon = Join-Path $root 'pos-fe/public/branding/app-icon.png'
    Write-Icon $favicon 64 0.78
    $encoded = [Convert]::ToBase64String([IO.File]::ReadAllBytes($favicon))
    [IO.File]::WriteAllText((Join-Path $root 'pos-fe/src/app/icon.svg'), '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><image width="64" height="64" href="data:image/png;base64,' + $encoded + '"/></svg>')
    [IO.File]::WriteAllText((Join-Path $resources 'values/colors.xml'), '<?xml version="1.0" encoding="utf-8"?><resources><color name="ic_launcher_background">#a8747a</color></resources>')
} finally { $attributes.Dispose(); $source.Dispose() }
Write-Host 'Iwearing Hijab Android and browser icons generated from logo web.PNG.'
