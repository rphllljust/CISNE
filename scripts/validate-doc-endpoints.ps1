$ErrorActionPreference = "Stop"

$readme = Get-Content "README.md" -Raw
$required = @(
  "http://localhost:3000/api/v1",
  "http://localhost:3000/docs",
  "http://localhost:3000/api/v1/health"
)

foreach ($item in $required) {
  if ($readme -notmatch [regex]::Escape($item)) {
    throw "README.md sem endpoint obrigatorio: $item"
  }
}

Write-Host "OK: endpoints documentados padronizados no README."
