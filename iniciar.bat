@echo off
echo ========================================================
echo   Iniciando EduApp...
echo ========================================================
echo.

:: Verificar que exista la carpeta node_modules
if not exist "node_modules\" (
    echo [ERROR] No se encontraron las dependencias. 
    echo Por favor ejecuta primero "instalar.bat"
    pause
    exit /b
)

echo Abriendo el servidor de desarrollo...
:: npm run dev inicia Vite. 
:: Vite correrá en localhost:5173 por defecto.
:: Vamos a abrir el navegador y ejecutar el comando a la vez.

start http://localhost:5173
call npm run dev
