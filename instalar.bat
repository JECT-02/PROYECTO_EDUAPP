@echo off
echo ========================================================
echo   Instalador de Dependencias - Proyecto EduApp
echo ========================================================
echo.

:: Verificar si Node.js está instalado
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Node.js instalado en tu computadora.
    echo Por favor, descarga e instala Node.js desde: https://nodejs.org/
    echo Una vez instalado, vuelve a ejecutar este script.
    pause
    exit /b
)

:: Verificar si Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Python instalado en tu computadora.
    echo Por favor, descarga e instala Python desde: https://www.python.org/
    echo Asegurate de marcar la casilla "Add Python to PATH" durante la instalacion.
    echo Una vez instalado, vuelve a ejecutar este script.
    pause
    exit /b
)

echo [1/3] Limpiando cache antigua del frontend (opcional pero seguro)...
rmdir /s /q node_modules >nul 2>&1
del package-lock.json >nul 2>&1

echo [2/3] Instalando dependencias del frontend...
call npm install
call npm update

echo [3/3] Instalando dependencias del backend (Python)...
cd backend
call pip install -r requirements.txt
cd ..

echo.
echo ========================================================
echo   ¡Todo listo! Las dependencias fueron instaladas.
echo   Ahora puedes ejecutar "iniciar.bat" para correr la app.
echo ========================================================
pause
