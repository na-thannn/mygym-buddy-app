$ErrorActionPreference = "Stop"

# Ensure Docker-backed iii engine is started by agentmemory.
$env:AGENTMEMORY_USE_DOCKER = "1"

# Force IPv4 loopback to avoid ::1 connectivity issues on Windows.
$env:AGENTMEMORY_URL = "http://127.0.0.1:3111"
$env:III_ENGINE_URL = "ws://127.0.0.1:49134"
$env:III_REST_PORT = "3111"

npx -y @agentmemory/agentmemory@latest --no-engine
