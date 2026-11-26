
function Ensure-KindImage {
    param (
        [Parameter(Mandatory = $true)]
        [string]$Image,

        [Parameter(Mandatory)]
        [string]$ClusterName,

        [string]$TempDirectory = [System.IO.Path]::GetTempPath(),

        [switch]$RefreshImages,

        [switch]$PullIfMissing

    )

    Write-Host ""
    Write-Host "Verificando imagem: $Image"

    $ImageExists = $false

    docker image inspect $Image *> $null

    if ($LASTEXITCODE -eq 0) {
        $ImageExists = $true
    }

    # Decide se precisa baixar a imagem.
    $ShouldPull = $false

    if ($RefreshImages) {
        $ShouldPull = $true
    }
    elseif (-not $ImageExists -and $PullIfMissing) {
        $ShouldPull = $true
    }

    if ($ShouldPull) {

        if ($RefreshImages) {
            Write-Host "Atualização solicitada: $Image"
        }
        else {
            Write-Host "Imagem ausente localmente. Baixando: $Image"
        }

        docker pull $Image

        if ($LASTEXITCODE -ne 0) {
            throw "Falha ao baixar a imagem '$Image'."
        }

        $ImageExists = $true
    }

    if (-not $ImageExists) {
        throw "Imagem local '$Image' não encontrada."
    }

    # Conferir plataforma.
    $Platform = docker image inspect $Image --format '{{.Os}}/{{.Architecture}}'

    if ($LASTEXITCODE -ne 0) {
        throw "Não foi possível verificar a plataforma da imagem '$Image'."
    }

    if ($Platform.Trim() -ne "linux/amd64") {
        throw "Plataforma incompatível: $Image ($Platform). Esperado: linux/amd64."
    }

    Write-Host "Imagem disponível: $Image ($Platform)" -ForegroundColor Green

    Write-Host "Carregando imagem no Kind (linux/amd64)..."

    if (-not (Test-Path -LiteralPath $TempDirectory)) {
        New-Item -ItemType Directory -Path $TempDirectory -Force | Out-Null
    }

    $ArchivePath = Join-Path `
        $TempDirectory `
        ("mexe-kind-" + [guid]::NewGuid().ToString("N") + ".tar")

    try {

        Write-Host "Exportando somente a plataforma linux/amd64..."

        docker image save `
            --platform linux/amd64 `
            --output $ArchivePath `
            $Image

        if ($LASTEXITCODE -ne 0) {
            throw "Falha ao exportar a imagem '$Image'."
        }

        Write-Host "Importando arquivo no Kind..."

        kind load image-archive $ArchivePath --name $ClusterName


        if ($LASTEXITCODE -ne 0) {
            throw "Falha ao importar a imagem '$Image' no Kind."
        }

        $NodeName = "$ClusterName-control-plane"

        $ImageCheck = docker exec $NodeName crictl images -o json

        if ($LASTEXITCODE -ne 0) {
            throw "Não foi possível verificar as imagens no node '$NodeName'."
        }

        $Images = $ImageCheck | ConvertFrom-Json

        if ($null -eq $Images.images) {
            throw "Resposta inválida ao consultar as imagens do node '$NodeName'."
        }

        $ImageFound = $Images.images | Where-Object {
            $_.repoTags | Where-Object {
                $_ -eq $Image -or $_ -eq "docker.io/library/$Image"
            }
        }

        if (-not $ImageFound) {
            throw "A imagem '$Image' não foi encontrada no containerd do Kind."
        }

        Write-Host "Imagem '$Image' carregada no Kind." -ForegroundColor Green
    }
    finally {

        if (Test-Path -LiteralPath $ArchivePath) {
            Remove-Item -LiteralPath $ArchivePath -Force
        }
    }
}
