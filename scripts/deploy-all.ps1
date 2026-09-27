# Deploy backend + frontend in sequence.
# Usage:  .\scripts\deploy-all.ps1
# The frontend script auto-picks up the backend URL from the first script.

$ErrorActionPreference = 'Stop'
& "$PSScriptRoot\deploy-backend.ps1"
& "$PSScriptRoot\deploy-frontend.ps1"

Write-Host "`n=== ALL DEPLOYED ===" -ForegroundColor Green
$backendUrl = (Get-Content "$PSScriptRoot\.backend-url" -Raw).Trim()
Write-Host "Backend  : $backendUrl"
Write-Host "Frontend : https://jansetu-ai-afa77.web.app"
Write-Host "API docs : $backendUrl/api/docs/"
