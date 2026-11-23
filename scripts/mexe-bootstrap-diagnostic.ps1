# M.E.X.E. - Safe diagnostic for bootstrap application stage
# This script DOES NOT delete/recreate the Kind cluster and DOES NOT pull/load images.
$ErrorActionPreference = 'Stop'

try {
    Write-Host '=== MEXE bootstrap diagnostic (SAFE MODE) ===' -ForegroundColor Cyan
    $MexeRoot = Split-Path $PSScriptRoot -Parent
    # Diagnostic file may be copied to scripts/ to preserve this root calculation.
    if (-not (Test-Path (Join-Path $MexeRoot 'k8s'))) { $MexeRoot = (Get-Location).Path }
    $KubernetesDir = Join-Path $MexeRoot 'k8s'
    $NetworkingScript = Join-Path $PSScriptRoot 'kube-networking.ps1'
    $ClusterName = 'mexe'
    $KubeconfigPath = Join-Path $env:TEMP 'mexe-kind-mexe.kubeconfig'
    $BackendImage = 'ghcr.io/rafakka/mexe-backend:latest'
    $SecurityResultsDir = Join-Path $MexeRoot 'security\results'
    $SecurityExporterManifest = Join-Path $KubernetesDir 'optional\security-exporter.yaml'
    $DependencyExporterManifest = Join-Path $KubernetesDir 'optional\dependency-exporter.yaml'
    $SecurityExporterEnabled = Test-Path $SecurityResultsDir -PathType Container

    # Dependency exporter configuration
    $env:GITLAB_TOKEN = $null
    $DependencyExporterEnabled = $false

    $EnvFile = Join-Path $MexeRoot '.env'

    if (Test-Path $EnvFile -PathType Leaf) {
        $TokenLine = Get-Content $EnvFile |
            Where-Object { $_ -match '^GITLAB_TOKEN=' } |
            Select-Object -First 1

        if ($TokenLine) {
            $env:GITLAB_TOKEN = $TokenLine -replace '^GITLAB_TOKEN=', ''
        }
    }

    $DependencyExporterEnabled = -not [string]::IsNullOrWhiteSpace($env:GITLAB_TOKEN)

    if ($DependencyExporterEnabled) {
        Write-Host 'GITLAB_TOKEN configurado. Dependency exporter habilitado.' -ForegroundColor Green
    }
    else {
        Write-Host 'GITLAB_TOKEN ausente. Dependency exporter será ignorado.' -ForegroundColor Yellow
    }

    if (-not (Test-Path $NetworkingScript -PathType Leaf)) { throw "Networking script not found: $NetworkingScript" }
    if (-not (Test-Path $KubeconfigPath)) { throw "Isolated kubeconfig not found: $KubeconfigPath" }
    $env:KUBECONFIG = $KubeconfigPath

    Write-Host '[CHECK 1] Context and API readiness' -ForegroundColor Yellow
    kubectl config current-context
    kubectl get nodes
    if ($LASTEXITCODE -ne 0) { throw 'kubectl get nodes failed.' }

    Write-Host '[CHECK 2] Backend image fingerprint' -ForegroundColor Yellow
    $digestOutput = docker image inspect $BackendImage --format '{{json .RepoDigests}}'
    if ($LASTEXITCODE -ne 0) { throw "Backend image not available locally: $BackendImage" }
    $repoDigests = @($digestOutput | ConvertFrom-Json)
    $repository = $BackendImage -replace ':[^/:]+$', ''
    $repoDigest = $repoDigests | Where-Object { $_ -like "$repository@sha256:*" } | Select-Object -First 1
    if (-not $repoDigest) { throw 'No RepoDigest found for backend image; original bootstrap fingerprint function would fail here.' }
    $BackendFingerprint = $repoDigest.Substring($repoDigest.IndexOf('@') + 1)
    Write-Host "Fingerprint: $BackendFingerprint" -ForegroundColor Green

    Write-Host '[CHECK 3] Networking script execution' -ForegroundColor Yellow
    & $NetworkingScript
    Write-Host "Networking script returned. LASTEXITCODE=$LASTEXITCODE" -ForegroundColor Cyan
    kubectl get gatewayclass,gateway,httproute -A

    Write-Host '[CHECK 4] Temporary Kustomize patch creation and apply' -ForegroundColor Yellow
    $TestDir = Join-Path $KubernetesDir ('.bootstrap-diagnostic-' + [guid]::NewGuid().ToString('N'))
    try {
        New-Item -ItemType Directory -Path $TestDir -Force | Out-Null
        $ImageYaml = ConvertTo-Json -InputObject $BackendImage -Compress
        $FingerprintYaml = ConvertTo-Json -InputObject $BackendFingerprint -Compress
        $PatchContent = @"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mexe-backend
spec:
  template:
    metadata:
      annotations:
        mexe.io/backend-image-fingerprint: $FingerprintYaml
    spec:
      containers:
        - name: backend
          image: $ImageYaml
"@
        $KustomizationContent = @"
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../overlays/local

patches:
  - path: backend-runtime-patch.yaml
"@
        Set-Content -LiteralPath (Join-Path $TestDir 'backend-runtime-patch.yaml') -Value $PatchContent -Encoding utf8
        Set-Content -LiteralPath (Join-Path $TestDir 'kustomization.yaml') -Value $KustomizationContent -Encoding utf8
        Write-Host 'Rendering diagnostic kustomization...' -ForegroundColor Cyan
        kubectl kustomize $TestDir
        if ($LASTEXITCODE -ne 0) { throw 'Diagnostic kustomize render failed.' }
        Write-Host 'Applying diagnostic kustomization...' -ForegroundColor Cyan
        kubectl apply -k $TestDir
        if ($LASTEXITCODE -ne 0) { throw 'kubectl apply -k failed.' }
    }
    finally { if (Test-Path $TestDir) { Remove-Item $TestDir -Recurse -Force } }

   Write-Host '[CHECK 5] Optional exporters' -ForegroundColor Yellow

    # Security exporter
    if ($SecurityExporterEnabled) {
        kubectl apply -f $SecurityExporterManifest

        if ($LASTEXITCODE -ne 0) {
            throw 'Security exporter apply failed.'
        }

        Write-Host 'Security exporter applied.' -ForegroundColor Green
    }
    else {
        Write-Host 'Security exporter skipped (results directory not found).' -ForegroundColor Yellow
    }

    # Dependency exporter
    if ($DependencyExporterEnabled) {

        Write-Host 'Creating/updating Dependency Exporter Secret...' -ForegroundColor Cyan

        $SecretManifest = kubectl create secret generic mexe-dependency-exporter `
            --namespace default `
            --from-literal="GITLAB_TOKEN=$($env:GITLAB_TOKEN)" `
            --dry-run=client `
            -o yaml

        if ($LASTEXITCODE -ne 0) {
            throw 'Failed to generate Dependency Exporter Secret.'
        }

        $SecretManifest | kubectl apply -f -

        if ($LASTEXITCODE -ne 0) {
            throw 'Failed to apply Dependency Exporter Secret.'
        }

        Write-Host 'Dependency Exporter Secret applied.' -ForegroundColor Green

        kubectl apply -f $DependencyExporterManifest

        if ($LASTEXITCODE -ne 0) {
            throw 'Dependency exporter apply failed.'
        }

        Write-Host 'Dependency exporter applied.' -ForegroundColor Green
    }
    else {
        Write-Host 'Dependency exporter skipped (GITLAB_TOKEN not configured).' -ForegroundColor Yellow
    }

    Write-Host '[CHECK 6] Deployment/pods snapshot' -ForegroundColor Yellow
    kubectl get deployments,pods,services -A
    Write-Host '=== DIAGNOSTIC FINISHED ===' -ForegroundColor Green
}
catch {
    Write-Host "=== DIAGNOSTIC FAILED ===" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor DarkYellow
    exit 1
}
