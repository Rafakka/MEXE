
$ErrorActionPreference = "Stop"

$BackendUrl = "http://localhost:32717"

Write-Host "=== MEXE Functional Bootstrap ===" -ForegroundColor Cyan

function Wait-ForReady {
    param (
        [string]$Name,
        [string]$Url,
        [int]$TimeoutSeconds = 30
    )

    Write-Host ""
    Write-Host "Verificando: $Name"

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

    do {
        try {
            $response = curl.exe `
                -fsS `
                $Url `
                2>$null

            if ($LASTEXITCODE -eq 0) {
                Write-Host "$Name OK." -ForegroundColor Green
                return
            }
        }
        catch {
            # Continua tentando até o timeout.
        }

        Start-Sleep -Milliseconds 500

    } while ((Get-Date) -lt $deadline)

    throw "$Name não ficou disponível dentro de ${TimeoutSeconds}s."
}

Write-Host "`n[1/2] Backend Health"

Wait-ForReady `
    -Name "Backend /health" `
    -Url "$BackendUrl/health"

Write-Host "`n[2/2] Backend Ready + Blend"

Wait-ForReady `
    -Name "Backend /ready" `
    -Url "$BackendUrl/ready"

Write-Host ""
Write-Host "=== FUNCTIONAL BOOTSTRAP PASSED ===" -ForegroundColor Green
