# Testa a sintaxe dos scripts PowerShell do MEXE sem executá-los.
# Execute este arquivo com PowerShell 7 (pwsh).

$ErrorActionPreference = "Stop"

$ScriptRoot = $PSScriptRoot

$FilesToCheck = @(
    "kube-bootstrap.ps1",
    "kube-networking.ps1",
    "lib/kind-images.ps1"
)

Write-Host ""
Write-Host "=== MEXE | Validacao de sintaxe PowerShell ===" -ForegroundColor Cyan
Write-Host "Pasta dos scripts: $ScriptRoot"
Write-Host ""

$HasErrors = $false

foreach ($RelativePath in $FilesToCheck) {
    $FilePath = Join-Path $ScriptRoot $RelativePath

    if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) {
        Write-Host "[NAO ENCONTRADO] $RelativePath" -ForegroundColor Red
        $HasErrors = $true
        continue
    }

    $Tokens = $null
    $ParseErrors = $null

    [System.Management.Automation.Language.Parser]::ParseFile(
        $FilePath,
        [ref]$Tokens,
        [ref]$ParseErrors
    ) | Out-Null

    if ($ParseErrors.Count -eq 0) {
        Write-Host "[OK] $RelativePath" -ForegroundColor Green
    }
    else {
        Write-Host "[ERRO] $RelativePath" -ForegroundColor Red

        foreach ($ParseError in $ParseErrors) {
            $Line = $ParseError.Extent.StartLineNumber
            $Column = $ParseError.Extent.StartColumnNumber

            Write-Host "  Linha ${Line}, coluna ${Column}: $($ParseError.Message)" -ForegroundColor Yellow
            Write-Host "  $($ParseError.Extent.Text)"
        }

        $HasErrors = $true
    }

    Write-Host ""
}

Write-Host "--------------------------------------------"

if ($HasErrors) {
    Write-Host "Resultado: foram encontrados problemas." -ForegroundColor Red
    exit 1
}

Write-Host "Resultado: todos os arquivos passaram na validacao sintatica." -ForegroundColor Green
exit 0
