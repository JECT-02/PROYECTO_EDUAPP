@echo off
rem EduApp launcher - ASCII only
setlocal EnableDelayedExpansion

echo ========================================================
echo   EduApp - Launcher
echo ========================================================
echo.

rem 0. Prerequisites
if not exist "node_modules\" (
    echo [ERROR] node_modules is missing. Run instalar.bat first.
    pause
    exit /b 1
)
where supabase >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Supabase CLI is missing. Run instalar.bat first.
    pause
    exit /b 1
)
if not exist ".env" (
    echo [ERROR] .env is missing.
    pause
    exit /b 1
)

rem Load SUPABASE_ACCESS_TOKEN from .env
for /f "delims=" %%t in ('node -e "const fs=require('fs');const e=fs.readFileSync('.env','utf8');const m=e.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/m);if(m)process.stdout.write(m[1].trim());"') do set "SUPABASE_TOKEN=%%t"
if defined SUPABASE_TOKEN set SUPABASE_ACCESS_TOKEN=!SUPABASE_TOKEN!

rem 1. Link project
echo [1/9] Linking project...
call supabase link --project-ref oodijhbtgomlrchrvwzu >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Link failed. Continuing anyway.
) else (
    echo       OK.
)
echo.

rem 2. Apply migrations
echo [2/9] Applying migrations...
call supabase db push
if %errorlevel% neq 0 (
    echo [WARN] db push failed. If you got ECIRCUITBREAKER, wait 30 min and retry.
) else (
    echo       OK.
)
echo.

rem 3. Set Edge Function secrets
echo [3/9] Setting secrets...
for /f "delims=" %%k in ('node -e "const fs=require('fs');const e=fs.readFileSync('.env','utf8');const m=e.match(/^NVIDIA_API_KEY=(.*)$/m);if(m)process.stdout.write(m[1].trim());"') do set "NVIDIA_KEY=%%k"
if defined NVIDIA_KEY (
    call supabase secrets set NVIDIA_API_KEY=!NVIDIA_KEY! --project-ref oodijhbtgomlrchrvwzu >nul 2>&1
    if %errorlevel% neq 0 (
        echo [WARN] Failed to set NVIDIA_API_KEY secret.
    ) else (
        echo       NVIDIA_API_KEY OK.
    )
) else (
    echo [WARN] NVIDIA_API_KEY not found in .env.
)
echo.

rem 4. Deploy Edge Functions
echo [4/9] Deploying Edge Functions...
set "FUNCS=upload-source embed-source chat chat-roadmap generate-lesson generate-quiz generate-test generate-coliseo generate-roadmap generate-course-content analyze-error reinforce youtube-transcript generate-medal-svg register-user"
for %%f in (%FUNCS%) do (
    echo       - %%f
    call supabase functions deploy %%f --project-ref oodijhbtgomlrchrvwzu >nul 2>&1
    if %errorlevel% neq 0 (
        echo         retry...
        call supabase functions deploy %%f --project-ref oodijhbtgomlrchrvwzu >nul 2>&1
    )
)
echo       OK.
echo.

rem 5. Seed users
echo [5/9] Seeding test users...
call node scripts/seed-test-users.mjs
if %errorlevel% neq 0 (
    echo [WARN] Seed failed. Re-run with: node scripts/seed-test-users.mjs
) else (
    echo       OK.
)
echo.

rem 6. Free ports before starting services
echo [6/9] Freeing ports...
set "AI_PORT=3001"
set "VITE_PORT=5173"

rem Kill any process listening on AI Backend port
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":%AI_PORT% " ^| findstr "LISTENING"') do (
    echo       Killing PID %%p on port %AI_PORT%...
    taskkill /F /PID %%p >nul 2>&1
)
rem Kill any process listening on Vite port
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":%VITE_PORT% " ^| findstr "LISTENING"') do (
    echo       Killing PID %%p on port %VITE_PORT%...
    taskkill /F /PID %%p >nul 2>&1
)
rem Small delay to let OS release the ports
ping -n 2 127.0.0.1 >nul 2>&1
echo       Ports freed.
echo.

rem 7. Start AI Backend
echo [7/9] Starting AI Backend at http://localhost:%AI_PORT% ...
echo.
start "EduApp AI Backend" cmd /c "cd /d ai-backend && npm run dev"
rem Wait for AI backend to be ready
set /a RETRIES=0
:wait_ai
ping -n 2 127.0.0.1 >nul 2>&1
set /a RETRIES+=1
for /f "tokens=*" %%h in ('node -e "fetch('http://localhost:%AI_PORT%/api/health').then(r=>process.stdout.write('ok')).catch(()=>process.exit(1))" 2^>nul') do (
    echo       AI Backend is ready.
    goto ai_ready
)
if %RETRIES% lss 15 goto wait_ai
echo [WARN] AI Backend did not respond after 30s, continuing anyway.
:ai_ready
echo.

rem 8. Start dev server
echo [8/9] Starting dev server at http://localhost:%VITE_PORT% ...
echo.
echo   Test accounts:
echo     student  - default_student@eduapp.test / student123
echo     teacher  - default_teacher@eduapp.test / teacher123
echo     parent   - default_parent@eduapp.test / parent123
echo.
echo   AI Backend: http://localhost:%AI_PORT%

start http://localhost:%VITE_PORT%
call npm run dev

endlocal
