# PowerShell deployment script for Windows
# Load environment variables from .env file
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

# Get the API key
$apiKey = $env:GRAPH_API_KEY
if (-not $apiKey) {
    Write-Error "GRAPH_API_KEY not found in environment variables"
    exit 1
}

Write-Host "Authenticating with The Graph..."
graph auth $apiKey

Write-Host "Building subgraph..."
yarn build

Write-Host "Deploying to The Graph..."
graph deploy amana-zetachain --access-token $apiKey

Write-Host "Deployment completed!" 