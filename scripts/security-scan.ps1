
$ErrorActionPreference = "Stop"

$TrivyImage = "aquasec/trivy:latest"
$TrivyIgnore = Join-Path (Get-Location) ".trivyignore"

Write-Host "== MEXE Security Scan =="

Write-Host ""
Write-Host "[1/6] Backend"

docker run --rm `
    -v /var/run/docker.sock:/var/run/docker.sock `
    $TrivyImage `
    image `
    --severity HIGH,CRITICAL `
    --exit-code 1 `
    mexe-backend:latest

Write-Host ""
Write-Host "[2/6] Frontend"

docker run --rm `
    -v /var/run/docker.sock:/var/run/docker.sock `
    $TrivyImage `
    image `
    --severity HIGH,CRITICAL `
    --exit-code 1 `
    mexe-frontend:latest

Write-Host ""
Write-Host "[3/6] Alloy"

docker pull grafana/alloy:latest

docker run --rm `
    -v /var/run/docker.sock:/var/run/docker.sock `
    -v "${TrivyIgnore}:/root/.trivyignore:ro" `
    $TrivyImage `
    image `
    --severity HIGH,CRITICAL `
    --exit-code 1 `
    --ignorefile /root/.trivyignore `
    grafana/alloy:latest

Write-Host ""
Write-Host "[4/6] Grafana"

docker pull grafana/grafana:latest

docker run --rm `
    -v /var/run/docker.sock:/var/run/docker.sock `
    $TrivyImage `
    image `
    --severity HIGH,CRITICAL `
    --exit-code 1 `
    grafana/grafana:latest

Write-Host ""
Write-Host "[5/6] Loki"

docker pull grafana/loki:3.7.0

docker run --rm `
    -v /var/run/docker.sock:/var/run/docker.sock `
    $TrivyImage `
    image `
    --severity HIGH,CRITICAL `
    --exit-code 1 `
    grafana/loki:3.7.0

Write-Host ""
Write-Host "[6/6] Prometheus"

docker pull prom/prometheus:latest

docker run --rm `
    -v /var/run/docker.sock:/var/run/docker.sock `
    $TrivyImage `
    image `
    --severity HIGH,CRITICAL `
    --exit-code 1 `
    prom/prometheus:latest

Write-Host ""
Write-Host "== Security Scan PASSED =="
