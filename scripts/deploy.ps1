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
    $repoData = Invoke-RestMethod -Uri ("https://api.github.com/repos/{0}/{1}" -f $owner, $repo) -Headers $headers
    Write-Host ("Authenticated successfully as repository: {0}" -f $repoData.full_name)
} catch {
    Write-Error ("Authentication failed: {0}" -f $_.Exception.Message)
    exit 1
}

# 1. Push main branch via git using token
Write-Host "==> Pushing source commits to main branch..."
$pushUrl = ("https://{0}:{1}@github.com/{0}/{1}.git" -f $owner, $Token, $repo)
try {
    & "C:\Users\fariss\PortableGit\cmd\git.exe" push $pushUrl main
    Write-Host "Source commits pushed to main branch successfully."
} catch {
    Write-Warning ("Direct git push notice: {0}. Continuing with API upload..." -f $_.Exception.Message)
}

# 2. Upload dist files to gh-pages branch
$distPath = (Resolve-Path (Join-Path $PSScriptRoot "..\dist")).Path
$files = Get-ChildItem -Path $distPath -Recurse -File

Write-Host ("==> Uploading {0} dist files to '{1}' branch via GitHub API..." -f $files.Count, $branch)

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($distPath.Length + 1).Replace('\', '/')
    $contentBytes = [System.IO.File]::ReadAllBytes($file.FullName)
    $contentBase64 = [System.Convert]::ToBase64String($contentBytes)

    # Check if file exists on gh-pages branch to get its SHA
    $fileSha = $null
    $checkUrl = "https://api.github.com/repos/{0}/{1}/contents/{2}?ref={3}" -f $owner, $repo, $relativePath, $branch
    try {
        $existing = Invoke-RestMethod -Uri $checkUrl -Headers $headers -ErrorAction Stop
        $fileSha = $existing.sha
    } catch {
        # File doesn't exist yet on gh-pages
    }

    $bodyObj = @{
        message = ("Deploy PWA fix: {0}" -f $relativePath)
        content = $contentBase64
        branch = $branch
    }
    if ($fileSha) {
        $bodyObj["sha"] = $fileSha
    }

    $jsonBody = $bodyObj | ConvertTo-Json -Compress
    $putUrl = "https://api.github.com/repos/{0}/{1}/contents/{2}" -f $owner, $repo, $relativePath

    try {
        $result = Invoke-RestMethod -Uri $putUrl -Method Put -Headers $headers -Body $jsonBody -ContentType "application/json"
        Write-Host ("  [OK] Uploaded: {0}" -f $relativePath)
    } catch {
        Write-Host ("  [FAIL] {0}: {1}" -f $relativePath, $_.Exception.Message)
    }
}

Write-Host "==> All files deployed to gh-pages branch."
