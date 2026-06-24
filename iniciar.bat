@echo off
rem EduApp launcher - ASCII only
setlocal EnableDelayedExpansion

echo ========================================================
echo   EduApp - Iniciando todo...
echo ========================================================
echo.

rem 0. Check prerequisites
if not exist "node_modules\" (
    echo [ERROR] Falta node_modules/. Ejecuta instalar.bat primero.
    pause
    exit /b 1
)
if not exist "ai-backend\node_modules\" (
    echo [ERROR] Falta ai-backend/node_modules/. Ejecuta instalar.bat primero.
    pause
    exit /b 1
)
where supabase >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Falta Supabase CLI. Ejecuta instalar.bat primero.
    pause
    exit /b 1
)
if not exist ".env" (
    echo [ERROR] Falta archivo .env.
    pause
    exit /b 1
)

rem Load SUPABASE_ACCESS_TOKEN from .env
for /f "delims=" %%t in ('node -e "const fs=require('fs');const e=fs.readFileSync('.env','utf8');const m=e.match(/^SUPABASE_ACCESS_TOKEN=(.*)$/m);if(m)process.stdout.write(m[1].trim());"') do set "SUPABASE_TOKEN=%%t"
if defined SUPABASE_TOKEN set SUPABASE_ACCESS_TOKEN=!SUPABASE_TOKEN!

rem 1. Link project
echo [1/8] Vinculando proyecto Supabase...
call supabase link --project-ref oodijhbtgomlrchrvwzu >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Link fallo. Continuando de todos modos.
) else (
    echo       OK.
)
echo.

rem 2. Apply migrations
echo [2/8] Aplicando migraciones...
call supabase db push
if %errorlevel% neq 0 (
    echo [WARN] db push fallo. Si es ECIRCUITBREAKER, espera 30 min.
) else (
    echo       OK.
)
echo.

rem 3. Set Edge Function secrets
echo [3/8] Configurando secrets...
for /f "delims=" %%k in ('node -e "const fs=require('fs');const e=fs.readFileSync('.env','utf8');const m=e.match(/^NVIDIA_API_KEY=(.*)$/m);if(m)process.stdout.write(m[1].trim());"') do set "NVIDIA_KEY=%%k"
if defined NVIDIA_KEY (
    call supabase secrets set NVIDIA_API_KEY=!NVIDIA_KEY! --project-ref oodijhbtgomlrchrvwzu >nul 2>&1
    if %errorlevel% neq 0 (
        echo [WARN] No se pudo configurar NVIDIA_API_KEY.
    ) else (
        echo       NVIDIA_API_KEY OK.
    )
) else (
    echo [WARN] NVIDIA_API_KEY no encontrada en .env.
)
echo.

rem 4. Deploy Edge Functions
echo [4/8] Desplegando Edge Functions...
set "FUNCS=upload-source embed-source chat chat-roadmap generate-lesson generate-quiz generate-test generate-coliseo generate-roadmap generate-course-content analyze-error reinforce youtube-transcript generate-medal-svg register-user"
for %%f in (%FUNCS%) do (
    echo       - %%f
    call supabase functions deploy %%f --project-ref oodijhbtgomlrchrvwzu >nul 2>&1
    if %errorlevel% neq 0 (
        echo         reintentando...
        call supabase functions deploy %%f --project-ref oodijhbtgomlrchrvwzu >nul 2>&1
    )
)
echo       OK.
echo.

rem 5. Seed users
echo [5/8] Creando usuarios de prueba...
call node scripts/seed-test-users.mjs
if %errorlevel% neq 0 (
    echo [WARN] Seed fallo. Re-ejecuta con: node scripts/seed-test-users.mjs
) else (
    echo       OK.
)
echo.

rem 6. Kill ALL existing processes on ports
echo [6/8] Matando procesos en puertos 3001 y 5173...
set "AI_PORT=3001"
set "VITE_PORT=5173"

rem Kill by port - AI Backend
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":%AI_PORT% " ^| findstr "LISTENING" 2^>nul') do (
    echo       Matar PID %%p en puerto %AI_PORT%...
    taskkill /F /PID %%p >nul 2>&1
)
rem Kill by port - Vite
for /f "tokens=5" %%p in ('netstat -aon ^| findstr ":%VITE_PORT% " ^| findstr "LISTENING" 2^>nul') do (
    echo       Matar PID %%p en puerto %VITE_PORT%...
    taskkill /F /PID %%p >nul 2>&1
)
rem Also kill any node processes running server.js or vite
taskkill /F /IM node.exe /FI "WINDOWTITLE eq EduApp*" >nul 2>&1
ping -n 2 127.0.0.1 >nul 2>&1
echo       Puertos liberados.
echo.

rem 7. Start AI Backend in background
echo [7/8] Iniciando AI Backend en http://localhost:%AI_PORT% ...
start "EduApp AI Backend" cmd /c "cd /d ai-backend && node --watch server.js"
rem Wait for AI backend to be ready
set /a RETRIES=0
:wait_ai
ping -n 2 127.0.0.1 >nul 2>&1
set /a RETRIES+=1
for /f "tokens=*" %%h in ('node -e "fetch('http://localhost:%AI_PORT%/api/health').then(r=>process.stdout.write('ok')).catch(()=>process.exit(1))" 2^>nul') do (
    echo       AI Backend listo.
    goto ai_ready
)
if %RETRIES% lss 20 goto wait_ai
echo [WARN] AI Backend no respondio despues de 40s. Continuando de todos modos.
:ai_ready
echo.

rem 8. Start Vite dev server (this blocks until Ctrl+C)
echo [8/8] Iniciando servidor de desarrollo en http://localhost:%VITE_PORT% ...
echo.
echo   Cuentas de prueba:
echo     Estudiante - default_student@eduapp.test / student123
echo     Docente    - default_teacher@eduapp.test / teacher123
echo     Padre      - default_parent@eduapp.test / parent123
echo.
echo   AI Backend:  http://localhost:%AI_PORT%
echo   Frontend:    http://localhost:%VITE_PORT%
echo.

start http://localhost:%VITE_PORT%
call npm run dev

endlocal
