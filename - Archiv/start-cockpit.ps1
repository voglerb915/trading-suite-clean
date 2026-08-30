$wt = (Get-Command wt.exe -ErrorAction SilentlyContinue).Source

if (-not $wt) {
    Write-Host "wt.exe wurde nicht gefunden." -ForegroundColor Red
    exit
}

# BACKEND TAB
& $wt -w 0 new-tab --title "Backend" --tabColor "#00C853" powershell -NoExit -Command "
while (`$true) {
    try {
        cd 'C:/Users/Nutzer/OneDrive/Boerse/trading-suite/backend'
        node server.js
    }
    catch {
        Write-Host 'Backend abgestuerzt - Neustart in 2 Sekunden...' -ForegroundColor Red
        Start-Sleep -Seconds 2
    }
}
"

Start-Sleep -Milliseconds 500

Write-Host "Warte auf Backend Port 4000..." -ForegroundColor Yellow
while (-not (Test-NetConnection -ComputerName localhost -Port 4000 -InformationLevel Quiet)) {
    Start-Sleep -Milliseconds 300
}

# FRONTEND TAB
& $wt -w 0 new-tab --title "Frontend" --tabColor "#2962FF" powershell -NoExit -Command "
cd 'C:/Users/Nutzer/OneDrive/Boerse/trading-suite/frontend'
$host.UI.RawUI.WindowTitle = 'Frontend'

while (`$true) {
    try {
        npx vite
    }
    catch {
        Write-Host 'Frontend abgestuerzt - Neustart in 2 Sekunden...' -ForegroundColor Red
        Start-Sleep -Seconds 2
    }
    $host.UI.RawUI.WindowTitle = 'Frontend'
}
"

Start-Sleep -Milliseconds 500

# DASHBOARD TAB
& $wt -w 0 new-tab --title "Dashboard" --tabColor "#FF8F00" powershell -NoExit -Command "
while (`$true) {
    try {
        cd 'C:/Users/Nutzer/OneDrive/Boerse/mein-dashboard'
        node server.js
    }
    catch {
        Write-Host 'Dashboard abgestuerzt - Neustart in 2 Sekunden...' -ForegroundColor Red
        Start-Sleep -Seconds 2
    }
}
"

Write-Host "Alle Tabs gestartet." -ForegroundColor Green
