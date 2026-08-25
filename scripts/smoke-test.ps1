

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path $PSScriptRoot -Parent

Write-Host "== MEXE Smoke Test v2 =="

Write-Host "`n[1/5] Backend"
docker compose exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

Write-Host "[2/5] Prometheus"
curl.exe -fsS http://localhost:9090/-/ready

Write-Host "`n[3/5] Loki"
curl.exe -fsS http://localhost:3100/ready

Write-Host "`n[4/5] Grafana"
curl.exe -fsS http://localhost:3000/api/health

Write-Host "`n[5/5] Frontend"
curl.exe -fsSI http://localhost:8080

Write-Host ""
Write-Host "[6/6] Blend API"

$network = "mexe_mexe"

$outputDir = Join-Path $env:TEMP "mexe-smoke"

New-Item `
    -ItemType Directory `
    -Force `
    -Path $outputDir | Out-Null

$resultPath = Join-Path $outputDir "result.png"

docker run --rm `
    --network $network `
    -v "${projectRoot}/tests/fixtures:/fixtures:ro" `
    -v "${outputDir}:/output" `
    curlimages/curl:latest `
    -f `
    -X POST http://mexe-backend:8000/blend `
    -H "X-Request-ID: smoke-test-v3" `
    -F "implicit_image_a=@/fixtures/image-a.png" `
    -F "implicit_image_b=@/fixtures/image-b.png" `
    -F "width=1024" `
    -F "height=1024" `
    -o /output/result.png `
    -w "HTTP_STATUS=%{http_code}`nCONTENT_TYPE=%{content_type}`nSIZE=%{size_download}`n"

if (-not (Test-Path $resultPath)) {
    throw "Blend did not produce an output file"
}

$size = (Get-Item $resultPath).Length

if ($size -le 0) {
    throw "Blend produced an empty output"
}

Write-Host "Blend result: $size bytes"

docker cp $resultPath mexe-backend:/tmp/result.png

docker cp `
    "${projectRoot}/scripts/validate-image.py" `
    mexe-backend:/tmp/validate-image.py

docker exec mexe-backend `
    python /tmp/validate-image.py /tmp/result.png

Remove-Item `
    -Recurse `
    -Force `
    $outputDir

Write-Host ""
Write-Host "== SMOKE TEST PASSED =="
