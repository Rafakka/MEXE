$ErrorActionPreference = "Stop"

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
Write-Host "`n[2/2] Kubernetes workloads"

Assert-DeploymentReady "mexe-frontend"
Assert-DeploymentReady "mexe-backend"
Assert-DeploymentReady "grafana"

Write-Host ""
Write-Host "== SMOKE TEST PASSED ==" -ForegroundColor Green
