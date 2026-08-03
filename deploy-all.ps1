# General Activ Daily deployment controller.
# GitHub is the source of truth; GitLab is the bank-network deployment mirror.
# Run from the workspace root or directly from premies_portal_front:
#   powershell -ExecutionPolicy Bypass -File .\premies_portal_front\deploy-all.ps1

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
        GitlabProject = "Bejan/premies_portal.git"
        RemotePaths   = @("/home/bkarimov/daily_activ/go-backend", "/home/bkarimov/daily_activ/premies_portal")
    },
    @{
        LocalName     = "premies_automation"
        ServiceName   = "python-backend"
        DefaultBranch = "main"
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
        GitlabProject = "Bejan/daily_tasks.git"
        RemotePaths   = @("/home/bkarimov/daily_activ/daily_tasks")
    },
    @{
        LocalName     = "applications_portal"
        ServiceName   = "applications_portal"
        DefaultBranch = "main"
        GitlabProject = "Bejan/activ_daily_applications_backend.git"
        RemotePaths   = @("/home/bkarimov/daily_activ/applications_portal")
    },
    @{
        LocalName     = "deposits_portal"
        ServiceName   = "deposits_portal"
        DefaultBranch = "main"
        GitlabProject = "Bejan/deposits_portal.git"
        RemotePaths   = @("/home/bkarimov/daily_activ/deposits_portal")
    },
    @{
        LocalName     = "abs_service"
        ServiceName   = "abs_service"
        DefaultBranch = "main"
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
    return (($result[0] -split "\s+")[0]).Trim()
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
        [string]$ProjectName
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
    $Lines.Add("  echo $(ConvertTo-BashLiteral "[ERROR] Server directory for $ProjectName was not found.")")
    $Lines.Add("  exit 21")
    $Lines.Add("fi")
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

foreach ($projectDefinition in $Projects) {
    if ($TargetServices.Count -gt 0 -and $TargetServices -notcontains $projectDefinition.ServiceName) {
        continue
    }
    if ($TargetServices -contains $projectDefinition.ServiceName) {
        $FoundTargetServices += $projectDefinition.ServiceName
    }

    $localPath = Join-Path $WorkspaceRoot $projectDefinition.LocalName
    if (-not (Test-Path -LiteralPath $localPath)) {
        Write-Host "[WARN] $($projectDefinition.LocalName) is not present locally; skipped." -ForegroundColor Yellow
        continue
    }
    if (-not (Test-Path -LiteralPath (Join-Path $localPath ".git"))) {
        Write-Host "[WARN] $localPath is not a Git repository; skipped." -ForegroundColor Yellow
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

    Write-Host "[$($project.LocalName)] Fetching origin/$($project.Branch)..." -ForegroundColor Gray
    & git -C $localPath fetch origin $project.Branch
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Cannot fetch origin for $($project.LocalName); skipped." -ForegroundColor Red
        continue
    }

    $originSha = Get-StringSha @(& git -C $localPath rev-parse "refs/remotes/origin/$($project.Branch)" 2>$null)
    if ([string]::IsNullOrWhiteSpace($originSha)) {
        Write-Host "[ERROR] origin/$($project.Branch) was not found for $($project.LocalName); skipped." -ForegroundColor Red
        continue
    }
    $project.OriginSha = $originSha

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

    $lastDeployedSha = ""
    if ($DeployState.ContainsKey($project.ServiceName)) {
        $lastDeployedSha = $DeployState[$project.ServiceName]
    }

    $reasons = @()
    if ($Force) {
        $reasons += "forced"
    }
    if ($TargetServices.Count -gt 0) {
        $reasons += "explicitly selected"
    }
    if ($gitLabSha -ne $originSha) {
        $reasons += "GitLab mirror differs from GitHub"
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
            Write-Host "[WARN] Unknown service requested: $target" -ForegroundColor Yellow
        }
    }
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
foreach ($project in $Candidates) {
    $refspec = "refs/remotes/origin/$($project.Branch):refs/heads/$($project.Branch)"
    if ([string]::IsNullOrWhiteSpace($project.GitLabSha)) {
        & git -C $project.LocalPath -c credential.helper= -c "http.extraHeader=Authorization: Basic $GitLabAuthHeader" push $project.GitLabUrl $refspec
    } else {
        $lease = "--force-with-lease=refs/heads/$($project.Branch):$($project.GitLabSha)"
        & git -C $project.LocalPath -c credential.helper= -c "http.extraHeader=Authorization: Basic $GitLabAuthHeader" push $lease $project.GitLabUrl $refspec
    }
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] GitLab mirror failed for $($project.LocalName); service will not be deployed." -ForegroundColor Red
        continue
    }
    $ReadyProjects += $project
}

if ($ReadyProjects.Count -eq 0) {
    throw "No project was synchronized with GitLab. Deployment aborted."
}

$bashLines = New-Object 'System.Collections.Generic.List[string]'
$bashLines.Add("set -eu")
$bashLines.Add("echo '[DEPLOY] Updating application repositories...'")

foreach ($project in $ReadyProjects) {
    $bashLines.Add("echo $(ConvertTo-BashLiteral "[DEPLOY] $($project.LocalName) @ $($project.OriginSha)")")
    Add-RemoteDirectorySelection -Lines $bashLines -Paths $project.RemotePaths -ProjectName $project.LocalName
    $bashLines.Add('if [ -n "$(git status --porcelain --untracked-files=no)" ]; then')
    $bashLines.Add("  echo $(ConvertTo-BashLiteral "[ERROR] Tracked server files are modified in $($project.LocalName); deployment stopped.")")
    $bashLines.Add("  exit 22")
    $bashLines.Add("fi")
    $quotedHeader = ConvertTo-BashLiteral "http.extraHeader=Authorization: Basic $($project.GitLabAuthHeader)"
    $quotedUrl = ConvertTo-BashLiteral $project.GitLabUrl
    $quotedBranch = ConvertTo-BashLiteral $project.Branch
    $bashLines.Add("if git remote get-url gitlab >/dev/null 2>&1; then")
    $bashLines.Add("  git remote set-url gitlab $quotedUrl")
    $bashLines.Add("fi")
    $bashLines.Add('origin_url=""')
    $bashLines.Add("if git remote get-url origin >/dev/null 2>&1; then")
    $bashLines.Add('  origin_url="$(git remote get-url origin)"')
    $bashLines.Add("fi")
    $bashLines.Add('case "$origin_url" in')
    $bashLines.Add("  *gl.abank.tj*) git remote set-url origin $quotedUrl ;;")
    $bashLines.Add("esac")
    $bashLines.Add("git -c credential.helper= -c $quotedHeader fetch --no-tags $quotedUrl $quotedBranch")
    $bashLines.Add('old_sha="$(git rev-parse HEAD)"')
    $bashLines.Add('new_sha="$(git rev-parse FETCH_HEAD)"')
    $bashLines.Add('if [ "$old_sha" != "$new_sha" ]; then')
    $bashLines.Add(('  backup_ref="deploy-backup/{0}-$(date +%Y%m%d%H%M%S)"' -f $project.Branch))
    $bashLines.Add('  if ! git branch -f "$backup_ref" "$old_sha"; then true; fi')
    $bashLines.Add("fi")
    $bashLines.Add('git checkout -B ' + $quotedBranch + ' "$new_sha"')
}

$quotedProjectDir = ConvertTo-BashLiteral $ServerProjectDir
$quotedServices = @($ReadyProjects | ForEach-Object { ConvertTo-BashLiteral $_.ServiceName })
$serviceArguments = $quotedServices -join " "
$bashLines.Add("cd $quotedProjectDir")
$bashLines.Add("echo '[DEPLOY] Building changed services...'")
$bashLines.Add("if docker compose version >/dev/null 2>&1; then")
$bashLines.Add("  docker compose up --build -d --no-deps $serviceArguments")
$bashLines.Add("  sleep 5")
$bashLines.Add("  docker compose ps $serviceArguments")
$bashLines.Add("else")
$bashLines.Add("  docker-compose up --build -d --no-deps $serviceArguments")
$bashLines.Add("  sleep 5")
$bashLines.Add("  docker-compose ps $serviceArguments")
$bashLines.Add("fi")
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
