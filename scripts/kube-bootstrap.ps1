
param(
    [string]$BackendImage = "ghcr.io/rafakka/mexe-backend:latest"
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

$PortForwardPort = 18000
$PortForwardPidFile = Join-Path $env:TEMP "mexe-port-forward.pid"
$PortForwardStdout = Join-Path $env:TEMP "mexe-port-forward.stdout.log"
$PortForwardStderr = Join-Path $env:TEMP "mexe-port-forward.stderr.log"

$SecretName = "mexe-dependency-exporter"

$ClusterName = "mexe"

$KubeconfigPath = Join-Path `
    $env:TEMP `
    "mexe-kind-mexe.kubeconfig"

$env:KIND_EXPERIMENTAL_PROVIDER = "docker"


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

    throw @"
Foi encontrado o container '$ClusterName-control-plane',
mas o Kind não reconhece o cluster '$ClusterName'.

O bootstrap não removerá o container automaticamente.

Investigue o estado do Docker e do Kind antes de continuar.
"@

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
        --name $ClusterName `
        --kubeconfig $KubeconfigPath `
        --wait 5m

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

    if ($Image -like "ghcr.io/*") {
        Write-Host "Atualizando imagem remota: $Image"

        docker pull $Image

        if ($LASTEXITCODE -ne 0) {
            throw "Falha ao baixar a imagem '$Image' do registry."
        }
    }
    else {
        docker image inspect $Image *> $null

        if ($LASTEXITCODE -ne 0) {
            throw "Imagem local '$Image' não existe no Docker."
        }
    }

    Write-Host "Imagem '$Image' disponível." -ForegroundColor Green
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


function Get-ImageFingerprint {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Image
    )

    if ($Image -like "ghcr.io/*") {
        $InspectOutput = docker image inspect $Image --format '{{json .RepoDigests}}'

        if ($LASTEXITCODE -ne 0) {
            throw "Não foi possível inspecionar a imagem '$Image'."
        }

        $RepoDigests = @($InspectOutput | ConvertFrom-Json)
        $Repository = $Image -replace ':[^/:]+$', ''

        $RepoDigest = $RepoDigests |
            Where-Object { $_ -like "$Repository@sha256:*" } |
            Select-Object -First 1

        if (-not $RepoDigest) {
            throw "Não foi possível obter o digest do registry para '$Image'."
        }

        return $RepoDigest.Substring($RepoDigest.IndexOf("@") + 1)
    }

    $ImageId = docker image inspect $Image --format '{{.Id}}'

    if ($LASTEXITCODE -ne 0) {
        throw "Não foi possível obter o ID da imagem local '$Image'."
    }

    return $ImageId.Trim()
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

# ------------------------------------------------------------
# Verificar se o container do control-plane está em execução
# ------------------------------------------------------------

$ControlPlaneRunning = docker inspect `
    --format '{{.State.Running}}' `
    "$ClusterName-control-plane" 2>$null

if ($LASTEXITCODE -ne 0) {
    throw "Não foi possível localizar o container do control-plane."
}

if ($ControlPlaneRunning.Trim() -ne "true") {
    throw "O container do control-plane existe, mas não está em execução. Verifique o Docker."
}

Write-Host "Container do control-plane em execução." `
    -ForegroundColor Green

# ------------------------------------------------------------
# Atualizar o kubeconfig usando o próprio Kind
# ------------------------------------------------------------

Write-Host "`nConfigurando kubeconfig isolado do Kind..."

kind export kubeconfig `
    --name $ClusterName `
    --kubeconfig $KubeconfigPath

if ($LASTEXITCODE -ne 0) {
    throw "Não foi possível exportar o kubeconfig do Kind."
}

$env:KUBECONFIG = $KubeconfigPath

kubectl config use-context "kind-$ClusterName"

if ($LASTEXITCODE -ne 0) {
    throw "Não foi possível selecionar o contexto kind-$ClusterName."
}

Write-Host "Kubeconfig isolado: $KubeconfigPath" `
    -ForegroundColor Green

# ------------------------------------------------------------
# Aguardar o API Server responder
# ------------------------------------------------------------

Write-Host "`nAguardando API Server responder..."

$ApiServerReady = $false

for ($Attempt = 1; $Attempt -le 40; $Attempt++) {

    $ApiResponse = kubectl `
        --request-timeout=3s `
        get --raw=/readyz 2>$null

    if ($LASTEXITCODE -eq 0 -and $ApiResponse -match "ok") {
        $ApiServerReady = $true
        break
    }

    Write-Host "API Server ainda indisponível. Tentativa $Attempt/40..."

    Start-Sleep -Seconds 2
}

if (-not $ApiServerReady) {
    throw "API Server não respondeu dentro do tempo esperado. Verifique o estado do container Kind."
}

Write-Host "API Server respondendo." -ForegroundColor Green

# ------------------------------------------------------------
# Aguardar o Node ficar Ready
# ------------------------------------------------------------

Write-Host "`nAguardando Node ficar Ready..."

kubectl wait `
    --for=condition=Ready `
    "node/$ClusterName-control-plane" `
    --timeout=120s

if ($LASTEXITCODE -ne 0) {
    throw "O Node do Kubernetes não ficou pronto dentro do tempo esperado."
}

Write-Host "Kubernetes OK." -ForegroundColor Green

Write-Host "`nGarantindo imagens locais no Kind..."

foreach ($Image in $KindImages) {
    Ensure-KindImage -Image $Image
}

$BackendFingerprint = Get-ImageFingerprint -Image $BackendImage

Write-Host "Fingerprint desejado do backend: $BackendFingerprint"

$CurrentBackendFingerprint = $null

$CurrentDeploymentJson = kubectl get deployment mexe-backend `
    --ignore-not-found `
    -o json

if ($LASTEXITCODE -ne 0) {
    throw "Falha ao consultar o Deployment mexe-backend."
}

if (-not [string]::IsNullOrWhiteSpace(
    ($CurrentDeploymentJson -join "")
)) {
    $CurrentDeployment = (
        $CurrentDeploymentJson -join [Environment]::NewLine
    ) | ConvertFrom-Json

    $CurrentAnnotations = $CurrentDeployment.spec.template.metadata.annotations

    if ($CurrentAnnotations) {
        $CurrentBackendFingerprint = `
            $CurrentAnnotations.'mexe.io/backend-image-fingerprint'
    }
}
else {
    Write-Host "Deployment mexe-backend ainda não existe; será criado pelo bootstrap." `
        -ForegroundColor Yellow
}

if ($CurrentBackendFingerprint -eq $BackendFingerprint) {
    Write-Host "Digest do backend inalterado; nenhum rollout por mudança de digest é esperado."
}
elseif ($CurrentBackendFingerprint) {
    Write-Host "Digest do backend mudou. O manifesto provocará o rollout."
}
else {
    Write-Host "Ainda não há fingerprint registrado no Deployment."
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


# ============================================================
# Aplicar backend via Kustomize
# ============================================================

$BackendKustomizationDir = Join-Path `
    $KubernetesDir `
    (".bootstrap-" + [guid]::NewGuid().ToString("N"))

try {

    New-Item `
        -ItemType Directory `
        -Path $BackendKustomizationDir `
        -Force | Out-Null

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
  - ../base

patches:
  - path: backend-runtime-patch.yaml
"@

    Set-Content `
        -LiteralPath (Join-Path $BackendKustomizationDir "backend-runtime-patch.yaml") `
        -Value $PatchContent `
        -Encoding utf8

    Set-Content `
        -LiteralPath (Join-Path $BackendKustomizationDir "kustomization.yaml") `
        -Value $KustomizationContent `
        -Encoding utf8

    Write-Host "`nAplicando backend via Kustomize..."

    kubectl apply -k $BackendKustomizationDir

    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao aplicar o backend via Kustomize."
    }

    Write-Host "Backend aplicado via Kustomize." -ForegroundColor Green
}
finally {

    if (Test-Path $BackendKustomizationDir) {
        Remove-Item `
            -LiteralPath $BackendKustomizationDir `
            -Recurse `
            -Force
    }
}

# ============================================================
# Aplicar demais manifests obrigatórios
# ============================================================

$RequiredManifests = @(
    (Join-Path $KubernetesDir "prometheus.yaml")
    (Join-Path $KubernetesDir "loki.yaml")
    (Join-Path $KubernetesDir "alloy.yaml")
)

foreach ($Manifest in $RequiredManifests) {

    Write-Host "`nAplicando: $Manifest"

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


function Test-BackendLocalEndpoint {
    $null = & curl.exe -fsS --max-time 8 "http://127.0.0.1:$PortForwardPort/ready" 2>$null
    return ($LASTEXITCODE -eq 0)
}

function Ensure-BackendPortForward {

    Write-Host "`nVerificando port-forward do backend..."

    # Se a porta já estiver ocupada, verificar se é nossa ponte.
    $Listener = Get-NetTCPConnection `
        -LocalPort $PortForwardPort `
        -State Listen `
        -ErrorAction SilentlyContinue |
        Select-Object -First 1

    if ($Listener) {

        if (Test-BackendLocalEndpoint) {
            Write-Host "Port-forward já está funcionando." -ForegroundColor Green
            return
        }

        throw "A porta $PortForwardPort está ocupada, mas o backend não respondeu. Verifique o processo que utiliza essa porta."
    }

    $Kubectl = Get-Command kubectl.exe -ErrorAction Stop

    Write-Host "Iniciando port-forward em segundo plano..."

    $ForwardProcess = Start-Process `
        -FilePath $Kubectl.Source `
        -ArgumentList @(
            "port-forward",
            "--address",
            "0.0.0.0",
            "service/mexe-backend",
            "${PortForwardPort}:8000"
        ) `
        -WindowStyle Hidden `
        -PassThru `
        -RedirectStandardOutput $PortForwardStdout `
        -RedirectStandardError $PortForwardStderr

    Set-Content `
        -Path $PortForwardPidFile `
        -Value $ForwardProcess.Id

    $Deadline = (Get-Date).AddSeconds(30)

    do {

        Start-Sleep -Seconds 1

        $RunningProcess = Get-Process `
            -Id $ForwardProcess.Id `
            -ErrorAction SilentlyContinue

        if (-not $RunningProcess) {

            $ErrorLog = ""

            if (Test-Path $PortForwardStderr) {
                $ErrorLog = Get-Content $PortForwardStderr -Raw
            }

            Remove-Item $PortForwardPidFile -Force -ErrorAction SilentlyContinue

            throw "O port-forward encerrou inesperadamente. Detalhes: $ErrorLog"
        }

        if (Test-BackendLocalEndpoint) {

            Write-Host "Port-forward iniciado e backend respondendo." `
                -ForegroundColor Green

            return
        }

    } while ((Get-Date) -lt $Deadline)

    Stop-Process -Id $ForwardProcess.Id -Force -ErrorAction SilentlyContinue

    Remove-Item $PortForwardPidFile -Force -ErrorAction SilentlyContinue

    throw "Backend não respondeu pela porta local $PortForwardPort dentro de 30 segundos."
}



Write-Host "`nAguardando backend ficar disponível..."


kubectl rollout status deployment/mexe-backend --timeout=120s

if ($LASTEXITCODE -ne 0) {
throw "Deployment mexe-backend não ficou disponível."
}

Ensure-BackendPortForward


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
