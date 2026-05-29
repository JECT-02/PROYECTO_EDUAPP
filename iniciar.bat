@echo off
setlocal enabledelayedexpansion
echo ========================================================
echo   Iniciando EduApp...
echo ========================================================
echo.

:: ============================================================
:: 1. Verificar PostgreSQL
:: ============================================================
echo [1/4] Verificando PostgreSQL...

:: Buscar el servicio de PostgreSQL (cualquier version)
set PGSERVICE=
for /f "tokens=*" %%a in ('sc query 2^>nul ^| findstr /i "postgresql"') do (
    for /f "tokens=2 delims=: " %%b in ("%%a") do set PGSERVICE=%%b
)

if "%PGSERVICE%"=="" (
    echo     [AVISO] No se encuentra PostgreSQL.
) else (
    sc query "%PGSERVICE%" | find "RUNNING" >nul
    if !errorlevel! neq 0 (
        echo     Iniciando %PGSERVICE%...
        net start "%PGSERVICE%" >nul 2>&1
        if !errorlevel! equ 0 (
            echo     OK - PostgreSQL iniciado
        ) else (
            echo     [AVISO] No se pudo iniciar %PGSERVICE%.
            echo     Inicia manualmente: services.msc ^> %PGSERVICE%
        )
    ) else (
        echo     OK - PostgreSQL corriendo
    )
)

:: ============================================================
:: 2. Verificar node_modules
:: ============================================================
echo [2/4] Verificando dependencias del frontend...
if not exist "node_modules\" (
    echo     [ERROR] No se encontraron dependencias.
    echo     Ejecuta primero: instalar.bat
    pause
    exit /b
)
echo     OK

:: ============================================================
:: 3. Iniciar backend
:: ============================================================
echo [3/4] Iniciando backend (FastAPI)...
start "EduApp Backend" cmd /c "cd backend && python run.py"

:: Esperar a que el backend inicie
echo     Esperando al backend...
timeout /t 3 /nobreak >nul
echo     OK - Backend en http://localhost:8000

:: ============================================================
:: 4. Iniciar frontend
:: ============================================================
echo [4/4] Iniciando frontend (Vite)...
start http://localhost:5173
call npm run dev

echo.
echo ========================================================
echo   Aplicacion cerrarda.
echo ========================================================
pause
