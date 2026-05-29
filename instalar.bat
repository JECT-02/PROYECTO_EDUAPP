@echo off
setlocal enabledelayedexpansion
echo ========================================================
echo   Instalador completo - EduApp
echo ========================================================
echo.

:: ============================================================
:: 1. Verificar Node.js
:: ============================================================
echo [1/6] Verificando Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no encontrado.
    echo Descarga e instala Node.js desde: https://nodejs.org/
    pause
    exit /b
)
echo     OK - Node.js instalado

:: ============================================================
:: 2. Verificar Python
:: ============================================================
echo [2/6] Verificando Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python no encontrado.
    echo Descarga e instala Python desde: https://www.python.org/
    echo Asegurate de marcar "Add Python to PATH" durante la instalacion.
    pause
    exit /b
)
echo     OK - Python instalado

:: ============================================================
:: 3. Verificar/Iniciar PostgreSQL
:: ============================================================
echo [3/6] Verificando PostgreSQL...

:: Buscar el servicio de PostgreSQL (cualquier version)
set PGSERVICE=
for /f "tokens=*" %%a in ('sc query 2^>nul ^| findstr /i "postgresql"') do (
    for /f "tokens=2 delims=: " %%b in ("%%a") do set PGSERVICE=%%b
)

if "%PGSERVICE%"=="" (
    echo [AVISO] PostgreSQL no esta instalado como servicio.
    echo         Descarga e instala PostgreSQL desde: https://www.postgresql.org/download/windows/
    echo         Durante la instalacion, usa usuario: postgres / password: postgres
    pause
) else (
    sc query "%PGSERVICE%" | find "RUNNING" >nul
    if !errorlevel! neq 0 (
        echo     Iniciando servicio %PGSERVICE%...
        net start "%PGSERVICE%" >nul 2>&1
        if !errorlevel! equ 0 (
            echo     OK - PostgreSQL iniciado
        ) else (
            echo [AVISO] No se pudo iniciar PostgreSQL.
            echo         Abre Services (services.msc) e inicia %PGSERVICE% manualmente.
            pause
        )
    ) else (
        echo     OK - PostgreSQL ya esta corriendo
    )
)

:: ============================================================
:: 4. Instalar dependencias Python
:: ============================================================
echo [4/6] Instalando dependencias del backend (Python)...
cd backend
call pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo     [ERROR] Fallo la instalacion de dependencias Python.
    pause
    exit /b
)
cd ..
echo     OK - Dependencias Python instaladas

:: ============================================================
:: 5. Configurar base de datos
:: ============================================================
echo [5/6] Configurando base de datos...
cd backend
python scripts/setup_db.py
if %errorlevel% neq 0 (
    echo     [AVISO] La configuracion de BD tuvo problemas.
    echo     Revisa que PostgreSQL este corriendo y accesible.
    pause
) else (
    echo     OK - Base de datos configurada
)
cd ..

:: ============================================================
:: 6. Instalar dependencias frontend
:: ============================================================
echo [6/6] Instalando dependencias del frontend...
call npm install
if %errorlevel% neq 0 (
    echo     [ERROR] Fallo la instalacion de dependencias del frontend.
    pause
    exit /b
)
echo     OK - Dependencias del frontend instaladas

:: ============================================================
:: FINAL
:: ============================================================
echo.
echo ========================================================
echo   Instalacion completada exitosamente
echo ========================================================
echo.
echo   Para iniciar la aplicacion, ejecuta:  iniciar.bat
echo.
echo   Si es tu primera vez, recuerda:
echo     1. Abre backend\.env y coloca tu API key de Gemini
echo        (si no lo has hecho ya)
echo     2. Obtienes tu API key en: https://aistudio.google.com/apikey
echo.
pause
