@echo off
REM ===========================================================================
REM  Manzili launcher (single file). Stops anything on :5080/:3000, installs
REM  deps if missing, starts the .NET backend + Next.js frontend in their own
REM  windows, then opens the browser. The real logic is the PowerShell section
REM  below the #PSCODE marker; this header just hands the file to PowerShell.
REM ===========================================================================
setlocal
set "MZ_ROOT=%~dp0"
set "MZ_LAUNCHER=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$c=[IO.File]::ReadAllText($env:MZ_LAUNCHER); $i=$c.IndexOf([char]35+'PSCODE'); if($i -ge 0){ Invoke-Expression $c.Substring($i) }"
exit /b
#PSCODE
# ----------------------------- Manzili launcher (PowerShell) -----------------------------
$ErrorActionPreference = 'SilentlyContinue'
$root = $env:MZ_ROOT
if (-not $root) { $root = (Get-Location).Path }

function Ok($m)   { Write-Host '  [  OK  ] ' -ForegroundColor Green   -NoNewline; Write-Host $m -ForegroundColor Gray }
function Bad($m)  { Write-Host '  [ FAIL ] ' -ForegroundColor Red     -NoNewline; Write-Host $m -ForegroundColor Gray }
function Step($m) { Write-Host '  [ .... ] ' -ForegroundColor DarkGray -NoNewline; Write-Host $m -ForegroundColor DarkGray }

Clear-Host
Write-Host ''
# Wordmark assembled from per-letter glyphs so the rows always line up.
$gM=' __  __ ','|  \/  |','| |\/| |','| |  | |','|_|  |_|'
$gA='   _     ','  / \    ',' / _ \   ','/ ___ \  ','/_/   \_\'
$gN=' _   _ ','| \ | |','|  \| |','| |\  |','|_| \_|'
$gZ=' _____ ','|__  / ','  / /  ',' / /_  ','/____| '
$gI=' ___ ','|_ _|',' | | ',' | | ','|___|'
$gL=' _     ','| |    ','| |    ','| |___ ','|_____|'
$word = @($gM,$gA,$gN,$gZ,$gI,$gL,$gI)
for ($r=0; $r -lt 5; $r++) {
  $line = ($word | ForEach-Object { $_[$r] }) -join ' '
  Write-Host ('   ' + $line) -ForegroundColor Yellow
}
Write-Host ''
Write-Host '        handmade marketplace  -  dev launcher' -ForegroundColor DarkYellow
Write-Host '  ---------------------------------------------------------' -ForegroundColor DarkGray
Write-Host ''

$apiProj = Join-Path $root 'backend-dotnet\src\Manzili.Api'
$fe      = Join-Path $root 'frontend\Manzili'

# 1) Stop anything already bound to our ports -------------------------------------------
function Stop-Port($port) {
  $killed = $false
  try {
    $pids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction Stop |
            Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $pids) {
      if ($procId -and $procId -ne 0) { Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue; $killed = $true }
    }
  } catch {
    $rows = netstat -ano | Select-String (":" + $port + "\s") | Select-String 'LISTENING'
    foreach ($row in $rows) {
      $p = ($row.ToString().Trim() -split '\s+')[-1]
      if ($p -match '^\d+$') { taskkill /PID $p /F *> $null; $killed = $true }
    }
  }
  return $killed
}
Write-Host '  Stopping any servers already running...' -ForegroundColor Gray
if (Stop-Port 5080) { Ok 'Stopped a server on port 5080' } else { Ok 'Port 5080 was already free' }
if (Stop-Port 3000) { Ok 'Stopped a server on port 3000' } else { Ok 'Port 3000 was already free' }
Start-Sleep -Seconds 1
Write-Host ''

# 2) Tooling check ----------------------------------------------------------------------
# Find dotnet: on PATH, or our own local copy under manzili-tools (handles a stale PATH
# right after installing). Adds whatever it finds to PATH for this run.
function Get-Dotnet {
  $v = & dotnet --version 2>$null
  if ($LASTEXITCODE -eq 0 -and $v) { return $v }
  $localDotnet = Join-Path $env:LOCALAPPDATA 'manzili-tools\dotnet'
  if (Test-Path (Join-Path $localDotnet 'dotnet.exe')) {
    $env:DOTNET_ROOT = $localDotnet
    $env:Path = $localDotnet + ';' + $env:Path
    $v = & dotnet --version 2>$null
    if ($LASTEXITCODE -eq 0 -and $v) { return $v }
  }
  return $null
}

$dv = Get-Dotnet
if (-not $dv) {
  Bad '.NET SDK not found on this machine'
  $ans = Read-Host '  Download a local copy of the .NET 10 SDK now? (no admin needed, ~250 MB) [Y/n]'
  if ($ans -notmatch '^(n|no)$') {
    try {
      [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
      $ProgressPreference = 'SilentlyContinue'
      $toolsRoot = Join-Path $env:LOCALAPPDATA 'manzili-tools'
      New-Item -ItemType Directory -Force -Path $toolsRoot | Out-Null
      $installScript = Join-Path $toolsRoot 'dotnet-install.ps1'
      Step 'Downloading the official .NET install script...'
      Invoke-WebRequest -Uri 'https://dot.net/v1/dotnet-install.ps1' -OutFile $installScript -TimeoutSec 120
      $dotnetDir = Join-Path $toolsRoot 'dotnet'
      Step 'Installing the .NET 10 SDK locally (one-time, ~1-2 min)...'
      & $installScript -Channel 10.0 -InstallDir $dotnetDir -NoPath
      $env:DOTNET_ROOT = $dotnetDir
      $env:Path = $dotnetDir + ';' + $env:Path
      $dv = & dotnet --version 2>$null
      if ($LASTEXITCODE -ne 0) { $dv = $null }
    } catch { Bad ('Auto-install failed: ' + $_.Exception.Message) }
  }
}
if ($dv) { $dotnetOk = $true; Ok ".NET SDK $dv" } else { $dotnetOk = $false; Bad '.NET SDK still unavailable - install the .NET 10 SDK from https://dot.net , reopen, then re-run' }

# Find npm: on PATH, or in standard install folders, or our own local copy (handles a
# stale PATH right after installing Node). Adds whatever it finds to PATH for this run.
function Get-Npm {
  $v = & npm --version 2>$null
  if ($LASTEXITCODE -eq 0 -and $v) { return $v }
  $dirs = @((Join-Path $env:ProgramFiles 'nodejs'), (Join-Path ${env:ProgramFiles(x86)} 'nodejs'), (Join-Path $env:LOCALAPPDATA 'Programs\nodejs'), (Join-Path $env:APPDATA 'npm'))
  $toolsRoot = Join-Path $env:LOCALAPPDATA 'manzili-tools'
  if (Test-Path $toolsRoot) { $dirs += (Get-ChildItem $toolsRoot -Directory -Filter 'node-*-win-*' -EA SilentlyContinue | ForEach-Object { $_.FullName }) }
  foreach ($d in $dirs) {
    if ($d -and (Test-Path (Join-Path $d 'npm.cmd'))) {
      $env:Path = $d + ';' + $env:Path
      $v = & npm --version 2>$null
      if ($LASTEXITCODE -eq 0 -and $v) { return $v }
    }
  }
  return $null
}

$nv = Get-Npm
if (-not $nv) {
  Bad 'Node.js / npm not found on this machine'
  $ans = Read-Host '  Download a local copy of Node.js LTS now? (no admin needed) [Y/n]'
  if ($ans -notmatch '^(n|no)$') {
    try {
      [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
      $ProgressPreference = 'SilentlyContinue'
      $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
      Step 'Finding the current Node.js LTS...'
      # index.json sets lts=false (boolean) for non-LTS and lts="Codename" (string) for LTS,
      # newest-first. Keep only string-lts entries; the first is the current LTS line's newest.
      $ver = (@(Invoke-RestMethod 'https://nodejs.org/dist/index.json' -TimeoutSec 30 | Where-Object { $_.lts -is [string] }))[0].version
      $toolsRoot = Join-Path $env:LOCALAPPDATA 'manzili-tools'
      New-Item -ItemType Directory -Force -Path $toolsRoot | Out-Null
      $zipPath = Join-Path $toolsRoot ('node-' + $ver + '-win-' + $arch + '.zip')
      Step ('Downloading Node.js ' + $ver + ' (' + $arch + ', ~30 MB)...')
      Invoke-WebRequest -Uri ('https://nodejs.org/dist/' + $ver + '/node-' + $ver + '-win-' + $arch + '.zip') -OutFile $zipPath -TimeoutSec 300
      Step 'Extracting Node.js locally...'
      Expand-Archive -Path $zipPath -DestinationPath $toolsRoot -Force
      $nodeDir = (Get-ChildItem $toolsRoot -Directory -Filter 'node-*-win-*' | Sort-Object Name | Select-Object -Last 1).FullName
      $env:Path = $nodeDir + ';' + $env:Path
      $nv = & npm --version 2>$null
      if ($LASTEXITCODE -ne 0) { $nv = $null }
    } catch { Bad ('Auto-install failed: ' + $_.Exception.Message) }
  }
}
if ($nv) { $npmOk = $true; Ok "Node / npm $nv" } else { $npmOk = $false; Bad 'Node.js still unavailable - install it from https://nodejs.org , reopen, then re-run' }
Write-Host ''

# 3) Auto-install dependencies if missing -----------------------------------------------
if ($npmOk) {
  if (Test-Path (Join-Path $fe 'node_modules')) {
    Ok 'Frontend dependencies present'
  } else {
    Step 'Installing frontend dependencies (npm install) - one-time, please wait...'
    Push-Location $fe
    & npm install
    $ec = $LASTEXITCODE
    Pop-Location
    if ($ec -eq 0) { Ok 'Frontend dependencies installed' } else { Bad 'npm install failed - see the output above' }
  }
}
if ($dotnetOk) {
  Step 'Restoring backend packages (dotnet restore)...'
  & dotnet restore (Join-Path $apiProj 'Manzili.Api.csproj') --verbosity quiet *> $null
  if ($LASTEXITCODE -eq 0) { Ok 'Backend packages restored' } else { Ok 'Backend packages will restore on launch' }
}
Write-Host ''

# 4) Launch each server in its own window -----------------------------------------------
if ($dotnetOk) {
  Start-Process cmd.exe -ArgumentList '/k','title Manzili Backend - 5080 & dotnet run --urls http://localhost:5080' -WorkingDirectory $apiProj | Out-Null
  Ok 'Backend starting in its own window  ->  http://localhost:5080'
}
if ($npmOk) {
  Start-Process cmd.exe -ArgumentList '/k','title Manzili Frontend - 3000 & npm run dev' -WorkingDirectory $fe | Out-Null
  Ok 'Frontend starting in its own window ->  http://localhost:3000'
}
Write-Host ''

# 5) Wait for the frontend, then open the browser ---------------------------------------
if ($npmOk) {
  Step 'Waiting for the frontend to compile (first run can take 20-40s)...'
  $up = $false
  for ($i=0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 2
    try { Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3000' -TimeoutSec 3 | Out-Null; $up = $true; break } catch {}
  }
  if ($up) { Ok 'Frontend is live' } else { Bad 'Frontend did not respond in ~2 min - opening the browser anyway' }
  Start-Process 'http://localhost:3000/' | Out-Null
  Ok 'Opened your browser at http://localhost:3000/'
}

# 6) Footer -----------------------------------------------------------------------------
Write-Host ''
Write-Host '  =========================================================' -ForegroundColor DarkGray
Write-Host '   Manzili is running. Two server windows were opened:' -ForegroundColor Gray
Write-Host '     - "Manzili Backend - 5080"   (.NET API)' -ForegroundColor Gray
Write-Host '     - "Manzili Frontend - 3000"  (Next.js app)' -ForegroundColor Gray
Write-Host '   Close those two windows to stop the servers.' -ForegroundColor Gray
Write-Host '  =========================================================' -ForegroundColor DarkGray
Write-Host ''
Read-Host '  Press Enter to close this launcher (servers keep running)' | Out-Null
