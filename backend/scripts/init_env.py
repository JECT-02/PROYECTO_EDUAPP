"""
EduApp - Init .env
===================
Crea el archivo .env a partir de .env.example si no existe.
Ejecutar: python scripts/init_env.py
"""

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_EXAMPLE = BACKEND_DIR / ".env.example"
ENV_FILE = BACKEND_DIR / ".env"

def main():
    if ENV_FILE.exists():
        print(f"✅ .env ya existe en {ENV_FILE}")
        print("   Si deseas reiniciar la configuración, elimínalo y ejecuta este script nuevamente.")
        return

    if not ENV_EXAMPLE.exists():
        print(f"❌ No se encuentra {ENV_EXAMPLE}")
        return

    content = ENV_EXAMPLE.read_text(encoding="utf-8")
    ENV_FILE.write_text(content, encoding="utf-8")
    print(f"✅ Archivo .env creado en {ENV_FILE}")
    print()
    print("📝 Próximos pasos:")
    print("   1. Abre backend/.env en tu editor")
    print("   2. Reemplaza AIzaSyXXXXXXXXXX con tu API key de Google AI Studio")
    print("   3. (Opcional) Configura SMTP si deseas envío de correos")
    print()
    print("🔗 Obtén tu API key: https://aistudio.google.com/apikey")

if __name__ == "__main__":
    main()
