# Instrucciones para probar el Prototipo EduApp

Este es un prototipo interactivo (frontend) diseñado para demostrar el flujo de usuario, interfaces y animaciones del sistema EduApp. 

## Requisitos Previos
- Node.js instalado en tu sistema.

## Pasos para ejecutar el proyecto

1. Abre una terminal en la carpeta `PROYECTO_EDUAPP`.
2. Instala las dependencias ejecutando:
   ```bash
   npm install
   ```
3. Inicia el servidor de desarrollo ejecutando:
   ```bash
   npm run dev
   ```
4. Abre tu navegador web y ve a la dirección que te indica la terminal (por lo general es `http://localhost:5173/`).

## Flujo Recomendado de Pruebas

1. **Login (`#/login`)**: Haz clic en el botón de la demo rápida para cambiar el rol. Luego presiona "Iniciar sesión".
2. **Registro (`#/register`)**: Puedes hacer clic en "Crear cuenta nueva" desde el Login. Navega a través de los pasos del formulario.
3. **Onboarding**: Si completas el registro, pasarás por las pantallas de configuración de accesibilidad (`#/onboarding/accessibility`) y de selección de avatar/mascota (`#/onboarding/avatar`).
4. **Dashboard (`#/dashboard`)**: Aquí verás el panel principal del estudiante. 
   - Haz clic en la tarjeta de "Continuar sesión" para ir al Roadmap.
   - Haz clic en los retos del día para ir a un Quiz o al Coliseo.
5. **Roadmap (`#/roadmap`)**: Visualiza el camino de aprendizaje. Haz clic en un nodo "Disponible" (pulsante) para entrar a una Lección Teórica o Quiz.
6. **Lección (`#/lesson`)**: Observa el efecto de "máquina de escribir".
7. **Paneles Alternativos**: 
   - Puedes ir al panel docente haciendo clic en el botón del menú de la barra lateral "Ver panel docente".
   - Explora el menú del perfil en la esquina superior derecha para cerrar sesión o ir a tu perfil.

¡Disfruta navegando por el prototipo!
