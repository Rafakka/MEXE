$ErrorActionPreference = "Stop"

$frontendUrl = "http://localhost:8080"
$grafanaUrl = "http://localhost:3000"

function Wait-ForReady {
    param (
        [string]$Name,
        [string]$Url,
        [int]$TimeoutSeconds = 30,
        [bool]$FailOnTimeout = $true
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

    do {
        curl.exe -fsS "$Url" | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Host "$Name OK." -ForegroundColor Green
            return $true
        }

        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)

    if ($FailOnTimeout) {
        throw "$Name did not become ready within ${TimeoutSeconds}s"
    }

    Write-Host "$Name não ficou pronto dentro de ${TimeoutSeconds}s. Verifique o frontend." -ForegroundColor Yellow
    return $false
}

function Assert-ContainerRunning {
    param (
        [string]$ContainerName
    )

    $status = docker inspect --format "{{.State.Status}}" $ContainerName 2>$null

    if ($LASTEXITCODE -ne 0) {
        throw "Container '$ContainerName' não existe."
    }

    if ($status -ne "running") {
        throw "Container '$ContainerName' não está rodando. Status: $status"
    }

    Write-Host "$ContainerName está rodando." -ForegroundColor Green
}

Write-Host "== MEXE Smoke Test ==" -ForegroundColor Cyan

# 1. Docker
Write-Host "`n[1/5] Docker"

docker info | Out-Null

if ($LASTEXITCODE -ne 0) {
    throw "Docker não está disponível."
}

Write-Host "Docker OK." -ForegroundColor Green


# 2. Containers
Write-Host "`n[2/5] Containers"

Assert-ContainerRunning "mexe-frontend"
Assert-ContainerRunning "mexe-grafana"


# 3. Frontend Health
Write-Host "`n[3/5] Frontend Health"

Wait-ForReady `
    "Frontend /api/health" `
    "$frontendUrl/api/health" `
    90 `
    $false


# 4. Frontend Ready
Write-Host "`n[4/5] Frontend Ready"

Wait-ForReady `
    "Frontend /api/ready" `
    "$frontendUrl/api/ready" `
    90 `
    $false


# 5. Grafana
Write-Host "`n[5/5] Grafana"

Wait-ForReady `
    "Grafana /api/health" `
    "$grafanaUrl/api/health" `
    180 `
    $true


Write-Host ""
Write-Host "== SMOKE TEST PASSED ==" -ForegroundColor Green
