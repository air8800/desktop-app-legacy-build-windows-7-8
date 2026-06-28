$content = Get-Content 'C:\Users\pro35\.gemini\antigravity-ide\brain\934c84b0-4938-4364-b54b-874aeba74e8a\.system_generated\steps\83\content.md' -Raw
$json = $content -replace '(?s)^.*?---\s*',''
$releases = $json | ConvertFrom-Json
foreach($r in $releases) {
    Write-Host "=== $($r.tag_name) ==="
    foreach($a in $r.assets) {
        Write-Host "  $($a.name) => $($a.size) bytes"
    }
}
