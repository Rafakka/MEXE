

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path $PSScriptRoot -Parent

$frontendUrl = "http://localhost:8080"

function Wait-ForReady {
    param (
        [string]$Name,
        [string]$Url,
        [int]$TimeoutSeconds = 2
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

    do {
        try {
            curl.exe -fsS $Url
            return
        }
        catch {
            Start-Sleep -Milliseconds 200
        }
    } while ((Get-Date) -lt $deadline)

    throw "$Name did not become ready within ${TimeoutSeconds}s"
}


Write-Host "== MEXE Smoke Test v4 =="

Write-Host "`n[1/7] API Health"
curl.exe -fsS "$frontendUrl/api/health"

Write-Host "`n[2/7] API Ready"
curl.exe -fsS "$frontendUrl/api/ready"

Write-Host "`n[3/7] Prometheus"
Wait-ForReady `
    -Name "Prometheus" `
    -Url "http://localhost:9090/-/ready"

Write-Host "`n[4/7] Loki"
Wait-ForReady `
    -Name "Loki" `
    -Url "http://localhost:3100/ready"

Write-Host "`n[5/7] Grafana"
Wait-ForReady `
    -Name "Grafana" `
    -Url "http://localhost:3000/api/health"

Write-Host "`n[6/7] Frontend"
curl.exe -fsSI "$frontendUrl"

Write-Host "`n[7/7] Blend API"

$outputDir = Join-Path $env:TEMP "mexe-smoke"

New-Item `
    -ItemType Directory `
    -Force `
    -Path $outputDir | Out-Null

$resultPath = Join-Path $outputDir "result.png"

curl.exe `
    -f `
    -X POST "$frontendUrl/api/blend" `
    -H "X-Request-ID: smoke-test-v4" `
    -F "implicit_image_a=@${projectRoot}/tests/fixtures/image-a.png" `
    -F "implicit_image_b=@${projectRoot}/tests/fixtures/image-b.png" `
    -F "width=1024" `
    -F "height=1024" `
    -o $resultPath `
    -w "HTTP_STATUS=%{http_code}`nCONTENT_TYPE=%{content_type}`nSIZE=%{size_download}`n"

if (-not (Test-Path $resultPath)) {
    throw "Blend did not produce an output file"
}

$size = (Get-Item $resultPath).Length

if ($size -le 0) {
    throw "Blend produced an empty output"
}

Write-Host "Blend result: $size bytes"

python `
    "${projectRoot}/scripts/validate-image.py" `
    $resultPath

Remove-Item `
    -Recurse `
    -Force `
    $outputDir

Write-Host ""
Write-Host "== SMOKE TEST PASSED =="
