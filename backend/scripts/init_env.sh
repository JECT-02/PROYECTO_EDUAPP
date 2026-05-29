#!/bin/bash
# ===========================================
# EduApp - Init .env from .env.example
# ===========================================
# Usage: bash scripts/init_env.sh
# This script copies .env.example to .env if .env does not exist

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$BACKEND_DIR/.env"
ENV_EXAMPLE="$BACKEND_DIR/.env.example"

if [ -f "$ENV_FILE" ]; then
    echo "✅ .env ya existe en $ENV_FILE"
    echo "   Si deseas reiniciar la configuración, elimínalo y ejecuta este script nuevamente."
else
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    echo "✅ Archivo .env creado en $ENV_FILE"
    echo ""
    echo "📝 Próximos pasos:"
    echo "   1. Abre backend/.env en tu editor"
    echo "   2. Reemplaza AIzaSyXXXXXXXXXX con tu API key de Google AI Studio"
    echo "   3. (Opcional) Configura SMTP para el envío de correos"
    echo ""
    echo "🔗 Obtén tu API key: https://aistudio.google.com/apikey"
fi
