$ErrorActionPreference = "Stop"

$MexeRoot = Split-Path $PSScriptRoot -Parent

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
$SecretExists = kubectl get secret $SecretName `
    --ignore-not-found `
    -o name

$DependencyExporterEnabled = $false

if (-not [string]::IsNullOrWhiteSpace($SecretExists)) {
    Write-Host ""
    Write-Host "Secret '$SecretName' já existe." -ForegroundColor Green
    $DependencyExporterEnabled = $true
}
elseif (-not [string]::IsNullOrWhiteSpace($env:GITLAB_TOKEN)) {
    Write-Host ""
    Write-Host "GITLAB_TOKEN encontrado no ambiente." -ForegroundColor Green
    Write-Host "Criando Secret '$SecretName'..."

    kubectl create secret generic $SecretName `
        --from-literal=GITLAB_TOKEN="$env:GITLAB_TOKEN"

    if ($LASTEXITCODE -ne 0) {
        throw "Não foi possível criar o Secret '$SecretName'."
    }

    Write-Host "Secret criado." -ForegroundColor Green
    $DependencyExporterEnabled = $true
}
else {
    Write-Host ""
    Write-Host "Aviso: GITLAB_TOKEN não encontrado no ambiente." -ForegroundColor Yellow
    Write-Host "dependency-exporter será ignorado." -ForegroundColor Yellow
}

# ============================================================
# 2. Cluster
# ============================================================

Write-Host "`n[2/4] Verificando cluster..."

if (-not (Test-Path $ClusterConfig)) {
    throw "Configuração do Kind não encontrada: $ClusterConfig"
}

$ClusterExists = kind get clusters |
    Select-String "^$ClusterName$"

if (-not $ClusterExists) {
    Write-Host "Cluster '$ClusterName' não existe. Criando..."

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

        $ClusterYaml = $ClusterYaml.TrimEnd() + "`n" + $SecurityMount
    }

    Set-Content `
        -Path $KindConfig `
        -Value $ClusterYaml `
        -Encoding UTF8

    Write-Host "Configuração temporária do Kind criada."

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
else {
    Write-Host "Cluster '$ClusterName' já existe." -ForegroundColor Green
}

function Ensure-KindImage {
    param (
        [string]$Image
    )

    Write-Host ""
    Write-Host "Verificando imagem: $Image"

    # Verifica se a imagem existe no Docker host
    docker image inspect $Image | Out-Null

    if ($LASTEXITCODE -ne 0) {
        throw "Imagem '$Image' não encontrada no Docker host."
    }

    $KindImages = docker exec $ClusterName-control-plane `
        crictl images `
        2>$null

    $ImageName = $Image.Split(":")[0]
    $ImageTag = $Image.Split(":")[1]

    $ImageExists = $KindImages |
        Select-String "docker.io/library/$ImageName\s+$ImageTag"

    if ($ImageExists) {
        Write-Host "Imagem '$Image' já está no Kind." -ForegroundColor Green
        return
    }

    Write-Host "Imagem '$Image' não está no Kind. Carregando..."

    kind load docker-image $Image --name $ClusterName

    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao carregar a imagem '$Image' no Kind."
    }

    Write-Host "Imagem '$Image' carregada no Kind." -ForegroundColor Green
}

# ============================================================
# Garantir imagens locais no Kind
# ============================================================

Write-Host "`nGarantindo imagens locais no Kind..."

Ensure-KindImage -Image "mexe-backend:latest"

if ($SecurityExporterEnabled) {
    Ensure-KindImage -Image "mexe-security-exporter:latest"
}

if ($DependencyExporterEnabled) {
    Ensure-KindImage -Image "mexe-dependency-exporter:latest"
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
    if (-not (Test-Path $Manifest)) {
        throw "Manifest não encontrado: $Manifest"
    }
}

# Aplicar manifests obrigatórios individualmente
foreach ($Manifest in $RequiredManifests) {

    Write-Host "Aplicando: $Manifest"

    kubectl apply -f $Manifest

    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao aplicar o manifest: $Manifest"
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

Write-Host "`nNodes:"
kubectl get nodes

Write-Host "`nPods:"
kubectl get pods -A

Write-Host "`nServices:"
kubectl get services
