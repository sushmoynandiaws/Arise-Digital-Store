param(
    [switch]$Demo
)
$ErrorActionPreference = 'Stop'
$marketRoot = Split-Path -Parent $PSScriptRoot

if (-not $Demo) {
    Write-Host "Opening Arise Digital Store with Live VPS Data at http://localhost:5173..." -ForegroundColor Cyan
    Push-Location (Join-Path $marketRoot 'web')
    try {
        if (-not (Test-Path -LiteralPath 'node_modules')) {
            npm.cmd ci
            if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
        }
        npm.cmd run dev
    } finally {
        Pop-Location
    }
    exit 0
}

Push-Location (Join-Path $marketRoot 'web')
try {
    if (-not (Test-Path -LiteralPath 'node_modules')) {
        npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
    }
    npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }
} finally { Pop-Location }
Write-Host 'Opening the local demo marketplace at http://localhost:8088. Press Ctrl+C to stop.'
wsl.exe -d Ubuntu --cd $marketRoot -- bash scripts/dev.sh
exit $LASTEXITCODE
