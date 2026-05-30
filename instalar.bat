@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ========================================================
echo   Instalador automatico - EduApp
echo ========================================================
echo.

set ERRORS=0

:: ============================================================
:: 1. Verificar Node.js
:: ============================================================
echo [1/8] Verificando Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo     [ERROR] Node.js no encontrado.
    echo     Descarga desde: https://nodejs.org/ (version LTS)
    pause
    exit /b
)
for /f "tokens=*" %%a in ('node -v') do set NODE_VER=%%a
echo     OK - Node.js %NODE_VER%

:: ============================================================
:: 2. Verificar Python
:: ============================================================
echo [2/8] Verificando Python...
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo     [ERROR] Python no encontrado.
    echo     Descarga desde: https://www.python.org/ (marca "Add to PATH")
    pause
    exit /b
)
for /f "tokens=*" %%a in ('python --version') do set PY_VER=%%a
echo     OK - %PY_VER%

:: ============================================================
:: 3. Verificar pip
:: ============================================================
echo [3/8] Verificando pip...
where pip >nul 2>&1
if %errorlevel% neq 0 (
    echo     [INFO] pip no encontrado, instalando...
    python -m ensurepip --upgrade >nul 2>&1
    if %errorlevel% neq 0 (
        echo     [ERROR] No se pudo instalar pip.
        pause
        exit /b
    )
)
echo     OK - pip disponible

:: ============================================================
:: 4. Crear entorno virtual e instalar dependencias Python
:: ============================================================
echo [4/8] Configurando entorno virtual Python...
if not exist "backend\venv\" (
    echo     Creando entorno virtual en backend\venv...
    python -m venv backend\venv
    if %errorlevel% neq 0 (
        echo     [ERROR] No se pudo crear el entorno virtual.
        pause
        exit /b
    )
    echo     OK - Entorno virtual creado
) else (
    echo     OK - Entorno virtual ya existe
)

echo     Instalando dependencias del backend...
call "backend\venv\Scripts\activate.bat"
if %errorlevel% neq 0 (
    echo     [ERROR] No se pudo activar el entorno virtual.
    pause
    exit /b
)

pip install --upgrade pip -q
pip install -r "backend\requirements.txt" -q
if %errorlevel% neq 0 (
    set ERRORS=1
    echo     [ERROR] Fallo la instalacion de dependencias Python.
    echo     Revisa tu conexion a internet e intenta de nuevo.
    pause
) else (
    echo     OK - Dependencias Python instaladas
)

:: ============================================================
:: 5. Configurar archivo .env
:: ============================================================
echo [5/8] Configurando archivo .env...
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy "backend\.env.example" "backend\.env" >nul
        echo     OK - .env creado desde .env.example
    ) else (
        echo     Creando .env con valores por defecto...
    )
) else (
    echo     OK - .env ya existe, verificando contenido...
)

:: Asegurar que .env tenga las 4 variables esenciales
for %%v in ("DATABASE_URL" "SECRET_KEY" "FRONTEND_URL" "GEMINI_API_KEY") do (
    findstr /r /b "%%~v=" backend\.env >nul 2>&1
    if !errorlevel! neq 0 (
        if "%%~v"=="DATABASE_URL" (
            echo DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/eduapp >> backend\.env
            echo     [AVISO] DATABASE_URL agregada.
        )
        if "%%~v"=="SECRET_KEY" (
            echo SECRET_KEY=eduapp_secret_key_change_in_production >> backend\.env
            echo     [AVISO] SECRET_KEY agregada.
        )
        if "%%~v"=="FRONTEND_URL" (
            echo FRONTEND_URL=http://localhost:5173 >> backend\.env
            echo     [AVISO] FRONTEND_URL agregada.
        )
        if "%%~v"=="GEMINI_API_KEY" (
            echo GEMINI_API_KEY=AIzaSyXXXXXXXXXX >> backend\.env
            echo     [AVISO] GEMINI_API_KEY agregada con placeholder.
        )
    )
)
echo     OK - .env verificado

:: ============================================================
:: 6. PostgreSQL: detectar, iniciar y configurar BD
:: ============================================================
echo [6/8] PostgreSQL - detectando servicio...

set PGSERVICE=
:: Intentar varias formas de encontrar PostgreSQL en Windows
for /f "tokens=2 delims=: " %%a in ('sc query 2^>nul ^| findstr /r /b /i "SERVICE_NAME.*postgres"') do set PGSERVICE=%%a
if "%PGSERVICE%"=="" (
    for /f "tokens=2 delims=: " %%a in ('sc query 2^>nul ^| findstr /r /b /i "SERVICE_NAME.*pgsql"') do set PGSERVICE=%%a
)

:: Buscar en rutas comunes si no hay servicio
if "%PGSERVICE%"=="" (
    if exist "C:\Program Files\PostgreSQL\16\bin\pg_isready.exe" set PGSERVICE=LOCAL
    if exist "C:\Program Files\PostgreSQL\17\bin\pg_isready.exe" set PGSERVICE=LOCAL
    if exist "C:\Program Files\PostgreSQL\15\bin\pg_isready.exe" set PGSERVICE=LOCAL
)

if "%PGSERVICE%"=="" (
    echo     [AVISO] No se detecto PostgreSQL.
    echo.
    echo     Si YA tienes PostgreSQL instalado:
    echo     1. Abre Services (services.msc) y busca el servicio PostgreSQL
    echo     2. Inicialo manualmente
    echo     3. Vuelve a ejecutar este instalador
    echo.
    echo     Si NO lo tienes instalado:
    echo     Descarga: https://www.postgresql.org/download/windows/
    echo     Durante la instalacion usa: usuario=postgres password=postgres puerto=5432
    echo.
    choice /C SN /M "¿Quieres continuar de todas formas?"
    if errorlevel 2 exit /b
    set ERRORS=1
    goto :setup_db
)

:: Iniciar el servicio si no esta corriendo
sc query "%PGSERVICE%" 2>nul | find "RUNNING" >nul
if !errorlevel! neq 0 (
    echo     Iniciando servicio PostgreSQL...
    net start "%PGSERVICE%" >nul 2>&1
    if !errorlevel! equ 0 (
        echo     OK - PostgreSQL iniciado
    ) else (
        echo     [AVISO] No se pudo iniciar automaticamente.
        echo     Inicia manualmente: services.msc ^> %PGSERVICE%
        choice /C SN /M "Continuar de todas formas?"
        if errorlevel 2 exit /b
    )
) else (
    echo     OK - PostgreSQL ya esta corriendo
)

:setup_db
:: ============================================================
:: 7. Crear BD, tablas y seed
:: ============================================================
echo [7/8] Configurando base de datos...

:: Activar venv (si aun no lo esta)
if exist "backend\venv\Scripts\activate.bat" call "backend\venv\Scripts\activate.bat"

cd backend

echo     Ejecutando setup_db.py (crea BD, tablas y seed)...
python "scripts\setup_db.py"
if %errorlevel% neq 0 (
    set ERRORS=1
    echo     [AVISO] setup_db.py tuvo problemas.
    echo     Revisa que PostgreSQL este corriendo y las credenciales en .env
    choice /C SN /M "Continuar de todas formas?"
    if errorlevel 2 (
        cd ..
        pause
        exit /b
    )
) else (
    echo     OK - Base de datos configurada y datos sembrados
)

cd ..

:: Solo deactivate si el comando existe
where deactivate >nul 2>&1 && call deactivate

:: ============================================================
:: 8. Instalar dependencias del frontend
:: ============================================================
echo [8/8] Instalando dependencias del frontend...
if not exist "node_modules\" (
    call npm install
    if %errorlevel% neq 0 (
        echo     [ERROR] Fallo la instalacion de dependencias del frontend.
        pause
        exit /b
    )
    echo     OK - Dependencias del frontend instaladas
) else (
    echo     OK - node_modules ya existe (omitiendo npm install)
)

:: ============================================================
:: FINAL — skip final pause si llamamos con param --no-pause
:: ============================================================
echo.
echo ========================================================
if %ERRORS% equ 0 (
    echo   Instalacion completada exitosamente
) else (
    echo   Instalacion completada con ADVERTENCIAS
)
echo ========================================================
echo.
echo   Para iniciar la aplicacion:  iniciar.bat
echo.
echo   Credenciales de prueba:
echo     Estudiante: estudiante1@demo.com / demo123
echo     Docente:    docente@demo.com / demo123
echo     Padre:      padre@demo.com / demo123
echo.
echo   IMPORTANTE: Si en .env dice AIzaSyXXXXXXXXXX,
echo   editalo con tu API key real de https://aistudio.google.com/apikey
echo.
if %ERRORS% gtr 0 (
    echo   (!) Hubo %ERRORS% advertencia(s). Revisa mensajes arriba.
    echo.
)

:: Saltar pause si se ejecuta automaticamente desde iniciar.bat
if not "%1"=="--no-pause" (
    pause
) else (
    echo   (omitido -- ejecutado automaticamente)
)
