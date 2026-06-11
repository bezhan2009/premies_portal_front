# deploy.ps1
# On first run, it will request password and save it encrypted

# ===== SETTINGS =====
$GITLAB_BRANCH = "master"

# SSH Connection
$SERVER_USER = "bkarimov"
$SERVER_IP = "10.65.10.20"
$SERVER_PORT = "42587"

# Paths on Server
$PROJECT_DIR = "/home/bkarimov/daily_activ"
$SERVICE_DIR = "/home/bkarimov/daily_activ/premies_portal_front"
$CONTAINER_NAME = "frontend"

# Password Storage File
$PasswordFile = "$env:USERPROFILE\.deploy_passwd"

# ===== GET PASSWORD =====
function Get-ServerPassword {
    # Check if saved password exists
    if (Test-Path $PasswordFile) {
        try {
            $SecurePassword = Get-Content $PasswordFile | ConvertTo-SecureString
            $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
            )
            Write-Host "[OK] Using saved password" -ForegroundColor Green
            return $Password
        } catch {
            Write-Host "[WARN] Saved password is corrupted, requesting new one" -ForegroundColor Yellow
        }
    }
    
    # Request password
    $SecurePassword = Read-Host "SSH Password for $SERVER_USER@$SERVER_IP" -AsSecureString
    
    # Save password encrypted
    $SecurePassword | ConvertFrom-SecureString | Set-Content $PasswordFile
    Write-Host "[OK] Password saved encrypted to $PasswordFile" -ForegroundColor Green
    
    # Decrypt for use
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
    )
    return $Password
}
# ===== LOCAL GIT SYNC =====
Write-Host "[GIT] Pulling latest changes from origin ($GITLAB_BRANCH)..." -ForegroundColor Yellow
git -C "$PSScriptRoot" pull origin "$GITLAB_BRANCH"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Local git pull origin failed! Aborting deploy." -ForegroundColor Red
    exit 1
}

Write-Host "[GIT] Pushing changes to gitlab ($GITLAB_BRANCH)..." -ForegroundColor Yellow
git -C "$PSScriptRoot" push gitlab "$GITLAB_BRANCH"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Local git push gitlab failed! Aborting deploy." -ForegroundColor Red
    exit 1
}

# Get password
$PASSWORD = Get-ServerPassword

# ===== ESTABLISH SSH SESSION =====
Write-Host "[DEPLOY] Starting deploy to ${SERVER_USER}@${SERVER_IP}:${SERVER_PORT}" -ForegroundColor Green

# Create remote commands sequence for server (evaluated client-side via formatting operator)
$remoteScript = 'cd "{0}" && git pull gitlab "{1}" && cd "{2}" && docker-compose up --build -d --no-deps "{3}" && sleep 5 && docker-compose ps "{3}" && docker image prune -f' -f $SERVICE_DIR, $GITLAB_BRANCH, $PROJECT_DIR, $CONTAINER_NAME

# Function for connecting via SSH with password and streaming output in real-time
function Invoke-SSHWithPassword {
    param($Command)
    
    $cleanCommand = $Command -replace "`r", ""
    
    # Try using sshpass (if installed)
    $sshpassPath = Get-Command sshpass -ErrorAction SilentlyContinue
    if ($sshpassPath) {
        & sshpass -p $PASSWORD ssh -p $SERVER_PORT -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" $cleanCommand
        return
    }
    
    # Try using plink (if installed or downloaded)
    $localPlinkPath = "$env:USERPROFILE\plink.exe"
    $plinkPath = Get-Command plink -ErrorAction SilentlyContinue
    if (-not $plinkPath -and (Test-Path $localPlinkPath)) {
        $plinkPath = $localPlinkPath
    }
    
    if (-not $plinkPath) {
        Write-Host "[DEPLOY] plink.exe not found. Downloading PuTTY Link (plink.exe) to automate password entry..." -ForegroundColor Yellow
        try {
            $webClient = New-Object System.Net.WebClient
            $webClient.DownloadFile("https://the.earth.li/~sgtatham/putty/latest/w64/plink.exe", $localPlinkPath)
            $plinkPath = $localPlinkPath
            Write-Host "[DEPLOY] plink.exe successfully downloaded!" -ForegroundColor Green
        } catch {
            Write-Host "[ERROR] Failed to download plink.exe: $_" -ForegroundColor Red
        }
    }
    
    if ($plinkPath) {
        & echo y | & $plinkPath -ssh -P $SERVER_PORT -pw $PASSWORD "$SERVER_USER@$SERVER_IP" $cleanCommand
        return
    }
    
    # Fallback to interactive SSH
    Write-Host "[WARN] Using fallback interactive SSH (manual password entry needed)" -ForegroundColor Yellow
    ssh -p $SERVER_PORT "$SERVER_USER@$SERVER_IP" $cleanCommand
}

# Run deploy
try {
    Invoke-SSHWithPassword -Command $remoteScript
    $DEPLOY_SUCCESS = ($LASTEXITCODE -eq 0)
    
    if ($DEPLOY_SUCCESS) {
        Write-Host "[OK] Deploy successful!" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Deploy failed!" -ForegroundColor Red
    }
} catch {
    Write-Host "[ERROR] Error: $_" -ForegroundColor Red
    $DEPLOY_SUCCESS = $false
}

# Send Telegram notification
Write-Host "[Telegram] Sending notification..." -ForegroundColor Yellow

$time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
if ($DEPLOY_SUCCESS) {
    $message = "$([char]0x2705) Deploy of $CONTAINER_NAME is successful`n<b>Time:</b> $time"
} else {
    $message = "$([char]0x274C) Deploy of $CONTAINER_NAME is failed`n<b>Time:</b> $time"
}

$telegramUrl = "https://api.telegram.org/bot7701650916:AAG78Lu0rG7XTeD3Nw-mZoEkKfcyzJAjH8k/sendMessage"
$chatIds = @("8144443377", "913005799", "6364646491")

foreach ($chatId in $chatIds) {
    try {
        $body = @{
            chat_id    = $chatId
            parse_mode = "HTML"
            text       = $message
        }
        $jsonBody = $body | ConvertTo-Json -Compress
        # Force UTF-8 encoding for proper emojis and Cyrillic character handling
        $response = Invoke-RestMethod -Uri $telegramUrl -Method Post -Body ([System.Text.Encoding]::UTF8.GetBytes($jsonBody)) -ContentType "application/json; charset=utf-8" -TimeoutSec 5
        Write-Host "[Telegram] Message sent to $chatId" -ForegroundColor Green
    } catch {
        Write-Host "[Telegram] [ERROR] Failed to send message to ${chatId}: $_" -ForegroundColor Red
    }
}

Write-Host "[OK] Done!" -ForegroundColor Green