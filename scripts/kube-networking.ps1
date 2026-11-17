
$ErrorActionPreference = "Stop"

$GatewayApiVersion = "1.6.3"
$TraefikChartVersion = "42.4.1"

$TraefikReleaseName = "traefik"
$TraefikNamespace = "traefik"

$repoRoot = Split-Path -Parent $PSScriptRoot

# ============================================================
# Paths
# ============================================================

$gatewayApiManifest = Join-Path `
    $repoRoot `
    "k8s/networking/gateway-api/standard-install-v$GatewayApiVersion.yaml"

$GatewayClassManifest = Join-Path `
    $repoRoot `
    "k8s/networking/gatewayclass.yaml"

$TraefikValues = Join-Path `
    $repoRoot `
    "k8s/networking/traefik-values.yaml"

# ============================================================
# Preflight
# ============================================================

$RequiredFiles = @(
    $gatewayApiManifest
    $GatewayClassManifest
    $TraefikValues
)

foreach ($file in $RequiredFiles) {
    if (-not (Test-Path $file)) {
        throw "Required file not found: $file"
    }
}

$RequiredCommands = @("kubectl", "helm")

foreach ($command in $RequiredCommands) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $command"
    }
}

Write-Host "`n=== Checking Kubernetes connection ===" -ForegroundColor Cyan

kubectl cluster-info

if ($LASTEXITCODE -ne 0) {
    throw "Unable to connect to Kubernetes. Check KUBECONFIG and current context."
}

# ============================================================
# 1. Gateway API
# ============================================================

Write-Host "`n=== Installing Gateway API CRDs ===" -ForegroundColor Cyan

kubectl apply -f $gatewayApiManifest

if ($LASTEXITCODE -ne 0) {
    throw "Failed to install Gateway API CRDs"
}


$GatewayApiCrds = @(
    "gatewayclasses.gateway.networking.k8s.io"
    "gateways.gateway.networking.k8s.io"
    "httproutes.gateway.networking.k8s.io"
)

foreach ($crd in $GatewayApiCrds) {

    kubectl wait `
        --for=condition=Established `
        "crd/$crd" `
        --timeout=120s

    if ($LASTEXITCODE -ne 0) {
        throw "Gateway API CRD was not established: $crd"
    }
}

# ============================================================
# 2. Traefik Helm
# ============================================================

Write-Host "`n=== Configuring Traefik Helm repository ===" -ForegroundColor Cyan

helm repo add traefik https://traefik.github.io/charts --force-update

if ($LASTEXITCODE -ne 0) {
    throw "Failed to add Traefik Helm repository"
}

helm repo update

if ($LASTEXITCODE -ne 0) {
    throw "Failed to update Helm repositories"
}

Write-Host "`n=== Installing Traefik ===" -ForegroundColor Cyan

helm upgrade --install $TraefikReleaseName traefik/traefik `
    --namespace $TraefikNamespace `
    --create-namespace `
    --version $TraefikChartVersion `
    --values $TraefikValues

if ($LASTEXITCODE -ne 0) {
    throw "Failed to install Traefik"
}

Write-Host "`nTraefik installation completed." -ForegroundColor Green

Write-Host "`n=== Waiting for Traefik Deployment ===" -ForegroundColor Cyan

kubectl rollout status `
    deployment/traefik `
    --namespace $TraefikNamespace `
    --timeout=180s

if ($LASTEXITCODE -ne 0) {
    throw "Traefik Deployment did not become ready"
}

# ============================================================
# 3. GatewayClass
# ============================================================

Write-Host "`n=== Applying GatewayClass ===" -ForegroundColor Cyan

kubectl apply -f $GatewayClassManifest

if ($LASTEXITCODE -ne 0) {
    throw "Failed to apply GatewayClass"
}

Write-Host "`n=== Waiting for GatewayClass acceptance ===" -ForegroundColor Cyan

kubectl wait `
    --for=condition=Accepted `
    gatewayclass/traefik `
    --timeout=120s

if ($LASTEXITCODE -ne 0) {
    throw "GatewayClass was not accepted by Traefik"
}


