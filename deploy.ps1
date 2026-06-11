# deploy.ps1
# On first run, it will request password and save it encrypted

# ===== SETTINGS =====
$GITLAB_PRIVATE_TOKEN = "glpat-sa-a6Dzmy6pvrbW8Ju2e"  
$GITLAB_PROJECT_ID = "11"                     # Project ID
$GITLAB_SERVER = "http://gl.abank.tj.tajikistan.tj"
$GITLAB_BRANCH = "master" # for premies_portal_frontend it is master

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

# Get password
$PASSWORD = Get-ServerPassword

# ===== ESTABLISH SSH SESSION =====
Write-Host "[DEPLOY] Starting deploy to ${SERVER_USER}@${SERVER_IP}:${SERVER_PORT}" -ForegroundColor Green

# Create remote commands script for server
$remoteScript = @'
#!/bin/bash
set -e

echo "[GitLab] Testing GitLab connection..."
if ! curl -s --header "PRIVATE-TOKEN: '"$GITLAB_PRIVATE_TOKEN"'" \
  "'"$GITLAB_SERVER"'/api/v4/projects/'"$GITLAB_PROJECT_ID"'" | grep -q "id"; then
    echo "[ERROR] Cannot connect to GitLab!"
    exit 1
fi
echo "[OK] GitLab connection OK"

echo "[GitLab] Downloading repository archive..."
curl -s --header "PRIVATE-TOKEN: '"$GITLAB_PRIVATE_TOKEN"'" \
  "'"$GITLAB_SERVER"'/api/v4/projects/'"$GITLAB_PROJECT_ID"'/repository/archive.tar.gz?sha='"$GITLAB_BRANCH"'" \
  -o /tmp/repo.tar.gz

if [ ! -s /tmp/repo.tar.gz ]; then
    echo "[ERROR] Failed to download repository!"
    exit 1
fi
echo "[OK] Archive downloaded"

echo "[TAR] Extracting archive..."
sudo rm -rf /tmp/repo_extracted
mkdir -p /tmp/repo_extracted
tar -xzf /tmp/repo.tar.gz -C /tmp/repo_extracted --strip-components=1
echo "[OK] Archive extracted"

echo "[Rsync] Copying files to '"$SERVICE_DIR"'..."
sudo rsync -av --delete \
  --exclude ".git" \
  --exclude ".env" \
  /tmp/repo_extracted/ '"$SERVICE_DIR"'/
echo "[OK] Files copied"

echo "[Docker] Rebuilding and starting container..."
cd '"$PROJECT_DIR"'
docker-compose up --build -d '"$CONTAINER_NAME"'

echo "[Docker] Checking container status..."
sleep 5
docker-compose ps '"$CONTAINER_NAME"'

echo "[Docker] Cleaning up..."
docker image prune -f || true
rm -rf /tmp/repo.tar.gz /tmp/repo_extracted

echo "[OK] Deploy completed!"
'@

# Function for connecting via SSH with password
function Invoke-SSHWithPassword {
    param($Command)
    
    # Try using sshpass (if installed)
    $sshpassPath = Get-Command sshpass -ErrorAction SilentlyContinue
    if ($sshpassPath) {
        $result = & sshpass -p $PASSWORD ssh -p $SERVER_PORT -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" $Command 2>&1
        return $result
    }
    
    # Alternative: use plink from Putty
    $plinkPath = Get-Command plink -ErrorAction SilentlyContinue
    if ($plinkPath) {
        $tempFile = [System.IO.Path]::GetTempFileName()
        $Command | Out-File -FilePath $tempFile -Encoding ASCII
        $result = & echo y | plink -ssh -P $SERVER_PORT -pw $PASSWORD "$SERVER_USER@$SERVER_IP" -m $tempFile 2>&1
        Remove-Item $tempFile
        return $result
    }
    
    # Ask user to install tools if missing
    Write-Host "[ERROR] No SSH automation tool found!" -ForegroundColor Red
    Write-Host "Please install one of: sshpass, putty/plink, or use SSH keys" -ForegroundColor Yellow
    Write-Host "For now, using interactive SSH (you'll need to enter password manually)" -ForegroundColor Yellow
    ssh -p $SERVER_PORT "$SERVER_USER@$SERVER_IP" $Command
}

# Run deploy
try {
    $output = Invoke-SSHWithPassword -Command $remoteScript
    Write-Host $output
    
    $DEPLOY_SUCCESS = $LASTEXITCODE -eq 0
    
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
    $message = "%E2%9C%85 Deploy of $CONTAINER_NAME is successful%0A<b>Time:</b> $time"
} else {
    $message = "%E2%9D%8C Deploy of $CONTAINER_NAME is failed%0A<b>Time:</b> $time"
}

$telegramUrl = "https://api.telegram.org/bot7701650916:AAG78Lu0rG7XTeD3Nw-mZoEkKfcyzJAjH8k/sendMessage"
$chatIds = @("8144443377", "913005799", "6364646491")

foreach ($chatId in $chatIds) {
    curl.exe -s -X POST $telegramUrl `
        -d "chat_id=$chatId" `
        -d "parse_mode=HTML" `
        -d "text=$message" > $null
}

Write-Host "[OK] Done!" -ForegroundColor Green
