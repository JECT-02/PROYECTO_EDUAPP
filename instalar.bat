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

echo [1/2] Limpiando cache antigua (opcional pero seguro)...
rmdir /s /q node_modules >nul 2>&1
del package-lock.json >nul 2>&1

echo [2/2] Instalando dependencias nuevas y actualizadas...
call npm install
call npm update

echo.
echo ========================================================
echo   ¡Todo listo! Las dependencias fueron instaladas.
echo   Ahora puedes ejecutar "iniciar.bat" para correr la app.
echo ========================================================
pause
