# deploy.ps1
# При первом запуске запросит пароль и сохранит его в зашифрованном виде

# ===== НАСТРОЙКИ =====
$GITLAB_PRIVATE_TOKEN = "glpat-sa-a6Dzmy6pvrbW8Ju2e"  
$GITLAB_PROJECT_ID = "11"                     # ID проекта
$GITLAB_SERVER = "http://gl.abank.tj.tajikistan.tj"
$GITLAB_BRANCH = "master" # для premies_portal_frontend это master

# SSH подключение
$SERVER_USER = "bkarimov"
$SERVER_IP = "10.65.10.20"
$SERVER_PORT = "42587"

# Пути на сервере
$PROJECT_DIR = "/home/bkarimov/daily_activ"
$SERVICE_DIR = "/home/bkarimov/daily_activ/premies_portal_front"
$CONTAINER_NAME = "frontend"

# Файл для хранения пароля
$PasswordFile = "$env:USERPROFILE\.deploy_passwd"

# ===== ПОЛУЧЕНИЕ ПАРОЛЯ =====
function Get-ServerPassword {
    # Проверяем, есть ли сохраненный пароль
    if (Test-Path $PasswordFile) {
        try {
            $SecurePassword = Get-Content $PasswordFile | ConvertTo-SecureString
            $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
            )
            Write-Host "✅ Using saved password" -ForegroundColor Green
            return $Password
        } catch {
            Write-Host "❌ Saved password is corrupted, requesting new one" -ForegroundColor Yellow
        }
    }
    
    # Запрашиваем пароль
    $SecurePassword = Read-Host "🔑 Enter SSH password for $SERVER_USER@$SERVER_IP" -AsSecureString
    
    # Сохраняем пароль в зашифрованном виде
    $SecurePassword | ConvertFrom-SecureString | Set-Content $PasswordFile
    Write-Host "✅ Password saved encrypted to $PasswordFile" -ForegroundColor Green
    
    # Расшифровываем для использования
    $Password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
    )
    return $Password
}

# Получаем пароль
$PASSWORD = Get-ServerPassword

# ===== УСТАНОВКА SSH СЕССИИ =====
Write-Host "🚀 Starting deploy to ${SERVER_USER}@${SERVER_IP}:${SERVER_PORT}" -ForegroundColor Green

# Создаем скрипт команд для сервера
$remoteScript = @'
#!/bin/bash
set -e

echo "📡 Testing GitLab connection..."
if ! curl -s --header "PRIVATE-TOKEN: '"$GITLAB_PRIVATE_TOKEN"'" \
  "'"$GITLAB_SERVER"'/api/v4/projects/'"$GITLAB_PROJECT_ID"'" | grep -q "id"; then
    echo "❌ Cannot connect to GitLab!"
    exit 1
fi
echo "✅ GitLab connection OK"

echo "📥 Downloading repository archive..."
curl -s --header "PRIVATE-TOKEN: '"$GITLAB_PRIVATE_TOKEN"'" \
  "'"$GITLAB_SERVER"'/api/v4/projects/'"$GITLAB_PROJECT_ID"'/repository/archive.tar.gz?sha='"$GITLAB_BRANCH"'" \
  -o /tmp/repo.tar.gz

if [ ! -s /tmp/repo.tar.gz ]; then
    echo "❌ Failed to download repository!"
    exit 1
fi
echo "✅ Archive downloaded"

echo "📦 Extracting archive..."
sudo rm -rf /tmp/repo_extracted
mkdir -p /tmp/repo_extracted
tar -xzf /tmp/repo.tar.gz -C /tmp/repo_extracted --strip-components=1
echo "✅ Archive extracted"

echo "📁 Copying files to '"$SERVICE_DIR"'..."
sudo rsync -av --delete \
  --exclude ".git" \
  --exclude ".env" \
  /tmp/repo_extracted/ '"$SERVICE_DIR"'/
echo "✅ Files copied"

echo "🚀 Rebuilding and starting container..."
cd '"$PROJECT_DIR"'
docker-compose up --build -d '"$CONTAINER_NAME"'

echo "📊 Checking container status..."
sleep 5
docker-compose ps '"$CONTAINER_NAME"'

echo "🧹 Cleaning up..."
docker image prune -f || true
rm -rf /tmp/repo.tar.gz /tmp/repo_extracted

echo "✅ Deploy completed!"
'@

# Функция для подключения с паролем через SSH
function Invoke-SSHWithPassword {
    param($Command)
    
    # Пробуем через sshpass (если установлен)
    $sshpassPath = Get-Command sshpass -ErrorAction SilentlyContinue
    if ($sshpassPath) {
        $result = & sshpass -p $PASSWORD ssh -p $SERVER_PORT -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" $Command 2>&1
        return $result
    }
    
    # Альтернатива: используем plink из Putty
    $plinkPath = Get-Command plink -ErrorAction SilentlyContinue
    if ($plinkPath) {
        $tempFile = [System.IO.Path]::GetTempFileName()
        $Command | Out-File -FilePath $tempFile -Encoding ASCII
        $result = & echo y | plink -ssh -P $SERVER_PORT -pw $PASSWORD "$SERVER_USER@$SERVER_IP" -m $tempFile 2>&1
        Remove-Item $tempFile
        return $result
    }
    
    # Если ничего нет - просим установить
    Write-Host "❌ No SSH automation tool found!" -ForegroundColor Red
    Write-Host "Please install one of: sshpass, putty/plink, or use SSH keys" -ForegroundColor Yellow
    Write-Host "For now, using interactive SSH (you'll need to enter password manually)" -ForegroundColor Yellow
    ssh -p $SERVER_PORT "$SERVER_USER@$SERVER_IP" $Command
}

# Выполняем деплой
try {
    $output = Invoke-SSHWithPassword -Command $remoteScript
    Write-Host $output
    
    $DEPLOY_SUCCESS = $LASTEXITCODE -eq 0
    
    if ($DEPLOY_SUCCESS) {
        Write-Host "✅ Deploy successful!" -ForegroundColor Green
    } else {
        Write-Host "❌ Deploy failed!" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    $DEPLOY_SUCCESS = $false
}

# Отправляем уведомление в Telegram (простой вариант)
Write-Host "📤 Sending notification..." -ForegroundColor Yellow

$time = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
if ($DEPLOY_SUCCESS) {
    $message = "✅ Deploy of $CONTAINER_NAME is successful%0A<b>Time:</b> $time"
} else {
    $message = "❌ Deploy of $CONTAINER_NAME is failed%0A<b>Time:</b> $time"
}

# Отправка через curl (обычно есть в Windows 10+)
$telegramUrl = "https://api.telegram.org/bot7701650916:AAG78Lu0rG7XTeD3Nw-mZoEkKfcyzJAjH8k/sendMessage"
$chatIds = @("8144443377", "913005799", "6364646491")

foreach ($chatId in $chatIds) {
    curl.exe -s -X POST $telegramUrl `
        -d "chat_id=$chatId" `
        -d "parse_mode=HTML" `
        -d "text=$message" > $null
}

Write-Host "✅ Done!" -ForegroundColor Green
