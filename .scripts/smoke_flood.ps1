$base = 'http://localhost:8081'
# Create a web session to persist cookies
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

# Signup (idempotent if email already exists - may return 400)
try {
  $signupBody = @{ email = 'smoketest+1@example.com'; password = 'smoke123'; displayName = 'Smoke Tester' } | ConvertTo-Json
  Invoke-RestMethod -Uri "$base/api/signup" -Method Post -ContentType 'application/json' -Body $signupBody -WebSession $session -ErrorAction Stop
} catch {
  # ignore signup errors (user may already exist)
}

$iterations = 20
for ($i = 0; $i -lt $iterations; $i++) {
  try {
    $feedBody = @{ content = "smoke post $i" } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/api/feed" -Method Post -ContentType 'application/json' -Body $feedBody -WebSession $session -ErrorAction Stop
  } catch {
    Write-Output "feed POST failed: $($_.Exception.Message)"
  }

  try {
    $inbodyBody = @{ reportDate = (Get-Date).ToString('yyyy-MM-dd'); weightKg = 70 + ($i % 5) } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/api/inbody" -Method Post -ContentType 'application/json' -Body $inbodyBody -WebSession $session -ErrorAction Stop
  } catch {
    Write-Output "inbody POST failed: $($_.Exception.Message)"
  }

  try {
    $workoutBody = @{ exercise = 'Squat'; performedAt = (Get-Date).ToString('o') } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/api/log/workout" -Method Post -ContentType 'application/json' -Body $workoutBody -WebSession $session -ErrorAction Stop
  } catch {
    Write-Output "workout POST failed: $($_.Exception.Message)"
  }

  try {
    $nutritionBody = @{ reportDate = (Get-Date).ToString('yyyy-MM-dd'); breakfast = 'Eggs' } | ConvertTo-Json
    Invoke-RestMethod -Uri "$base/api/log/nutrition-report" -Method Post -ContentType 'application/json' -Body $nutritionBody -WebSession $session -ErrorAction Stop
  } catch {
    Write-Output "nutrition POST failed: $($_.Exception.Message)"
  }

  Start-Sleep -Milliseconds 50
}

Write-Output 'Smoke flood complete.'
