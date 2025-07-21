# Quick setup script for ngrok
Write-Host "🚀 Setting up ngrok for mobile development..." -ForegroundColor Green

# Check if ngrok is installed
try {
    $ngrokVersion = ngrok version
    Write-Host "✅ ngrok is installed: $ngrokVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ngrok not found. Installing..." -ForegroundColor Red
    npm install -g ngrok
}

Write-Host ""
Write-Host "📋 Setup Instructions:" -ForegroundColor Yellow
Write-Host "1. Start your backend server on port 8080" -ForegroundColor White
Write-Host "2. Run this command to expose your server:" -ForegroundColor White
Write-Host "   ngrok http 8080" -ForegroundColor Cyan
Write-Host "3. Copy the HTTPS URL from ngrok output" -ForegroundColor White
Write-Host "4. Update config/api.ts with the ngrok URL" -ForegroundColor White
Write-Host "5. Restart your React Native app" -ForegroundColor White
Write-Host ""

Write-Host "🔧 Example ngrok output:" -ForegroundColor Yellow
Write-Host "   Forwarding https://abc123.ngrok.io -> http://localhost:8080" -ForegroundColor Cyan
Write-Host "   Copy: https://abc123.ngrok.io" -ForegroundColor Green
Write-Host ""

# Ask if user wants to start ngrok now
$response = Read-Host "Do you want to start ngrok now? (y/n)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "🌐 Starting ngrok..." -ForegroundColor Green
    ngrok http 8080
}
