$ErrorActionPreference = "Stop"
$env:AGENTMEMORY_URL = "http://127.0.0.1:3111"
npx -y @agentmemory/agentmemory@latest status
