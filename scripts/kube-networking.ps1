
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "lib/kind-images.ps1")

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

$GatewayManifest = Join-Path `
    $repoRoot `
    "k8s/networking/gateway.yaml"

$FrontendRouteManifest = Join-Path `
    $repoRoot `
    "k8s/networking/frontend-route.yaml"

$GrafanaRouteManifest = Join-Path `
    $repoRoot `
    "k8s/networking/grafana-route.yaml"

$TraefikValues = Join-Path `
    $repoRoot `
    "k8s/networking/traefik-values.yaml"

# ============================================================
# Preflight
# ============================================================

$RequiredFiles = @(
    $gatewayApiManifest
    $GatewayClassManifest
    $GatewayManifest
    $FrontendRouteManifest
    $GrafanaRouteManifest
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

Ensure-KindImage `
    -Image "traefik:v3.7.19" `
    -ClusterName "mexe" `
    -PullIfMissing

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

# ============================================================
# 4. Gateway
# ============================================================

Write-Host "`n=== Applying Gateway ===" -ForegroundColor Cyan

kubectl apply -f $GatewayManifest

if ($LASTEXITCODE -ne 0) {
    throw "Failed to apply Gateway"
}

Write-Host "`n=== Waiting for Gateway acceptance ===" -ForegroundColor Cyan

kubectl wait `
    --for=condition=Accepted=True `
    gateway/mexe-gateway `
    --namespace default `
    --timeout=120s

if ($LASTEXITCODE -ne 0) {
    throw "Gateway was not accepted"
}

Write-Host "`n=== Waiting for Gateway programming ===" -ForegroundColor Cyan

kubectl wait `
    --for=condition=Programmed=True `
    gateway/mexe-gateway `
    --namespace default `
    --timeout=120s

if ($LASTEXITCODE -ne 0) {
    throw "Gateway was not programmed"
}

# ============================================================
# 5. HTTPRoutes
# ============================================================

Write-Host "`n=== Applying Frontend HTTPRoute ===" -ForegroundColor Cyan

kubectl apply -f $FrontendRouteManifest

if ($LASTEXITCODE -ne 0) {
    throw "Failed to apply Frontend HTTPRoute"
}

Write-Host "`n=== Applying Grafana HTTPRoute ===" -ForegroundColor Cyan

kubectl apply -f $GrafanaRouteManifest

if ($LASTEXITCODE -ne 0) {
    throw "Failed to apply Grafana HTTPRoute"
}

# ============================================================
# 6. HTTPRoute validation
# ============================================================

$HttpRoutes = @(
    "mexe-frontend-route"
    "grafana-route"
)

foreach ($route in $HttpRoutes) {

    Write-Host "`n=== Waiting for HTTPRoute acceptance: $route ===" -ForegroundColor Cyan

    $Timeout = 120
    $Elapsed = 0
    $Accepted = $false
    $Resolved = $false

    while ($Elapsed -lt $Timeout) {

        $RouteJson = kubectl get httproute $route -n default -o json | ConvertFrom-Json

        if ($LASTEXITCODE -ne 0) {
            throw "Failed to retrieve HTTPRoute: $route"
        }

        foreach ($parent in $RouteJson.status.parents) {

            if ($parent.controllerName -ne "traefik.io/gateway-controller") {
                continue
            }

            foreach ($condition in $parent.conditions) {

                if ($condition.type -eq "Accepted" -and $condition.status -eq "True") {
                    $Accepted = $true
                }

                if ($condition.type -eq "ResolvedRefs" -and $condition.status -eq "True") {
                    $Resolved = $true
                }
            }
        }

        if ($Accepted -and $Resolved) {
            break
        }

        Start-Sleep -Seconds 2
        $Elapsed += 2
    }

    if (-not $Accepted) {
        throw "HTTPRoute was not accepted: $route"
    }

    if (-not $Resolved) {
        throw "HTTPRoute references were not resolved: $route"
    }

    Write-Host "$route accepted and references resolved." -ForegroundColor Green
}

# ============================================================
# 7. Networking summary
# ============================================================

Write-Host "`n=== Gateway Networking Status ===" -ForegroundColor Cyan

kubectl get gatewayclass traefik

kubectl get gateway mexe-gateway --namespace default

kubectl get httproutes --namespace default

kubectl get services --all-namespaces

Write-Host "`n=== M.E.X.E. networking installation completed ===" -ForegroundColor Green

Write-Host "`nExpected local endpoints:" -ForegroundColor Cyan
Write-Host "Frontend: http://mexe.localhost:32717"
Write-Host "Grafana: http://grafana.localhost:32717"
