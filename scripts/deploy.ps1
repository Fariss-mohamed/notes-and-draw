param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$owner = "Fariss-mohamed"
$repo = "notes-and-draw"
$branch = "gh-pages"

$headers = @{
    Authorization = "Bearer $Token"
    Accept = "application/vnd.github.v3+json"
    "User-Agent" = "PWA-Deployment-Script"
}

Write-Host "==> Verifying GitHub Authentication..."
try {
    $repoData = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo" -Headers $headers
    Write-Host "Authenticated successfully as repository: $($repoData.full_name)"
} catch {
    Write-Error "Authentication failed: $($_.Exception.Message)"
    exit 1
}

# 1. Push main branch via git using token
Write-Host "==> Pushing source commits to main branch..."
$pushUrl = "https://$($owner):$($Token)@github.com/$owner/$repo.git"
try {
    & "C:\Users\fariss\PortableGit\cmd\git.exe" push $pushUrl main
    Write-Host "Source commits pushed to main branch successfully."
} catch {
    Write-Warning "Direct git push failed: $($_.Exception.Message). Continuing with API upload to gh-pages..."
}

# 2. Upload dist files to gh-pages branch
$distPath = Join-Path $PSScriptRoot "..\dist"
$files = Get-ChildItem -Path $distPath -Recurse -File

Write-Host "==> Uploading $($files.Count) dist files to '$branch' branch via GitHub API..."

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($distPath.Length + 1).Replace('\', '/')
    $contentBytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $contentBase64 = [System.Convert]::ToBase64String($contentBytes)

    # Check if file exists on gh-pages branch to get its SHA
    $fileSha = $null
    try {
        $existing = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/contents/$relativePath`?ref=$branch" -Headers $headers -ErrorAction Stop
        $fileSha = $existing.sha
    } catch {
        # File doesn't exist yet on gh-pages, will create new
    }

    $bodyObj = @{
        message = "Deploy fix for PWA installability: $relativePath"
        content = $contentBase64
        branch = $branch
    }
    if ($fileSha) {
        $bodyObj["sha"] = $fileSha
    }

    $jsonBody = $bodyObj | ConvertTo-Json -Compress

    try {
        $result = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/contents/$relativePath" -Method Put -Headers $headers -Body $jsonBody -ContentType "application/json"
        Write-Host "  ✓ Uploaded: $relativePath"
    } catch {
        Write-Host "  ✗ Failed $relativePath : $($_.Exception.Message)"
    }
}

Write-Host "==> All files deployed to $branch branch."
