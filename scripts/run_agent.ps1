# PowerShell helper to create/activate venv and run the monitoring agent with logs
param(
    [string]$SessionId = "session-abc-123",
    [string]$NodeHost = "localhost",
    [int]$NodePort = 5000,
    [int]$StreamPort = 8001,
    [string]$ModelPath = "scripts\yolov8n.pt",
    [switch]$InstallDeps
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $root

$venvPath = Join-Path $root ".venv"
$python = Join-Path $venvPath "Scripts\python.exe"
$pip = Join-Path $venvPath "Scripts\pip.exe"

if (-not (Test-Path $venvPath)) {
    Write-Host "Creating virtualenv at $venvPath"
    python -m venv .venv
}

if ($InstallDeps) {
    if (-not (Test-Path $pip)) {
        Write-Error "pip not found in venv ($pip)"
        exit 1
    }
    Write-Host "Installing dependencies into venv..."
    & $pip install -r scripts\requirements.txt
}

if (-not (Test-Path $python)) {
    Write-Error "Python executable not found at $python. Activate your environment or ensure .venv exists."
    exit 1
}

$logFile = Join-Path $root "scripts\monitoring_agent.log"
Write-Host "Starting monitoring agent. Logs: $logFile"

$cmd = "`"$python`" .\scripts\monitoring_agent.py --session-id $SessionId --node-host $NodeHost --node-port $NodePort --stream-port $StreamPort --model-path $ModelPath"

# Start process and redirect output to log file, but also show in console
Start-Process -FilePath $python -ArgumentList ".\scripts\monitoring_agent.py","--session-id",$SessionId,"--node-host",$NodeHost,"--node-port",$NodePort,"--stream-port",$StreamPort,"--model-path",$ModelPath -NoNewWindow -RedirectStandardOutput $logFile -RedirectStandardError $logFile -Wait

Write-Host "Monitoring agent exited. See $logFile for details.""}