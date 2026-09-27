# One-command Firebase Hosting deploy for the JanSetu frontend.
# Usage:  .\scripts\deploy-frontend.ps1
# Optional: pass -BackendUrl "https://custom-url.run.app" to override the cached URL.
# Prereqs: firebase CLI installed + `firebase login` done.

param(
  [string]$BackendUrl
)

$ErrorActionPreference = 'Stop'
$ROOT = Join-Path $PSScriptRoot '..'
$FE   = Join-Path $ROOT 'jansetu-ai_frontend'

# Resolve backend URL: explicit param > cached from backend deploy > prompt.
if (-not $BackendUrl) {
  $cache = Join-Path $PSScriptRoot '.backend-url'
  if (Test-Path $cache) { $BackendUrl = (Get-Content $cache -Raw).Trim() }
}
if (-not $BackendUrl) {
  $BackendUrl = Read-Host 'Paste your Cloud Run backend URL (https://...)'
}
Write-Host "==> Using backend URL: $BackendUrl" -ForegroundColor Cyan

Push-Location $FE
try {
  Write-Host "==> Rewriting .env.production with backend URL" -ForegroundColor Cyan
  $envContent = Get-Content .env.production -Raw
  $envContent = $envContent -replace 'VITE_API_BASE_URL=.*', "VITE_API_BASE_URL=$BackendUrl"
  Set-Content .env.production -Value $envContent -NoNewline

  Write-Host "==> Building production bundle" -ForegroundColor Cyan
  # npm writes warnings to stderr, which PowerShell treats as fatal under ErrorActionPreference=Stop.
  # Suppress that behaviour just for this call and rely on $LASTEXITCODE.
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  npm.cmd run build 2>&1 | ForEach-Object { $_ }
  $ErrorActionPreference = $prev
  if ($LASTEXITCODE -ne 0) { throw "vite build failed with exit code $LASTEXITCODE" }
}
finally {
  Pop-Location
}

Push-Location $ROOT
try {
  Write-Host "==> firebase deploy --only hosting" -ForegroundColor Cyan
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  firebase deploy --only hosting --project jansetu-ai-afa77
  $ErrorActionPreference = $prev
  if ($LASTEXITCODE -ne 0) { throw "firebase deploy failed with exit code $LASTEXITCODE" }

  Write-Host "`nFrontend deployed at: https://jansetu-ai-afa77.web.app" -ForegroundColor Green
}
finally {
  Pop-Location
}
