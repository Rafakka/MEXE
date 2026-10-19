
param (
    [Parameter(
        Position = 0,
        Mandatory = $true
    )]
    [ValidateSet("smoke", "kube", "func", "all")]
    [string]$Mode
)

$ErrorActionPreference = "Stop"

$MexeRoot = Split-Path -Parent $PSScriptRoot

function Start-MexeCompose {

    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "Subindo MEXE Docker Compose" -ForegroundColor Cyan
    Write-Host "======================================"

    Push-Location $MexeRoot

    try {
        docker compose up -d --build

        if ($LASTEXITCODE -ne 0) {
            throw "Falha ao subir o Docker Compose."
        }
    }
    finally {
        Pop-Location
    }

    Write-Host ""
    Write-Host "MEXE Docker Compose OK." -ForegroundColor Green
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "       MEXE Local Bootstrap" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

function Assert-Command {
    param (
        [string]$Command,
        [string]$Name
    )

    if (-not (Get-Command $Command -ErrorAction SilentlyContinue)) {
        Write-Host ""
        Write-Host "ERRO: $Name não está instalado ou não está no PATH." -ForegroundColor Red
        Write-Host "Instale $Name e execute o bootstrap novamente."
        throw "Pré-requisito ausente: $Name"
    }

    Write-Host "$Name OK." -ForegroundColor Green
}

function Assert-Docker {
    Assert-Command `
        -Command "docker" `
        -Name "Docker"

    docker info | Out-Null

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "ERRO: Docker está instalado, mas não está disponível." -ForegroundColor Red
        Write-Host "Inicie o Docker Desktop e execute o bootstrap novamente."
        throw "Docker não está disponível."
    }

    Write-Host "Docker Engine OK." -ForegroundColor Green
}

function Assert-Path {
    param (
        [string]$Path,
        [string]$Name
    )

    if (-not (Test-Path $Path)) {
        Write-Host ""
        Write-Host "ERRO: $Name não encontrado:" -ForegroundColor Red
        Write-Host $Path
        throw "Recurso obrigatório ausente: $Name"
    }

    Write-Host "$Name OK." -ForegroundColor Green
}

function Assert-Prerequisites {

    Write-Host ""
    Write-Host "== Checking prerequisites ==" -ForegroundColor Yellow

    Write-Host ""
    Write-Host "[1/5] Docker"
    Assert-Docker

    Write-Host ""
    Write-Host "[2/5] kubectl"
    Assert-Command `
        -Command "kubectl" `
        -Name "kubectl"

    Write-Host ""
    Write-Host "[3/5] Kind"
    Assert-Command `
        -Command "kind" `
        -Name "Kind"

    Write-Host ""
    Write-Host "[4/5] Cluster configuration"
    Assert-Path `
        -Path (Join-Path $MexeRoot "cluster.yaml") `
        -Name "cluster.yaml"

    Write-Host ""
    Write-Host "[5/5] MEXE directories"

    Assert-Path `
        -Path (Join-Path $MexeRoot "k8s") `
        -Name "k8s directory"

    Assert-Path `
        -Path (Join-Path $MexeRoot "scripts") `
        -Name "scripts directory"

    Write-Host ""
    Write-Host "== Prerequisites OK ==" -ForegroundColor Green
}

function Invoke-MexeScript {
    param (
        [string]$ScriptName
    )

    $ScriptPath = Join-Path $PSScriptRoot $ScriptName

    if (-not (Test-Path $ScriptPath)) {
        throw "Script '$ScriptName' não encontrado."
    }

    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host "Executando: $ScriptName" -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan

    & $ScriptPath

    if ($LASTEXITCODE -ne 0) {
        throw "O script '$ScriptName' falhou."
    }

    Write-Host ""
    Write-Host "$ScriptName concluído." -ForegroundColor Green
    }

try {

    Assert-Prerequisites

    Write-Host ""
    Write-Host "Modo selecionado: $Mode" -ForegroundColor Cyan

    switch ($Mode) {
    "smoke" {
        Start-MexeCompose
        Invoke-MexeScript -ScriptName "smoke-test.ps1"
       }

    "kube" {
       Invoke-MexeScript -ScriptName "kube-bootstrap.ps1"
       }

    "func" {
        Invoke-MexeScript -ScriptName "func-bootstrap.ps1"
        }

    "all" {
        Start-MexeCompose
        Invoke-MexeScript -ScriptName "kube-bootstrap.ps1"
        Invoke-MexeScript -ScriptName "smoke-test.ps1"
        Invoke-MexeScript -ScriptName "func-bootstrap.ps1"
        }
    }

    Write-Host ""
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "       MEXE BOOTSTRAP PASSED" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
}
catch {

    Write-Host ""
    Write-Host "======================================" -ForegroundColor Red
    Write-Host "       MEXE BOOTSTRAP ABORTED" -ForegroundColor Red
    Write-Host "======================================" -ForegroundColor Red

    Write-Host ""
    Write-Host $_.Exception.Message -ForegroundColor Red

    exit 1
}
