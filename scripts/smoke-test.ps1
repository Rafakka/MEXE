$ErrorActionPreference = "Stop"

if ($env:GITLAB_CI -eq "true") {
    $HostName = "docker"
} else {
    $HostName = "localhost"
}

$FrontendUrl = "http://${HostName}:8080"
$GrafanaUrl  = "http://${HostName}:3000"

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
Write-Host "`n[1/2] Docker"

docker info | Out-Null

if ($LASTEXITCODE -ne 0) {
    throw "Docker não está disponível."
}

Write-Host "Docker OK." -ForegroundColor Green

function Assert-DeploymentReady {
    param(
        [Parameter(Mandatory = $true)]
        [string]$DeploymentName
    )

    $deployment = kubectl get deployment $DeploymentName `
        -o json 2>$null | ConvertFrom-Json

    if ($LASTEXITCODE -ne 0 -or $null -eq $deployment) {
        throw "Deployment '$DeploymentName' não encontrado."
    }

    $desired = $deployment.spec.replicas
    $ready = $deployment.status.readyReplicas

    if ($null -eq $ready) {
        $ready = 0
    }

    if ($ready -ne $desired) {
        throw "Deployment '$DeploymentName' não está pronto. Ready: $ready/$desired."
    }

    Write-Host "Deployment '$DeploymentName': $ready/$desired Ready." `
        -ForegroundColor Green
}

# 2. Kubernetes workloads
Write-Host "`n[2/4] Kubernetes workloads"

Assert-DeploymentReady "mexe-frontend"
Assert-DeploymentReady "mexe-backend"
Assert-DeploymentReady "grafana"

Write-Host ""
Write-Host "== SMOKE TEST PASSED ==" -ForegroundColor Green

Write-Host ""
Write-Host "== SMOKE TEST PASSED ==" -ForegroundColor Green
