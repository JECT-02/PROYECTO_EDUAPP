@echo off
cd /d "%~dp0"

title EduApp - Iniciando...

:: Verificar que python existe
python --version >nul 2>&1
if errorlevel 1 (
    echo ========================================================
    echo ERROR: Python no encontrado
    echo ========================================================
    echo.
    echo Descarga Python desde: https://www.python.org/
    echo Durante la instalacion marca "Add Python to PATH"
    echo.
    pause
    exit /b
)

:: Ejecutar el orquestador Python
python iniciar.py

:: Si llegamos aqui, el usuario cerro la aplicacion
pause
