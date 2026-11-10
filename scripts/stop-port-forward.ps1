

$ErrorActionPreference = "Stop"

$PidFile = Join-Path $env:TEMP "mexe-port-forward.pid"

if (-not (Test-Path $PidFile)) {
    Write-Host "Nenhum port-forward gerenciado foi encontrado." -ForegroundColor Yellow
    exit 0
}

$ForwardPid = [int](Get-Content $PidFile -Raw).Trim()

$ForwardProcess = Get-CimInstance Win32_Process `
    -Filter "ProcessId = $ForwardPid" `
    -ErrorAction SilentlyContinue

if (-not $ForwardProcess) {
    Write-Host "Processo não existe. Removendo PID obsoleto." -ForegroundColor Yellow
    Remove-Item $PidFile -Force
    exit 0
}

$CommandLine = $ForwardProcess.CommandLine

$IsExpectedProcess = (
    $CommandLine -match 'kubectl(\.exe)?' -and
    $CommandLine -match 'port-forward' -and
    $CommandLine -match 'service/mexe-backend' -and
    $CommandLine -match '18000:8000'
)

if (-not $IsExpectedProcess) {
    throw "O PID registrado não corresponde ao port-forward esperado. Processo preservado."
}

Stop-Process -Id $ForwardPid -Force

Remove-Item $PidFile -Force

Write-Host "Port-forward encerrado com sucesso." -ForegroundColor Green

