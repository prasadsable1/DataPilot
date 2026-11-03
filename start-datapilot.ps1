$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $projectRoot 'backend'
$frontendDir = Join-Path $projectRoot 'frontend'
$venvPython = Join-Path $backendDir '.venv\Scripts\python.exe'
$backendEnv = Join-Path $backendDir '.env'
$backendExampleEnv = Join-Path $backendDir '.env.example'

if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
    throw 'Python Launcher (py) was not found. Install Python 3.11 or newer, then retry.'
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'npm was not found. Install Node.js, then retry.'
}

if (-not (Test-Path $backendEnv)) {
    Copy-Item $backendExampleEnv $backendEnv
    Write-Host 'Created backend\.env from the example.'
    Write-Host 'Configure its MySQL connection, then run this script again.'
    exit 0
}

if (-not (Test-Path $venvPython)) {
    Write-Host 'Creating the backend Python environment...'
    & py -m venv (Join-Path $backendDir '.venv')
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the backend Python environment.' }
}

if (-not (Test-Path (Join-Path $backendDir '.venv\Lib\site-packages\fastapi'))) {
    Write-Host 'Installing backend dependencies...'
    & $venvPython -m pip install -r (Join-Path $backendDir 'requirements.txt')
    if ($LASTEXITCODE -ne 0) { throw 'Backend dependency installation failed.' }
}

if (-not (Test-Path (Join-Path $frontendDir 'node_modules'))) {
    Write-Host 'Installing frontend dependencies...'
    & npm install --prefix $frontendDir
    if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed.' }
}

$backendCommand = "Set-Location -LiteralPath '$backendDir'; & '$venvPython' -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
$frontendCommand = "Set-Location -LiteralPath '$frontendDir'; & npm.cmd run dev -- --host 127.0.0.1 --port 5173"

function Start-ServiceWindow($port, $url, $command, $name) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($listener) {
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -eq 200) {
                Write-Host "$name is already responding at $url"
                return $false
            }
            throw "$name returned HTTP $($response.StatusCode)."
        } catch {
            throw "Port $port is occupied, but $name did not respond at $url. Close the other service and retry."
        }
    }

    Start-Process powershell.exe -ArgumentList @('-NoExit', '-Command', $command)
    return $true
}

$backendStarted = Start-ServiceWindow 8000 'http://127.0.0.1:8000/api/health' $backendCommand 'Backend'
$frontendStarted = Start-ServiceWindow 5173 'http://127.0.0.1:5173' $frontendCommand 'Frontend'

Write-Host ''
if ($backendStarted -or $frontendStarted) {
    Write-Host 'DataPilot is starting. Keep any newly opened PowerShell windows open.'
} else {
    Write-Host 'DataPilot is already running.'
}
Write-Host 'Frontend: http://localhost:5173'
Write-Host 'Backend health: http://127.0.0.1:8000/api/health'
