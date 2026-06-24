@echo off
rem EduApp installer - ASCII only
setlocal EnableDelayedExpansion

echo ========================================================
echo   EduApp - Installer
echo ========================================================
echo.

rem 1. Check Node.js
echo [1/6] Checking Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install it from https://nodejs.org/
    pause
    exit /b 1
)
for /f "delims=" %%v in ('node -v') do echo       Node: %%v
for /f "delims=" %%v in ('npm -v') do echo       npm:  %%v
echo.

rem 2. Check / install Supabase CLI
echo [2/6] Checking Supabase CLI...
where supabase >nul 2>&1
if %errorlevel% neq 0 (
    echo       Installing Supabase CLI globally...
    call npm install -g supabase
    if %errorlevel% neq 0 (
        echo [ERROR] Could not install Supabase CLI.
        pause
        exit /b 1
    )
) else (
    for /f "delims=" %%v in ('supabase --version') do echo       supabase: %%v
)
echo.

rem 3. Install frontend dependencies
echo [3/6] Installing frontend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)
echo       OK.
echo.

rem 4. Install AI Backend dependencies
echo [4/6] Installing AI Backend dependencies...
if not exist "ai-backend\node_modules" (
    pushd ai-backend
    call npm install
    popd
    if %errorlevel% neq 0 (
        echo [ERROR] ai-backend npm install failed.
        pause
        exit /b 1
    )
    echo       OK.
) else (
    echo       Already installed.
)
echo.

rem 5. Verify .env
echo [5/6] Checking .env...
if not exist ".env" (
    echo [ERROR] .env is missing. Copy .env.example to .env and fill in the keys.
    pause
    exit /b 1
)
findstr /C:"VITE_SUPABASE_URL" .env >nul
if %errorlevel% neq 0 (
    echo [WARN] .env is missing VITE_SUPABASE_URL.
)
findstr /C:"NVIDIA_API_KEY" .env >nul
if %errorlevel% neq 0 (
    echo [WARN] .env is missing NVIDIA_API_KEY. AI features will not work.
)
findstr /C:"SUPABASE_ACCESS_TOKEN" .env >nul
if %errorlevel% neq 0 (
    echo [WARN] .env is missing SUPABASE_ACCESS_TOKEN. Some functions will not deploy.
)
echo       .env OK.
echo.

rem 6. Link Supabase project + seed users
echo [6/6] Linking project and seeding test users...
for /f "delims=" %%t in ('node -e "const fs=require('fs');const e=fs.readFileSync('.env','utf8');const m=e.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/m);if(m)process.stdout.write(m[1].trim());"') do set "SUPABASE_TOKEN=%%t"
if defined SUPABASE_TOKEN (
    set SUPABASE_ACCESS_TOKEN=!SUPABASE_TOKEN!
    call supabase link --project-ref oodijhbtgomlrchrvwzu >nul 2>&1
    if errorlevel 1 (
        echo [WARN] Could not link. Check SUPABASE_ACCESS_TOKEN in .env.
    ) else (
        echo       Linked.
    )
) else (
    echo [WARN] SUPABASE_ACCESS_TOKEN missing. Skipping link.
)
call node scripts/seed-test-users.mjs
if %errorlevel% neq 0 (
    echo [WARN] Seed failed. Re-run with: node scripts/seed-test-users.mjs
)
echo.

echo ========================================================
echo   Installation complete.
echo   Run iniciar.bat to start the app.
echo ========================================================
echo.
echo   Test accounts:
echo     student  - default_student@eduapp.test / student123
echo     teacher  - default_teacher@eduapp.test / teacher123
echo     parent   - default_parent@eduapp.test / parent123
echo.
pause
endlocal
