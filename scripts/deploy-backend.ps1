# One-command Cloud Run deploy for the JanSetu backend.
# Usage:  .\scripts\deploy-backend.ps1
# Prereqs: gcloud CLI installed + `gcloud auth login` done + Blaze plan enabled on the Firebase project.

$ErrorActionPreference = 'Stop'
$PROJECT = 'jansetu-ai-afa77'
$SERVICE = 'jansetu-backend'
$REGION  = 'asia-south1'                              # Mumbai — lowest latency for Indian users
$SRC_DIR = Join-Path $PSScriptRoot '..\jansetu-ai_backend'

# Values containing @ , : or newlines break --set-env-vars escaping; a temp YAML file avoids the whole problem.
function ConvertTo-YamlValue {
  param([string]$v)
  # YAML single-quoted string: only single quotes need escaping (double them).
  return "'" + ($v -replace "'", "''") + "'"
}

Push-Location $SRC_DIR
try {
  Write-Host "==> Building env-vars YAML from .env" -ForegroundColor Cyan
  $skipKeys = @('PORT', 'NODE_ENV', 'GOOGLE_APPLICATION_CREDENTIALS', 'FRONTEND_ORIGIN')
  $entries = [ordered]@{}
  foreach ($line in Get-Content .env) {
    $line = $line.Trim()
    if (-not $line -or $line.StartsWith('#')) { continue }
    if ($line -notmatch '^([A-Z_][A-Z0-9_]*)=(.*)$') { continue }
    $key = $matches[1]
    $value = $matches[2]
    if ($skipKeys -contains $key) { continue }
    if (-not $value) { continue }
    $entries[$key] = $value
  }
  # Overrides: Cloud Run injects PORT itself; NODE_ENV/FRONTEND_ORIGIN differ from local.
  $entries['NODE_ENV'] = 'production'
  $entries['FRONTEND_ORIGIN'] = "https://$PROJECT.web.app"

  $yamlLines = foreach ($k in $entries.Keys) { "${k}: " + (ConvertTo-YamlValue $entries[$k]) }
  $envFile = Join-Path ([System.IO.Path]::GetTempPath()) "jansetu-envvars-$([guid]::NewGuid().ToString('N')).yaml"
  Set-Content -Path $envFile -Value ($yamlLines -join "`n") -Encoding UTF8
  Write-Host "    -> wrote $($entries.Count) env vars to $envFile" -ForegroundColor DarkGray

  try {
    Write-Host "==> Deploying to Cloud Run ($REGION)" -ForegroundColor Cyan
    gcloud run deploy $SERVICE `
      --project $PROJECT `
      --region $REGION `
      --source . `
      --platform managed `
      --allow-unauthenticated `
      --memory 512Mi `
      --cpu 1 `
      --timeout 60 `
      --min-instances 0 `
      --max-instances 3 `
      --port 8080 `
      --env-vars-file $envFile `
      --quiet

    if ($LASTEXITCODE -ne 0) { throw "gcloud run deploy failed with exit code $LASTEXITCODE" }
  }
  finally {
    Remove-Item $envFile -Force -ErrorAction SilentlyContinue
  }

  Write-Host "`n==> Fetching deployed URL" -ForegroundColor Cyan
  $url = (gcloud run services describe $SERVICE --project $PROJECT --region $REGION --format 'value(status.url)') | Out-String
  $url = $url.Trim()
  Write-Host "Backend deployed at: $url" -ForegroundColor Green

  # Cache URL so the frontend script auto-picks it up.
  Set-Content -Path (Join-Path $PSScriptRoot '.backend-url') -Value $url -NoNewline
  Write-Host "URL cached to scripts\.backend-url"

  Write-Host "`n==> Smoke test /health" -ForegroundColor Cyan
  $health = & "C:\Windows\System32\curl.exe" -s "$url/health" --max-time 15
  Write-Host $health
}
finally {
  Pop-Location
}
