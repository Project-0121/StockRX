@echo off
echo ===================================================
echo PharmaTrack - Pharmacy Inventory Management System
echo One-Click Automated Setup
echo ===================================================

cd /d "%~dp0\.."

echo Checking Node.js installation...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js 20 LTS from https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Installing all project dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)

echo.
echo Checking environment file...
if not exist ".env.local" (
    if exist ".env.example" (
        echo Creating .env.local from .env.example...
        copy .env.example .env.local
        echo Please ensure you update .env.local with your Supabase credentials!
    )
)

echo.
echo ===================================================
echo Dependencies installed successfully!
echo To run the application:
echo   1. Make sure your database migrations are applied in Supabase.
echo   2. Run: npm run seed (to populate initial demo data)
echo   3. Run: npm run dev  (to launch on http://localhost:3000)
echo ===================================================
echo.
pause
