$ErrorActionPreference = "Stop"

$frontendUrl = "http://localhost:8080"
$grafanaUrl = "http://localhost:3000"

function Wait-ForReady {
    param (
        [string]$Name,
        [string]$Url,
        [int]$TimeoutSeconds = 30
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

    do {
        curl.exe -fsS $Url | Out-Null

        if ($LASTEXITCODE -eq 0) {
            Write-Host "$Name OK." -ForegroundColor Green
            return
        }

        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)

    throw "$Name did not become ready within ${TimeoutSeconds}s"
}

function Assert-ContainerRunning {
    param (
        [string]$ContainerName
    )

    $status = docker inspect `
        --format "{{.State.Status}}" `
        $ContainerName 2>$null

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

Assert-ContainerRunning -ContainerName "mexe-frontend"
Assert-ContainerRunning -ContainerName "mexe-grafana"


# 3. Frontend health
Write-Host "`n[3/5] Frontend Health"

Wait-ForReady `
    -Name "Frontend /api/health" `
    -Url "$frontendUrl/api/health"


# 4. Frontend readiness
Write-Host "`n[4/5] Frontend Ready"

Wait-ForReady `
    -Name "Frontend /api/ready" `
    -Url "$frontendUrl/api/ready"


# 5. Grafana
Write-Host "`n[5/5] Grafana"

Wait-ForReady `
    -Name "Grafana /api/health" `
    -Url "$grafanaUrl/api/health" `
    -TimeoutSeconds 90


Write-Host ""
Write-Host "== SMOKE TEST PASSED ==" -ForegroundColor Green
