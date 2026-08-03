# General Activ Daily deployment controller and the single deployment entry point.
# GitHub is preferred as the source of truth; repositories unavailable there
# are cloned and deployed from the authenticated bank GitLab mirror.
# Run from the workspace root or directly from premies_portal_front:
#   powershell -ExecutionPolicy Bypass -File .\premies_portal_front\deploy.ps1
# With no -Services argument, all configured services are cloned if necessary
# and deployed. Use -Services only when an explicit subset is required.

param(
    [switch]$Force,
    [string]$Services,
    [switch]$DryRun
)

$ErrorActionPreference = "Continue"

$Projects = @(
    @{
        LocalName     = "premies_portal"
        ServiceName   = "go-backend"
        DefaultBranch = "main"
        GitHubUrl     = "https://github.com/bezhan2009/premies_portal.git"
        GitlabProject = "Bejan/activ_daily_premies_backend.git"
        RemotePaths   = @("/home/bkarimov/daily_activ/go-backend", "/home/bkarimov/daily_activ/premies_portal")
    },
    @{
        LocalName     = "premies_automation"
        ServiceName   = "python-backend"
        DefaultBranch = "main"
        GitHubUrl     = "https://github.com/bezhan2009/premies_automation.git"
        GitlabProject = "Bejan/activ_daily_automation_backend.git"
        RemotePaths   = @(
            "/home/bkarimov/daily_activ/premies_automation",
            "/home/bkarimov/daily_activ/premies_automation_backend",
            "/home/bkarimov/daily_activ/premies_backend"
        )
    },
    @{
        LocalName     = "premies_portal_front"
        ServiceName   = "frontend"
        DefaultBranch = "master"
        GitHubUrl     = "https://github.com/bezhan2009/premies_portal_front.git"
        GitlabProject = "Bejan/activ_daily_frontend.git"
        RemotePaths   = @(
            "/home/bkarimov/daily_activ/premies_portal_front",
            "/home/bkarimov/daily_activ/premies_portal_frontend",
            "/home/bkarimov/daily_activ/frontend"
        )
    },
    @{
        LocalName     = "daily_tasks"
        ServiceName   = "daily_tasks"
        DefaultBranch = "main"
        GitHubUrl     = "https://github.com/bezhan2009/daily_tasks.git"
        GitlabProject = "Bejan/activ_daily_tasks_backend.git"
        RemotePaths   = @("/home/bkarimov/daily_activ/daily_tasks")
    },
    @{
        LocalName     = "applications_portal"
        ServiceName   = "applications_portal"
        DefaultBranch = "main"
        GitHubUrl     = "https://github.com/bezhan2009/applications_portal.git"
        GitlabProject = "Bejan/activ_daily_applications_backend.git"
        RemotePaths   = @("/home/bkarimov/daily_activ/applications_portal")
    },
    @{
        LocalName     = "abs_service"
        ServiceName   = "abs_service"
        DefaultBranch = "main"
        GitHubUrl     = "https://github.com/bezhan2009/abs_service.git"
        GitlabProject = "Bejan/activ_daily_abs_backend.git"
        RemotePaths   = @("/home/bkarimov/daily_activ/abs_service")
    }
)

$ServerUser = "bkarimov"
$ServerIp = "10.65.10.20"
$ServerPort = 42587
$ServerProjectDir = "/home/bkarimov/daily_activ"
$GitLabHost = "gl.abank.tj.tajikistan.tj"
$DefaultGitLabUsername = "bkarimov"
$GitLabTokenFile = Join-Path $env:USERPROFILE ".deploy_gitlab_token"
$PasswordFile = Join-Path $env:USERPROFILE ".deploy_passwd"
$StateFileName = ".deploy_state.json"

function Resolve-WorkspaceRoot {
    $scriptDirectory = Split-Path -Parent $MyInvocation.ScriptName
    if ([string]::IsNullOrWhiteSpace($scriptDirectory)) {
        $scriptDirectory = (Get-Location).Path
    }

    $candidates = @(
        $scriptDirectory,
        (Split-Path -Parent $scriptDirectory),
        (Get-Location).Path
    ) | Select-Object -Unique

    foreach ($candidate in $candidates) {
        if ([string]::IsNullOrWhiteSpace($candidate)) {
            continue
        }
        if ((Test-Path -LiteralPath (Join-Path $candidate "premies_portal_front")) -or
            (Test-Path -LiteralPath (Join-Path $candidate "premies_portal"))) {
            return $candidate
        }
    }

    throw "Activ Daily workspace was not found. Run the script from the activ_daily directory."
}

function Convert-SecureStringToPlainText {
    param([Security.SecureString]$SecureValue)

    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function Get-EncryptedSecret {
    param(
        [string]$Path,
        [string]$Prompt,
        [string]$EnvironmentValue,
        [switch]$DoNotPrompt
    )

    if (-not [string]::IsNullOrWhiteSpace($EnvironmentValue)) {
        return $EnvironmentValue.Trim()
    }

    if (Test-Path -LiteralPath $Path) {
        try {
            $encryptedValue = (Get-Content -Raw -LiteralPath $Path).Trim() | ConvertTo-SecureString
            return Convert-SecureStringToPlainText $encryptedValue
        } catch {
            Write-Host "[WARN] Saved secret '$Path' cannot be read." -ForegroundColor Yellow
        }
    }

    if ($DoNotPrompt) {
        return ""
    }

    $secureValue = Read-Host $Prompt -AsSecureString
    $plainValue = Convert-SecureStringToPlainText $secureValue
    if (-not [string]::IsNullOrWhiteSpace($plainValue)) {
        $secureValue | ConvertFrom-SecureString | Set-Content -LiteralPath $Path
    }
    return $plainValue
}

function Get-StringSha {
    param([object[]]$Output)

    if ($null -eq $Output) {
        return ""
    }
    return (($Output | Select-Object -First 1) -as [string]).Trim()
}

function Get-GitLabBranchSha {
    param(
        [string]$RepositoryPath,
        [string]$RepositoryUrl,
        [string]$Branch,
        [string]$AuthHeader
    )

    $result = @(& git -C $RepositoryPath -c credential.helper= -c "http.extraHeader=Authorization: Basic $AuthHeader" ls-remote $RepositoryUrl "refs/heads/$Branch" 2>$null)
    if ($LASTEXITCODE -ne 0 -or $result.Count -eq 0) {
        return ""
    }

    $remoteSha = (($result[0] -split "\s+")[0]).Trim()
    $trackingRef = "refs/remotes/gitlab/$Branch"
    $fetchRefspec = "+refs/heads/${Branch}:$trackingRef"
    & git -C $RepositoryPath -c credential.helper= -c "http.extraHeader=Authorization: Basic $AuthHeader" fetch --no-tags $RepositoryUrl $fetchRefspec 2>$null
    if ($LASTEXITCODE -ne 0) {
        return ""
    }

    $fetchedSha = Get-StringSha @(& git -C $RepositoryPath rev-parse $trackingRef 2>$null)
    if ([string]::IsNullOrWhiteSpace($fetchedSha)) {
        return $remoteSha
    }
    return $fetchedSha
}

function ConvertTo-BashLiteral {
    param([string]$Value)

    if ($Value.Contains("'")) {
        throw "A deployment value contains an unsupported single quote."
    }
    return "'$Value'"
}

function Add-RemoteDirectorySelection {
    param(
        [System.Collections.Generic.List[string]]$Lines,
        [string[]]$Paths,
        [string]$ProjectName,
        [string]$RepositoryUrl,
        [string]$Branch,
        [string]$AuthHeader
    )

    for ($index = 0; $index -lt $Paths.Count; $index++) {
        $path = $Paths[$index]
        $gitDirectory = ConvertTo-BashLiteral "$path/.git"
        $quotedPath = ConvertTo-BashLiteral $path
        if ($index -eq 0) {
            $Lines.Add("if [ -d $gitDirectory ]; then")
        } else {
            $Lines.Add("elif [ -d $gitDirectory ]; then")
        }
        $Lines.Add("  cd $quotedPath")
    }
    $Lines.Add("else")
    $primaryPath = $Paths[0]
    $parentPath = $primaryPath.Substring(0, $primaryPath.LastIndexOf('/'))
    $quotedPrimaryPath = ConvertTo-BashLiteral $primaryPath
    $quotedParentPath = ConvertTo-BashLiteral $parentPath
    $quotedRepositoryUrl = ConvertTo-BashLiteral $RepositoryUrl
    $quotedBranch = ConvertTo-BashLiteral $Branch
    $quotedHeader = ConvertTo-BashLiteral "http.extraHeader=Authorization: Basic $AuthHeader"
    $Lines.Add("  echo $(ConvertTo-BashLiteral "[CLONE] Server directory for $ProjectName is missing; cloning it.")")
    $Lines.Add("  mkdir -p $quotedParentPath")
    $Lines.Add("  git -c credential.helper= -c $quotedHeader clone --branch $quotedBranch --single-branch $quotedRepositoryUrl $quotedPrimaryPath")
    $Lines.Add("  cd $quotedPrimaryPath")
    $Lines.Add("fi")
}

function Invoke-AuthenticatedGitLabClone {
    param(
        [string]$RepositoryUrl,
        [string]$Branch,
        [string]$Destination,
        [string]$AuthHeader
    )

    & git -c credential.helper= -c "http.extraHeader=Authorization: Basic $AuthHeader" clone --branch $Branch --single-branch $RepositoryUrl $Destination | Out-Host
    $cloneExitCode = $LASTEXITCODE
    return ($cloneExitCode -eq 0)
}

function Remove-FailedCloneDirectory {
    param(
        [string]$Path,
        [string]$WorkspaceRoot
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    $resolvedWorkspace = [System.IO.Path]::GetFullPath($WorkspaceRoot).TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
    $resolvedPath = [System.IO.Path]::GetFullPath($Path)
    if (-not $resolvedPath.StartsWith($resolvedWorkspace, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to remove clone directory outside the Activ Daily workspace: $resolvedPath"
    }

    Remove-Item -LiteralPath $resolvedPath -Recurse -Force
}

function Read-DeployState {
    param([string]$Path)

    $state = @{}
    if (-not (Test-Path -LiteralPath $Path)) {
        return $state
    }

    try {
        $json = Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json
        foreach ($property in $json.PSObject.Properties) {
            $state[$property.Name] = [string]$property.Value
        }
    } catch {
        Write-Host "[WARN] Deploy state is invalid and will be recreated." -ForegroundColor Yellow
    }
    return $state
}

function Save-DeployState {
    param(
        [string]$Path,
        [hashtable]$State
    )

    $json = $State | ConvertTo-Json
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $json + [Environment]::NewLine, $utf8NoBom)
}

function Invoke-SSHScript {
    param(
        [string]$Script,
        [string]$Password
    )

    $script:LastSshExitCode = 1
    $tempFile = [System.IO.Path]::GetTempFileName()
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($tempFile, ($Script -replace "`r", "") + "`n", $utf8NoBom)

    try {
        $plinkCommand = Get-Command plink -ErrorAction SilentlyContinue
        $localPlink = Join-Path $env:USERPROFILE "plink.exe"
        if ($plinkCommand) {
            $plinkExecutable = $plinkCommand.Source
        } elseif (Test-Path -LiteralPath $localPlink) {
            $plinkExecutable = $localPlink
        } else {
            throw "plink.exe was not found. Install PuTTY Link or place plink.exe in $env:USERPROFILE."
        }

        "y" | & $plinkExecutable -ssh -P $ServerPort -pw $Password -m $tempFile "$ServerUser@$ServerIp"
        $script:LastSshExitCode = $LASTEXITCODE
    } finally {
        Remove-Item -LiteralPath $tempFile -Force -ErrorAction SilentlyContinue
    }
}

function Send-DeployNotification {
    param(
        [bool]$Success,
        [string[]]$ServiceNames
    )

    $botToken = $env:TELEGRAM_BOT_TOKEN
    if ([string]::IsNullOrWhiteSpace($botToken)) {
        Write-Host "[TELEGRAM] TELEGRAM_BOT_TOKEN is not configured; notification skipped." -ForegroundColor Gray
        return
    }

    $chatIdsValue = $env:TELEGRAM_CHAT_IDS
    if ([string]::IsNullOrWhiteSpace($chatIdsValue)) {
        $chatIdsValue = "8144443377,913005799,6364646491"
    }
    $chatIds = $chatIdsValue.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
    $statusText = if ($Success) { "successful" } else { "failed" }
    $statusIcon = if ($Success) { [char]0x2705 } else { [char]0x274C }
    $serviceText = $ServiceNames -join ", "
    $time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $message = "$statusIcon Deploy of <b>$serviceText</b> is $statusText`n<b>Time:</b> $time"
    $telegramUrl = "https://api.telegram.org/bot$botToken/sendMessage"

    foreach ($chatId in $chatIds) {
        try {
            $body = @{ chat_id = $chatId; parse_mode = "HTML"; text = $message } | ConvertTo-Json -Compress
            Invoke-RestMethod -Uri $telegramUrl -Method Post -Body ([Text.Encoding]::UTF8.GetBytes($body)) -ContentType "application/json; charset=utf-8" -TimeoutSec 5 -ErrorAction Stop | Out-Null
        } catch {
            Write-Host "[TELEGRAM] Failed to notify ${chatId}: $($_.Exception.Message)" -ForegroundColor Yellow
        }
    }
}

$WorkspaceRoot = Resolve-WorkspaceRoot
$StateFile = Join-Path $WorkspaceRoot $StateFileName
$DeployState = Read-DeployState -Path $StateFile

# Keep the controller itself current before scanning the other repositories.
# This is relevant because PowerShell continues executing the already parsed
# script even when git pull replaces deploy.ps1 on disk.
$controllerPath = [System.IO.Path]::GetFullPath($MyInvocation.MyCommand.Path)
$frontendRepositoryPath = [System.IO.Path]::GetFullPath((Join-Path $WorkspaceRoot "premies_portal_front"))
$frontendRepositoryPrefix = $frontendRepositoryPath.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
if ($controllerPath.StartsWith($frontendRepositoryPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
    $controllerStatus = @(& git -C $frontendRepositoryPath status --porcelain 2>$null)
    $controllerBranch = Get-StringSha @(& git -C $frontendRepositoryPath rev-parse --abbrev-ref HEAD 2>$null)
    if ($controllerStatus.Count -eq 0 -and $controllerBranch -eq "master") {
        $controllerRevisionBefore = Get-StringSha @(& git -C $frontendRepositoryPath rev-parse HEAD 2>$null)
        & git -C $frontendRepositoryPath fetch origin master
        if ($LASTEXITCODE -eq 0) {
            $controllerOriginRevision = Get-StringSha @(& git -C $frontendRepositoryPath rev-parse refs/remotes/origin/master 2>$null)
            $controllerMergeBase = Get-StringSha @(& git -C $frontendRepositoryPath merge-base HEAD refs/remotes/origin/master 2>$null)
            if ($controllerRevisionBefore -eq $controllerMergeBase -and $controllerRevisionBefore -ne $controllerOriginRevision) {
                & git -C $frontendRepositoryPath merge --ff-only refs/remotes/origin/master
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "[SELF-UPDATE] Deployment controller was updated; restarting..." -ForegroundColor Yellow
                    $powerShellExecutable = (Get-Process -Id $PID).Path
                    $restartArguments = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $controllerPath)
                    if ($Force) {
                        $restartArguments += "-Force"
                    }
                    if (-not [string]::IsNullOrWhiteSpace($Services)) {
                        $restartArguments += @("-Services", $Services)
                    }
                    if ($DryRun) {
                        $restartArguments += "-DryRun"
                    }
                    & $powerShellExecutable @restartArguments
                    exit $LASTEXITCODE
                }
            }
        }
    }
}

$GitLabUsername = $env:GITLAB_USERNAME
if ([string]::IsNullOrWhiteSpace($GitLabUsername)) {
    $GitLabUsername = $env:GITLAB_USER
}
if ([string]::IsNullOrWhiteSpace($GitLabUsername)) {
    $GitLabUsername = $DefaultGitLabUsername
}
$GitLabToken = Get-EncryptedSecret -Path $GitLabTokenFile -Prompt "GitLab token for $GitLabUsername@$GitLabHost" -EnvironmentValue $env:GITLAB_TOKEN
if ([string]::IsNullOrWhiteSpace($GitLabToken)) {
    throw "GitLab token is required. Set GITLAB_TOKEN or save it in $GitLabTokenFile."
}
$gitLabCredential = [string]::Concat($GitLabUsername, ":", $GitLabToken)
$GitLabAuthHeader = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($gitLabCredential))

$TargetServices = @()
if (-not [string]::IsNullOrWhiteSpace($Services)) {
    $TargetServices = $Services.Split(",") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
}

Write-Host "[SCAN] Workspace: $WorkspaceRoot" -ForegroundColor Cyan
$Candidates = @()
$FoundTargetServices = @()
$DiscoveryErrors = @()

foreach ($projectDefinition in $Projects) {
    if ($TargetServices.Count -gt 0 -and $TargetServices -notcontains $projectDefinition.ServiceName) {
        continue
    }
    if ($TargetServices -contains $projectDefinition.ServiceName) {
        $FoundTargetServices += $projectDefinition.ServiceName
    }

    $localPath = Join-Path $WorkspaceRoot $projectDefinition.LocalName
    if (-not (Test-Path -LiteralPath $localPath)) {
        $gitLabCloneUrl = "https://$GitLabHost/$($projectDefinition.GitlabProject)"
        Write-Host "[CLONE] $($projectDefinition.LocalName) is missing; trying GitHub origin/$($projectDefinition.DefaultBranch)..." -ForegroundColor Yellow
        & git clone --branch $projectDefinition.DefaultBranch --single-branch $projectDefinition.GitHubUrl $localPath
        $cloneSucceeded = ($LASTEXITCODE -eq 0)
        if (-not $cloneSucceeded) {
            Remove-FailedCloneDirectory -Path $localPath -WorkspaceRoot $WorkspaceRoot
            Write-Host "[CLONE] GitHub is unavailable for $($projectDefinition.LocalName); cloning the GitLab mirror..." -ForegroundColor Yellow
            $cloneSucceeded = Invoke-AuthenticatedGitLabClone -RepositoryUrl $gitLabCloneUrl -Branch $projectDefinition.DefaultBranch -Destination $localPath -AuthHeader $GitLabAuthHeader
        }
        if (-not $cloneSucceeded) {
            Remove-FailedCloneDirectory -Path $localPath -WorkspaceRoot $WorkspaceRoot
            $message = "Cannot clone $($projectDefinition.LocalName) from GitHub or GitLab."
            Write-Host "[ERROR] $message" -ForegroundColor Red
            $DiscoveryErrors += $message
            continue
        }
        Write-Host "[CLONE] $($projectDefinition.LocalName) was created in $localPath." -ForegroundColor Green
    }
    if (-not (Test-Path -LiteralPath (Join-Path $localPath ".git"))) {
        $message = "$localPath exists but is not a Git repository."
        Write-Host "[ERROR] $message" -ForegroundColor Red
        $DiscoveryErrors += $message
        continue
    }

    $project = $projectDefinition.Clone()
    $project.LocalPath = $localPath
    $project.Branch = $project.DefaultBranch
    $project.GitLabUrl = "https://$GitLabHost/$($project.GitlabProject)"
    $project.GitLabAuthHeader = $GitLabAuthHeader

    $remoteNames = @(& git -C $localPath remote 2>$null)
    if ($remoteNames -contains "gitlab") {
        & git -C $localPath remote set-url gitlab $project.GitLabUrl
    } else {
        & git -C $localPath remote add gitlab $project.GitLabUrl
    }

    $originUrl = Get-StringSha @(& git -C $localPath remote get-url origin 2>$null)
    $originIsGitLab = $originUrl -like "*$GitLabHost*"
    Write-Host "[$($project.LocalName)] Fetching origin/$($project.Branch)..." -ForegroundColor Gray
    if ($originIsGitLab) {
        & git -C $localPath -c credential.helper= -c "http.extraHeader=Authorization: Basic $GitLabAuthHeader" fetch origin $project.Branch
    } else {
        & git -C $localPath fetch origin $project.Branch
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[WARN] GitHub origin is unavailable for $($project.LocalName); using the GitLab mirror as the deployment source." -ForegroundColor Yellow
        $fallbackRefspec = "+refs/heads/$($project.Branch):refs/remotes/origin/$($project.Branch)"
        & git -C $localPath -c credential.helper= -c "http.extraHeader=Authorization: Basic $GitLabAuthHeader" fetch --no-tags $project.GitLabUrl $fallbackRefspec
        if ($LASTEXITCODE -ne 0) {
            $message = "Cannot fetch $($project.LocalName) from GitHub or GitLab."
            Write-Host "[ERROR] $message" -ForegroundColor Red
            $DiscoveryErrors += $message
            continue
        }
    }

    $originSha = Get-StringSha @(& git -C $localPath rev-parse "refs/remotes/origin/$($project.Branch)" 2>$null)
    if ([string]::IsNullOrWhiteSpace($originSha)) {
        $message = "origin/$($project.Branch) was not found for $($project.LocalName)."
        Write-Host "[ERROR] $message" -ForegroundColor Red
        $DiscoveryErrors += $message
        continue
    }
    $project.OriginSha = $originSha
    $project.OriginTree = Get-StringSha @(& git -C $localPath rev-parse "$originSha`^{tree}" 2>$null)

    $workingTreeChanges = @(& git -C $localPath status --porcelain 2>$null)
    $localSha = Get-StringSha @(& git -C $localPath rev-parse HEAD 2>$null)
    $mergeBase = Get-StringSha @(& git -C $localPath merge-base HEAD "refs/remotes/origin/$($project.Branch)" 2>$null)
    $currentBranch = Get-StringSha @(& git -C $localPath rev-parse --abbrev-ref HEAD 2>$null)

    if ($workingTreeChanges.Count -eq 0 -and $currentBranch -eq $project.Branch -and $localSha -eq $mergeBase -and $localSha -ne $originSha) {
        & git -C $localPath merge --ff-only "refs/remotes/origin/$($project.Branch)"
        if ($LASTEXITCODE -eq 0) {
            $localSha = $originSha
        }
    } elseif ($localSha -ne $originSha) {
        Write-Host "[WARN] Local checkout differs from origin and was left unchanged. Deployment will use origin/$($project.Branch)." -ForegroundColor Yellow
    }
    if ($workingTreeChanges.Count -gt 0) {
        Write-Host "[WARN] Uncommitted local files are ignored by deployment." -ForegroundColor Yellow
    }

    $gitLabSha = Get-GitLabBranchSha -RepositoryPath $localPath -RepositoryUrl $project.GitLabUrl -Branch $project.Branch -AuthHeader $GitLabAuthHeader
    $project.GitLabSha = $gitLabSha
    $project.GitLabTree = ""
    if (-not [string]::IsNullOrWhiteSpace($gitLabSha)) {
        $project.GitLabTree = Get-StringSha @(& git -C $localPath rev-parse "$gitLabSha`^{tree}" 2>$null)
    }

    $lastDeployedSha = ""
    if ($DeployState.ContainsKey($project.ServiceName)) {
        $lastDeployedSha = $DeployState[$project.ServiceName]
    }

    $reasons = @()
    if ($Force) {
        $reasons += "forced"
    }
    if ($TargetServices.Count -eq 0) {
        $reasons += "default full deployment"
    } else {
        $reasons += "explicitly selected"
    }
    if ($project.GitLabTree -ne $project.OriginTree) {
        $reasons += "GitLab content differs from GitHub"
    }
    if ($lastDeployedSha -ne $originSha) {
        $reasons += "server deployment state differs"
    }

    if ($reasons.Count -gt 0) {
        Write-Host "[CHANGE] $($project.ServiceName): $($reasons -join ', ')" -ForegroundColor Cyan
        $Candidates += $project
    } else {
        Write-Host "[CLEAN] $($project.ServiceName) is already deployed at $($originSha.Substring(0, 7))." -ForegroundColor Green
    }
}

if ($TargetServices.Count -gt 0) {
    foreach ($target in $TargetServices) {
        if ($FoundTargetServices -notcontains $target) {
            $message = "Unknown service requested: $target"
            Write-Host "[ERROR] $message" -ForegroundColor Red
            $DiscoveryErrors += $message
        }
    }
}

if ($DiscoveryErrors.Count -gt 0) {
    throw "Deployment scan failed: $($DiscoveryErrors -join ' ')"
}

if ($Candidates.Count -eq 0) {
    Write-Host "[OK] No deployment is required." -ForegroundColor Green
    exit 0
}

if ($DryRun) {
    Write-Host "[DRY RUN] The following services would be mirrored and deployed:" -ForegroundColor Yellow
    $Candidates | ForEach-Object { Write-Host "  - $($_.ServiceName) @ $($_.OriginSha)" }
    exit 0
}

Write-Host "[MIRROR] Synchronizing canonical GitHub commits to GitLab..." -ForegroundColor Yellow
$ReadyProjects = @()
$MirrorErrors = @()
foreach ($project in $Candidates) {
    $mirrorSucceeded = $true
    $refspec = "refs/remotes/origin/$($project.Branch):refs/heads/$($project.Branch)"
    if ([string]::IsNullOrWhiteSpace($project.GitLabSha)) {
        & git -C $project.LocalPath -c credential.helper= -c "http.extraHeader=Authorization: Basic $GitLabAuthHeader" push $project.GitLabUrl $refspec
        $mirrorSucceeded = ($LASTEXITCODE -eq 0)
        $project.GitLabDeploySha = $project.OriginSha
    } elseif ($project.GitLabTree -eq $project.OriginTree) {
        Write-Host "[MIRROR] $($project.LocalName): GitLab already has the canonical GitHub content." -ForegroundColor Gray
        $project.GitLabDeploySha = $project.GitLabSha
    } else {
        & git -C $project.LocalPath merge-base --is-ancestor $project.GitLabSha $project.OriginSha 2>$null
        $canFastForwardGitLab = ($LASTEXITCODE -eq 0)
        if ($canFastForwardGitLab) {
            & git -C $project.LocalPath -c credential.helper= -c "http.extraHeader=Authorization: Basic $GitLabAuthHeader" push $project.GitLabUrl $refspec
            $mirrorSucceeded = ($LASTEXITCODE -eq 0)
            $project.GitLabDeploySha = $project.OriginSha
        } else {
            # Protected GitLab branches reject force pushes. Create a regular
            # merge commit whose tree is exactly the canonical GitHub tree and
            # whose second parent preserves the existing GitLab history.
            $mergeMessage = "chore(deploy): synchronize $($project.LocalName) from GitHub $($project.OriginSha.Substring(0, 12))"
            $mirrorCommit = Get-StringSha @(& git -C $project.LocalPath -c user.name="Activ Daily Deploy" -c user.email="deploy@activ.local" commit-tree $project.OriginTree -p $project.OriginSha -p $project.GitLabSha -m $mergeMessage)
            if ([string]::IsNullOrWhiteSpace($mirrorCommit)) {
                $message = "Could not create a protected-branch synchronization commit for $($project.LocalName)."
                Write-Host "[ERROR] $message" -ForegroundColor Red
                $MirrorErrors += $message
                continue
            }
            $mergeRefspec = "${mirrorCommit}:refs/heads/$($project.Branch)"
            & git -C $project.LocalPath -c credential.helper= -c "http.extraHeader=Authorization: Basic $GitLabAuthHeader" push $project.GitLabUrl $mergeRefspec
            $mirrorSucceeded = ($LASTEXITCODE -eq 0)
            $project.GitLabDeploySha = $mirrorCommit
        }
    }
    if (-not $mirrorSucceeded) {
        $message = "GitLab mirror failed for $($project.LocalName)."
        Write-Host "[ERROR] $message" -ForegroundColor Red
        $MirrorErrors += $message
        continue
    }
    $ReadyProjects += $project
}

if ($MirrorErrors.Count -gt 0 -or $ReadyProjects.Count -ne $Candidates.Count) {
    throw "GitLab synchronization failed. Nothing was deployed: $($MirrorErrors -join ' ')"
}

$bashLines = New-Object 'System.Collections.Generic.List[string]'
$bashLines.Add("set -eu")
$bashLines.Add("echo '[DEPLOY] Updating application repositories...'")

foreach ($project in $ReadyProjects) {
    $bashLines.Add("echo $(ConvertTo-BashLiteral "[DEPLOY] $($project.LocalName) @ $($project.OriginSha)")")
    Add-RemoteDirectorySelection -Lines $bashLines -Paths $project.RemotePaths -ProjectName $project.LocalName -RepositoryUrl $project.GitLabUrl -Branch $project.Branch -AuthHeader $project.GitLabAuthHeader
    # Back up only tracked changes. Runtime files such as TLS private keys,
    # .env files and logs must remain untouched on the server and may not be
    # readable by the deployment user.
    $bashLines.Add('if [ -n "$(git status --porcelain --untracked-files=no)" ]; then')
    $stashMessage = ConvertTo-BashLiteral "auto-deploy backup for $($project.LocalName)"
    $bashLines.Add("  echo $(ConvertTo-BashLiteral "[BACKUP] Server files in $($project.LocalName) are modified; saving them before deployment.")")
    $bashLines.Add("  if ! git stash push -m $stashMessage; then")
    $bashLines.Add("    echo $(ConvertTo-BashLiteral "[ERROR] Could not back up server changes in $($project.LocalName); deployment stopped without overwriting them.")")
    $bashLines.Add("    exit 22")
    $bashLines.Add("  fi")
    $bashLines.Add('  echo "[BACKUP] Saved as stash $(git rev-parse --short refs/stash)."')
    $bashLines.Add("fi")
    $quotedHeader = ConvertTo-BashLiteral "http.extraHeader=Authorization: Basic $($project.GitLabAuthHeader)"
    $quotedUrl = ConvertTo-BashLiteral $project.GitLabUrl
    $quotedBranch = ConvertTo-BashLiteral $project.Branch
    $gitLabTrackingRef = "refs/remotes/gitlab/$($project.Branch)"
    $quotedGitLabTrackingRef = ConvertTo-BashLiteral $gitLabTrackingRef
    $quotedFetchRefspec = ConvertTo-BashLiteral "+refs/heads/$($project.Branch):$gitLabTrackingRef"
    $bashLines.Add("if git remote get-url gitlab >/dev/null 2>&1; then")
    $bashLines.Add("  git remote set-url gitlab $quotedUrl")
    $bashLines.Add("else")
    $bashLines.Add("  git remote add gitlab $quotedUrl")
    $bashLines.Add("fi")
    $bashLines.Add('origin_url=""')
    $bashLines.Add("if git remote get-url origin >/dev/null 2>&1; then")
    $bashLines.Add('  origin_url="$(git remote get-url origin)"')
    $bashLines.Add("fi")
    $bashLines.Add('case "$origin_url" in')
    $bashLines.Add("  *gl.abank.tj*) git remote set-url origin $quotedUrl ;;")
    $bashLines.Add("esac")
    $bashLines.Add("git -c credential.helper= -c $quotedHeader fetch --no-tags $quotedUrl $quotedFetchRefspec")
    $bashLines.Add('old_sha="$(git rev-parse HEAD)"')
    $bashLines.Add("new_sha=`$(git rev-parse $quotedGitLabTrackingRef)")
    $bashLines.Add('if [ "$old_sha" != "$new_sha" ]; then')
    $bashLines.Add(('  backup_ref="deploy-backup/{0}-$(date +%Y%m%d%H%M%S)"' -f $project.Branch))
    $bashLines.Add('  if ! git branch -f "$backup_ref" "$old_sha"; then true; fi')
    $bashLines.Add("fi")
    $bashLines.Add('git checkout -B ' + $quotedBranch + ' "$new_sha"')
    $bashLines.Add("git branch --set-upstream-to=gitlab/$($project.Branch) $quotedBranch >/dev/null 2>&1 || true")
}

$quotedProjectDir = ConvertTo-BashLiteral $ServerProjectDir
$quotedServices = @($ReadyProjects | ForEach-Object { ConvertTo-BashLiteral $_.ServiceName })
$serviceArguments = $quotedServices -join " "
$bashLines.Add("cd $quotedProjectDir")
$bashLines.Add("if docker compose version >/dev/null 2>&1; then")
$bashLines.Add("  compose_command='docker compose'")
$bashLines.Add("else")
$bashLines.Add("  compose_command='docker-compose'")
$bashLines.Add("fi")
$bashLines.Add("echo '[CHECK] Validating the configured PostgreSQL database...'")
$bashLines.Add("if [ ! -f .env ]; then echo '[ERROR] /home/bkarimov/daily_activ/.env was not found.'; exit 23; fi")
$bashLines.Add('configured_db="$(awk -F= ''/^[[:space:]]*POSTGRES_DB[[:space:]]*=/{sub(/^[^=]*=/,""); gsub(/\r/,""); print}'' .env | tail -n 1)"')
$bashLines.Add('database_list="$($compose_command exec -T postgres sh -c ''psql -U "$POSTGRES_USER" -d postgres -Atc "SELECT datname FROM pg_database WHERE datistemplate = false AND datname <> current_database() ORDER BY datname;"'')"')
$bashLines.Add('selected_db="$configured_db"')
$bashLines.Add('if [ -z "$selected_db" ] || ! printf ''%s\n'' "$database_list" | grep -Fxq "$selected_db"; then')
$bashLines.Add("  if printf '%s\n' " + '"$database_list"' + " | grep -Fxq 'premies_portal_db'; then")
$bashLines.Add("    selected_db='premies_portal_db'")
$bashLines.Add('    echo "[DATABASE] Configured database ''$configured_db'' does not exist; using existing ''$selected_db''."')
$bashLines.Add("  else")
$bashLines.Add('    echo "[ERROR] Configured PostgreSQL database ''$configured_db'' does not exist."')
$bashLines.Add('    echo "[ERROR] Available application databases: $(printf ''%s '' $database_list)"')
$bashLines.Add("    echo '[ERROR] Deployment stopped to avoid creating an empty database over production data.'")
$bashLines.Add("    exit 23")
$bashLines.Add("  fi")
$bashLines.Add("fi")
$bashLines.Add('compose_file_value=''docker-compose.yml:.deploy-compose.override.yml''')
$bashLines.Add('if [ "$selected_db" != "$configured_db" ] || ! grep -Eq ''^[[:space:]]*COMPOSE_FILE[[:space:]]*='' .env; then')
$bashLines.Add('  env_backup=".env.deploy-backup.$(date +%Y%m%d%H%M%S)"')
$bashLines.Add('  cp -p .env "$env_backup"')
$bashLines.Add('  echo "[BACKUP] Environment saved to $env_backup."')
$bashLines.Add("fi")
$bashLines.Add('if grep -Eq ''^[[:space:]]*POSTGRES_DB[[:space:]]*='' .env; then')
$bashLines.Add('  sed -i "s/^[[:space:]]*POSTGRES_DB[[:space:]]*=.*/POSTGRES_DB=$selected_db/" .env')
$bashLines.Add("else")
$bashLines.Add('  printf ''\nPOSTGRES_DB=%s\n'' "$selected_db" >> .env')
$bashLines.Add("fi")
$bashLines.Add('if grep -Eq ''^[[:space:]]*COMPOSE_FILE[[:space:]]*='' .env; then')
$bashLines.Add('  sed -i "s|^[[:space:]]*COMPOSE_FILE[[:space:]]*=.*|COMPOSE_FILE=$compose_file_value|" .env')
$bashLines.Add("else")
$bashLines.Add('  printf ''COMPOSE_FILE=%s\n'' "$compose_file_value" >> .env')
$bashLines.Add("fi")
$bashLines.Add('export POSTGRES_DB="$selected_db"')
$bashLines.Add('cat > .deploy-compose.override.yml <<''DEPLOY_COMPOSE_OVERRIDE''')
$bashLines.Add('services:')
foreach ($databaseService in @("go-backend", "daily_tasks", "applications_portal", "python-backend", "abs_service")) {
    $bashLines.Add("  ${databaseService}:")
    $bashLines.Add('    environment:')
    $bashLines.Add('      DB_HOST: postgres')
    $bashLines.Add('      DB_PORT: "5432"')
    $bashLines.Add('      DB_USER: ${POSTGRES_USER}')
    $bashLines.Add('      DB_PASSWORD: ${POSTGRES_PASSWORD}')
    $bashLines.Add('      DB_NAME: ${POSTGRES_DB}')
}
$bashLines.Add('DEPLOY_COMPOSE_OVERRIDE')
$bashLines.Add('echo "[DATABASE] Services will use PostgreSQL database ''$selected_db''."')
$databaseConfigCompatibility = @()
if ($ReadyProjects.ServiceName -contains "daily_tasks") {
    $databaseConfigCompatibility += @{
        Name = "daily_tasks"
        Path = "/home/bkarimov/daily_activ/daily_tasks/configs/docker/configs.json"
    }
}
if ($ReadyProjects.ServiceName -contains "abs_service") {
    $databaseConfigCompatibility += @{
        Name = "abs_service"
        Path = "/home/bkarimov/daily_activ/abs_service/configs/docker/configs.json"
    }
}
if ($databaseConfigCompatibility.Count -gt 0) {
    foreach ($compatibilityConfig in $databaseConfigCompatibility) {
        $variableName = $compatibilityConfig.Name
        $bashLines.Add("${variableName}_config=''")
        $bashLines.Add("${variableName}_config_backup=''")
    }
    $bashLines.Add('restore_deploy_database_configs() {')
    foreach ($compatibilityConfig in $databaseConfigCompatibility) {
        $variableName = $compatibilityConfig.Name
        $bashLines.Add(('  if [ -n "${0}_config_backup" ] && [ -f "${0}_config_backup" ]; then' -f $variableName))
        $bashLines.Add(('    cp -p "${0}_config_backup" "${0}_config"' -f $variableName))
        $bashLines.Add(('    rm -f "${0}_config_backup"' -f $variableName))
        $bashLines.Add('  fi')
    }
    $bashLines.Add('}')
    $bashLines.Add('trap restore_deploy_database_configs EXIT')
    foreach ($compatibilityConfig in $databaseConfigCompatibility) {
        $variableName = $compatibilityConfig.Name
        $quotedConfigPath = ConvertTo-BashLiteral $compatibilityConfig.Path
        $bashLines.Add("${variableName}_config=$quotedConfigPath")
        $bashLines.Add(('if [ ! -f "${0}_config" ]; then echo ''[ERROR] Docker database config for {0} was not found.''; exit 25; fi' -f $variableName))
        $bashLines.Add(('{0}_config_backup="$(mktemp)"' -f $variableName))
        $bashLines.Add(('cp -p "${0}_config" "${0}_config_backup"' -f $variableName))
        $bashLines.Add(('sed -i -E "s/(\"database\"[[:space:]]*:[[:space:]]*\")[^\"]*(\")/\1${{selected_db}}\2/" "${0}_config"' -f $variableName))
        $bashLines.Add(('if ! grep -Eq "\"database\"[[:space:]]*:[[:space:]]*\"${{selected_db}}\"" "${0}_config"; then echo ''[ERROR] Could not prepare Docker database config for {0}.''; exit 25; fi' -f $variableName))
    }
    $bashLines.Add("echo '[DATABASE] Docker build configs prepared; originals will be restored automatically.'")
}
$bashLines.Add("echo '[DEPLOY] Building changed services...'")
$bashLines.Add("if ! `$compose_command -f docker-compose.yml -f .deploy-compose.override.yml up --build -d --no-deps $serviceArguments; then")
$bashLines.Add("  echo '[ERROR] One or more services failed to start. Recent container logs:'")
$bashLines.Add("  `$compose_command -f docker-compose.yml -f .deploy-compose.override.yml ps $serviceArguments || true")
$bashLines.Add("  `$compose_command -f docker-compose.yml -f .deploy-compose.override.yml logs --tail 150 $serviceArguments || true")
$bashLines.Add("  exit 24")
$bashLines.Add("fi")
$bashLines.Add("sleep 5")
$bashLines.Add("`$compose_command -f docker-compose.yml -f .deploy-compose.override.yml ps $serviceArguments")
if ($databaseConfigCompatibility.Count -gt 0) {
    $bashLines.Add('restore_deploy_database_configs')
    $bashLines.Add('trap - EXIT')
}
$bashLines.Add("docker image prune -f")
$bashLines.Add("echo '[DEPLOY] Completed successfully.'")
$remoteScript = $bashLines -join "`n"

$serverPassword = Get-EncryptedSecret -Path $PasswordFile -Prompt "SSH password for $ServerUser@$ServerIp" -EnvironmentValue $env:DEPLOY_SSH_PASSWORD
if ([string]::IsNullOrWhiteSpace($serverPassword)) {
    throw "SSH password is required."
}

Write-Host "[DEPLOY] Connecting to ${ServerUser}@${ServerIp}:${ServerPort}..." -ForegroundColor Green
$script:LastSshExitCode = 1
try {
    Invoke-SSHScript -Script $remoteScript -Password $serverPassword
    $deploySucceeded = ($script:LastSshExitCode -eq 0)
} catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    $deploySucceeded = $false
}

$serviceNames = @($ReadyProjects | ForEach-Object { $_.ServiceName })
if ($deploySucceeded) {
    foreach ($project in $ReadyProjects) {
        $DeployState[$project.ServiceName] = $project.OriginSha
    }
    Save-DeployState -Path $StateFile -State $DeployState
    Write-Host "[OK] Deployment completed. State saved to $StateFile" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Deployment failed. State was not updated, so the next run will retry." -ForegroundColor Red
}

Send-DeployNotification -Success $deploySucceeded -ServiceNames $serviceNames
if (-not $deploySucceeded) {
    exit 1
}
