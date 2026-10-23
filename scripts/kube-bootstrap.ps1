
param(
    [string]$BackendImage = "mexe-backend:latest"
)

$ErrorActionPreference = "Stop"

$MexeRoot = Split-Path $PSScriptRoot -Parent

$EnvFile = Join-Path $MexeRoot ".env"

if (Test-Path $EnvFile) {
    $GitlabTokenLine = Get-Content $EnvFile |
        Where-Object { $_ -match '^GITLAB_TOKEN=' } |
        Select-Object -First 1

    if ($GitlabTokenLine) {
        $env:GITLAB_TOKEN = $GitlabTokenLine -replace '^GITLAB_TOKEN=', ''
    }
}

$ClusterConfig = Join-Path $MexeRoot "cluster.yaml"
$KubernetesDir = Join-Path $MexeRoot "k8s"

$SecurityResultsDir = Join-Path $MexeRoot "security\results"

$DependencyExporterManifest = Join-Path `
    $KubernetesDir `
    "optional\dependency-exporter.yaml"

$SecurityExporterManifest = Join-Path `
    $KubernetesDir `
    "optional\security-exporter.yaml"

$SecretName = "mexe-dependency-exporter"

$ClusterName = "desktop"

Write-Host "=== MEXE Kubernetes Bootstrap ===" -ForegroundColor Cyan

# ============================================================
# 1. Pré-requisitos opcionais
# ============================================================

Write-Host "`n[1/4] Verificando pré-requisitos..."

# Security exporter
$SecurityExporterEnabled = Test-Path `
    $SecurityResultsDir `
    -PathType Container

if ($SecurityExporterEnabled) {
    Write-Host "Security results encontrado." -ForegroundColor Green
    Write-Host "  $SecurityResultsDir"
}
else {
    Write-Host ""
    Write-Host "Aviso: diretório do security-exporter não encontrado." -ForegroundColor Yellow
    Write-Host "security-exporter será ignorado." -ForegroundColor Yellow
    Write-Host "Crie o diretório:" -ForegroundColor Yellow
    Write-Host "  $SecurityResultsDir" -ForegroundColor Yellow
}

# Dependency exporter
$DependencyExporterEnabled = -not [string]::IsNullOrWhiteSpace($env:GITLAB_TOKEN)

if ($DependencyExporterEnabled) {
    Write-Host ""
    Write-Host "GITLAB_TOKEN encontrado no ambiente." -ForegroundColor Green
    Write-Host "Dependency exporter será habilitado." -ForegroundColor Green
}
else {
    Write-Host ""
    Write-Host "Aviso: GITLAB_TOKEN não encontrado no ambiente." -ForegroundColor Yellow
    Write-Host "Dependency exporter será ignorado." -ForegroundColor Yellow
}

function Update-SecurityResults {
    Write-Host "`nSincronizando security/results com o Git..."

    if (-not (Test-Path (Join-Path $MexeRoot ".git"))) {
        Write-Warning "Repositório Git não encontrado. Atualização de security/results ignorada."
        return
    }

    Push-Location $MexeRoot

    try {

        $GitStatus = @(git status --porcelain 2>&1)

        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Não foi possível verificar o estado do Git."
            return
        }

        if ($GitStatus.Count -gt 0) {
            Write-Warning "Working tree possui alterações locais."
            Write-Warning "git pull não será executado para evitar interferir no trabalho local."
            return
        }

        git pull --ff-only

        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Não foi possível atualizar o repositório com git pull --ff-only."
            Write-Warning "Observe o mecanismo de atualização de security/results."
            return
        }

        Write-Host "security/results sincronizado com o Git." -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}

function Test-KindSecurityResults {
    Write-Host "`nVerificando security/results dentro do Kind..."

    if (-not $SecurityExporterEnabled) {
        Write-Host "Security exporter desabilitado. Verificação ignorada." -ForegroundColor Yellow
        return
    }

    $CurrentDir = Join-Path $SecurityResultsDir "current"

    if (-not (Test-Path $CurrentDir -PathType Container)) {
        Write-Warning "Diretório security/results/current não encontrado no host."
        Write-Warning "Observe o mecanismo de atualização."
        return
    }

    $NodeContainer = "$ClusterName-control-plane"

    docker exec $NodeContainer sh -c `
        "test -d /mnt/mexe-security-results/current"

    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Kind não está vendo security/results/current."
        Write-Warning "Observe o mecanismo de atualização."
        return
    }

    Write-Host "Kind atualizado: security/results está visível no mount." -ForegroundColor Green
}


Update-SecurityResults

# ============================================================
# 2. Cluster
# ============================================================

Write-Host "`n[2/4] Verificando cluster..."

if (-not (Test-Path $ClusterConfig)) {
    throw "Configuração do Kind não encontrada: $ClusterConfig"
}

$KindClusters = @(cmd /c "kind get clusters 2>&1")
$KindExitCode = $LASTEXITCODE

if ($KindExitCode -ne 0) {

    $NoClustersFound = $KindClusters -match "No kind clusters found"

    if (-not $NoClustersFound) {
        throw "Falha ao consultar os clusters Kind: $KindClusters"
    }

    $KindClusters = @()
}

$ClusterExists = $KindClusters -contains $ClusterName

$ControlPlaneInspect = @(cmd /c "docker container inspect $ClusterName-control-plane 2>&1")
$ControlPlaneExitCode = $LASTEXITCODE

if ($ControlPlaneExitCode -eq 0) {
    $ControlPlaneExists = $true
}
else {
    $ControlPlaneExists = $false
}

$ShouldCreateCluster = $false

if ($ClusterExists) {

    Write-Host "Cluster '$ClusterName' já existe. Reutilizando..." -ForegroundColor Green

}
elseif ($ControlPlaneExists) {

    Write-Host "Cluster '$ClusterName' não existe no Kind." -ForegroundColor Yellow
    Write-Host "Container '$ClusterName-control-plane' encontrado." -ForegroundColor Yellow
    Write-Host "Removendo container órfão..." -ForegroundColor Yellow

    docker rm -f "$ClusterName-control-plane"

    if ($LASTEXITCODE -ne 0) {
        throw "Não foi possível remover o container órfão '$ClusterName-control-plane'."
    }

    Write-Host "Container órfão removido." -ForegroundColor Green

    $ShouldCreateCluster = $true

}
else {

    Write-Host "Cluster '$ClusterName' não existe. Criando..."
    $ShouldCreateCluster = $true
}

if ($ShouldCreateCluster) {

    # Gera configuração temporária do Kind
    $KindConfig = Join-Path $env:TEMP "mexe-kind.yaml"

    $ClusterYaml = Get-Content $ClusterConfig -Raw

    if ($SecurityExporterEnabled) {

        $SecurityMount = @"
    extraMounts:
      - hostPath: $SecurityResultsDir
        containerPath: /mnt/mexe-security-results
        readOnly: true
"@

        $ClusterYaml = $ClusterYaml -replace `
            '(?m)^(\s+image:\s+kindest/node:[^\r\n]+)', `
            "`$1`n$SecurityMount"
    }

    Set-Content `
        -Path $KindConfig `
        -Value $ClusterYaml `
        -Encoding UTF8

    Write-Host "Configuração temporária do Kind criada."
    Write-Host "Conteúdo:"
    Get-Content $KindConfig

    kind create cluster `
        --config $KindConfig `
        --name $ClusterName

    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao criar o cluster '$ClusterName'."
    }

    Remove-Item `
        -Path $KindConfig `
        -Force `
        -ErrorAction SilentlyContinue
}

function Ensure-KindImage {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Image
    )

    Write-Host ""
    Write-Host "Verificando imagem: $Image"

    docker image inspect $Image *> $null

    if ($LASTEXITCODE -ne 0) {
        if ($Image -like "ghcr.io/*") {
            Write-Host "Imagem não encontrada localmente. Baixando do GHCR..."

            docker pull $Image

            if ($LASTEXITCODE -ne 0) {
                throw "Falha ao baixar a imagem '$Image'."
            }
        }
        else {
            throw "Imagem '$Image' não existe no Docker local."
        }
    }

    Write-Host "Imagem '$Image' encontrada no Docker local."
    Write-Host "Carregando '$Image' no Kind..."

    $ImageArchive = Join-Path `
        $env:TEMP `
        ("kind-image-" + [guid]::NewGuid().ToString("N") + ".tar")

    try {
        Write-Host "Exportando imagem para linux/amd64..."

        docker image save `
            --platform linux/amd64 `
            --output $ImageArchive `
            $Image

        if ($LASTEXITCODE -ne 0) {
            throw "Falha ao exportar a imagem '$Image'."
        }

        Write-Host "Carregando arquivo de imagem no Kind..."

        kind load image-archive $ImageArchive --name $ClusterName

        if ($LASTEXITCODE -ne 0) {
            throw "Falha ao carregar a imagem '$Image' no Kind."
        }

        Write-Host "Imagem '$Image' carregada no Kind." `
            -ForegroundColor Green
    }
    finally {
        if (Test-Path $ImageArchive) {
            Remove-Item $ImageArchive -Force
        }
    }
}

# ============================================================
# Garantir imagens locais no Kind
# ============================================================

Write-Host "`nGarantindo imagens locais no Kind..."

$KindImages = @(
    $BackendImage
)

if ($SecurityExporterEnabled) {
    $KindImages += "mexe-security-exporter:latest"
}

if ($DependencyExporterEnabled) {
    $KindImages += "mexe-dependency-exporter:latest"
}


# ============================================================
# 3. Kubernetes
# ============================================================

Write-Host "`n[3/4] Aguardando Kubernetes..."

kubectl wait `
    --for=condition=Ready `
    "node/$ClusterName-control-plane" `
    --timeout=120s

if ($LASTEXITCODE -ne 0) {
    throw "Kubernetes não ficou pronto dentro do tempo esperado."
}

Write-Host "Kubernetes OK." -ForegroundColor Green

Write-Host "`nGarantindo imagens locais no Kind..."

foreach ($Image in $KindImages) {
    Ensure-KindImage -Image $Image
}

if ($DependencyExporterEnabled) {

    $SecretExists = kubectl get secret $SecretName `
        --ignore-not-found `
        -o name

    if ([string]::IsNullOrWhiteSpace($SecretExists)) {

        Write-Host ""
        Write-Host "Criando Secret '$SecretName'..."

        kubectl create secret generic $SecretName `
            --from-literal=GITLAB_TOKEN="$env:GITLAB_TOKEN"

        if ($LASTEXITCODE -ne 0) {
            throw "Não foi possível criar o Secret '$SecretName'."
        }

        Write-Host "Secret criado." -ForegroundColor Green
    }
    else {
        Write-Host ""
        Write-Host "Secret '$SecretName' já existe." -ForegroundColor Green
    }
}

# ============================================================
# 4. Aplicar infraestrutura
# ============================================================

Write-Host "`n[4/4] Aplicando infraestrutura do MEXE..."

if (-not (Test-Path $KubernetesDir)) {
    throw "Diretório Kubernetes não encontrado: $KubernetesDir"
}

# Manifests obrigatórios
$RequiredManifests = @(
    (Join-Path $KubernetesDir "backend.yaml")
    (Join-Path $KubernetesDir "prometheus.yaml")
    (Join-Path $KubernetesDir "loki.yaml")
    (Join-Path $KubernetesDir "alloy.yaml")
)

foreach ($Manifest in $RequiredManifests) {

    $ManifestToApply = $Manifest
    $TemporaryManifest = $null

    if (
        (Split-Path $Manifest -Leaf) -eq "backend.yaml" -and
        $BackendImage -ne "mexe-backend:latest"
    ) {
        $TemporaryManifest = Join-Path `
            $env:TEMP `
            ("mexe-backend-" + [guid]::NewGuid().ToString("N") + ".yaml")

        $OriginalContent = Get-Content -LiteralPath $Manifest -Raw
        $ExpectedImage = "image: mexe-backend:latest"

        if (-not $OriginalContent.Contains($ExpectedImage)) {
            throw "Não foi possível localizar a imagem padrão em '$Manifest'."
        }

        $RenderedContent = $OriginalContent.Replace(
            $ExpectedImage,
            "image: $BackendImage"
        )

        Set-Content `
            -LiteralPath $TemporaryManifest `
            -Value $RenderedContent `
            -Encoding utf8

        $ManifestToApply = $TemporaryManifest
    }

    try {
        Write-Host "Aplicando: $Manifest"

        kubectl apply -f $ManifestToApply

        if ($LASTEXITCODE -ne 0) {
            throw "Falha ao aplicar o manifest: $Manifest"
        }
    }
    finally {
        if (
            $TemporaryManifest -and
            (Test-Path $TemporaryManifest)
        ) {
            Remove-Item -LiteralPath $TemporaryManifest -Force
        }
    }
}


# Security exporter
if ($SecurityExporterEnabled) {

    if (-not (Test-Path $SecurityExporterManifest)) {
        throw "Manifest do security-exporter não encontrado: $SecurityExporterManifest"
    }

    Write-Host "`nAplicando security-exporter..."

    kubectl apply -f $SecurityExporterManifest

    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao aplicar o security-exporter."
    }

    Write-Host "security-exporter aplicado." -ForegroundColor Green
}
else {
    Write-Host ""
    Write-Host "security-exporter não será aplicado." -ForegroundColor Yellow
}

# Dependency exporter
if ($DependencyExporterEnabled) {

    if (-not (Test-Path $DependencyExporterManifest)) {
        throw "Manifest do dependency-exporter não encontrado: $DependencyExporterManifest"
    }

    Write-Host "`nAplicando dependency-exporter..."

    kubectl apply -f $DependencyExporterManifest

    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao aplicar o dependency-exporter."
    }

    Write-Host "dependency-exporter aplicado." -ForegroundColor Green
}
else {
    Write-Host ""
    Write-Host "dependency-exporter não será aplicado." -ForegroundColor Yellow
}

# ============================================================
# Resultado
# ============================================================

Write-Host "`n=== Kubernetes pronto ===" -ForegroundColor Green

Test-KindSecurityResults

Write-Host "`nNodes:"
kubectl get nodes

Write-Host "`nPods:"
kubectl get pods -A

Write-Host "`nServices:"
kubectl get services
