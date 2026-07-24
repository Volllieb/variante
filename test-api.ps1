. $PROFILE
$body = @{
    model = "deepseek-v4-pro"
    max_tokens = 100
    messages = @(
        @{ role = "user"; content = "say hi" }
    )
} | ConvertTo-Json -Depth 4 -Compress

Write-Host "Testing with model: deepseek-v4-pro"
Write-Host "API Key present: $($env:ANTHROPIC_API_KEY.Length -gt 0)"

try {
    $r = Invoke-RestMethod -Uri "https://api.deepseek.com/anthropic/messages" -Method Post -Body $body -ContentType "application/json" -Headers @{ "x-api-key" = $env:ANTHROPIC_API_KEY }
    Write-Host "SUCCESS:" $r.content[0].text
} catch {
    Write-Host "STATUS:" $_.Exception.Response.StatusCode.value__
    Write-Host "MESSAGE:" $_.Exception.Message
    try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $reader.DiscardBufferedData()
        Write-Host "BODY:" $reader.ReadToEnd()
    } catch {}
}
