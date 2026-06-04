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
echo [1/6] Linking project...
call supabase link --project-ref oodijhbtgomlrchrvwzu >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Link failed. Continuing anyway.
) else (
    echo       OK.
)
echo.

rem 2. Apply migrations
echo [2/6] Applying migrations...
call supabase db push
if %errorlevel% neq 0 (
    echo [WARN] db push failed. If you got ECIRCUITBREAKER, wait 30 min and retry.
) else (
    echo       OK.
)
echo.

rem 3. Set Edge Function secrets
echo [3/6] Setting secrets...
for /f "delims=" %%k in ('node -e "const fs=require('fs');const e=fs.readFileSync('.env','utf8');const m=e.match(/^GEMINI_API_KEY=(.*)$/m);if(m)process.stdout.write(m[1].trim());"') do set "GEMINI_KEY=%%k"
if defined GEMINI_KEY (
    call supabase secrets set GEMINI_API_KEY=!GEMINI_KEY! --project-ref oodijhbtgomlrchrvwzu >nul 2>&1
    if %errorlevel% neq 0 (
        echo [WARN] Failed to set GEMINI_API_KEY secret.
    ) else (
        echo       GEMINI_API_KEY OK.
    )
) else (
    echo [WARN] GEMINI_API_KEY not found in .env.
)
echo.

rem 4. Deploy Edge Functions
echo [4/6] Deploying Edge Functions...
set "FUNCS=embed-source chat generate-lesson generate-quiz generate-test generate-coliseo generate-roadmap analyze-error reinforce youtube-transcript generate-medal-svg register-user"
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
echo [5/6] Seeding test users...
call node scripts/seed-test-users.mjs
if %errorlevel% neq 0 (
    echo [WARN] Seed failed. Re-run with: node scripts/seed-test-users.mjs
) else (
    echo       OK.
)
echo.

rem 6. Start dev server
echo [6/6] Starting dev server at http://localhost:5173 ...
echo.
echo   Test accounts:
echo     student  - default_student@eduapp.test / student123
echo     teacher  - default_teacher@eduapp.test / teacher123
echo     parent   - default_parent@eduapp.test / parent123
echo.

start http://localhost:5173
call npm run dev

endlocal
