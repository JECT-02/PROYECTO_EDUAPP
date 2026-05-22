# INTEGRANTES
- CRUZ TAIRO JHON EDMILSON
- HERRERA ROMO DAREN ADIEL

# Arquitectura y stack

**Producto:** Web Responsive (no app nativa). Compatible con Chrome, Firefox, Safari y Edge (últimas 2 versiones). Diseño **mobile-first (320px)** escalable a desktop.

**Tecnologías de presentación de referencia:**

- **SPA** (Single Page Application) con enrutamiento cliente.
    
- **Canvas API o SVG** para el roadmap.
    
- **Web Speech API** para TTS (texto a voz) y STT (voz a texto).
    
- **Vibration API** (con graceful degradation si no está disponible).
    

**Breakpoints responsive obligatorios:**

- **Mobile:** 320px – 767px. Layout vertical. Roadmap en scroll vertical. Controles táctiles optimizados (touch targets mínimo 44×44px).
    
- **Tablet:** 768px – 1023px. Layout híbrido. Sidebar colapsable. Roadmap con más nodos visibles.
    
- **Desktop:** 1024px+. Layout multi-panel. Sidebar fija. Roadmap con zoom/pan con mouse. Panel lateral de chat.
    

# 1. Stakeholders

### 1.1 Estudiante (`role: student`)

- Actor principal. Consume contenido, realiza evaluaciones, interactúa con IA.
    
- Permisos en interfaz: CRUD sobre su progreso visual, lectura de cursos asignados, envío de respuestas, personalización de perfil/mascota.
    
- Interacciones: Con sistema IA (tutor), con docente (vía reportes automáticos), con padres (vía vinculación de cuentas).
    

### 1.2 Educador / Profesor (`role: teacher`)

- Crea cursos, sube material de clase, supervisa progreso, valida contenido generado por IA.
    
- Permisos en interfaz:
    
    - Crear/editar/eliminar cursos propios.
        
    - Subir material fuente (PDF, DOCX, TXT, URLs de YouTube) para RAG.
        
    - Generar roadmaps automáticamente vía IA (con opción de editar/rechazar nodos).
        
    - Ver dashboard analítico de estudiantes inscritos.
        
    - Recibir alertas de estudiantes en riesgo o con dificultades persistentes.
        
    - No puede ver datos de estudiantes no inscritos en sus cursos.
        

### 1.3 Padre / Tutor (`role: parent`)

- Actor observador. Monitorea engagement y avance de estudiantes vinculados.
    
- Permisos en interfaz:
    
    - Vincularse a cuenta de estudiante mediante código de invitación (6 dígitos alfanuméricos) o email de estudiante.
        
    - Ver dashboard **read-only**: tiempo de estudio, sincronía, medallas, alertas de dificultad.
        
    - Recibir reportes semanales automáticos por email.
        
    - Configurar límites de tiempo de estudio (opcional, fase 2).
        
    - No puede responder evaluaciones ni modificar progreso.
        

### 1.4 Administrador del Sistema (`role: admin`)

- Gestiona la plataforma, modelos de IA, usuarios globales.
    
- Permisos en interfaz: Gestión de usuarios, configuración de modelos IA, logs de auditoría, backup, plantillas de cursos globales.
    

### 1.5 Usuarios con Discapacidad (sub-rol transversal)

- **Discapacidad Visual:** Usan screen readers (NVDA, JAWS, VoiceOver), navegación por teclado (Tab/Shift+Tab/Enter/Espacio), y comandos de voz Web Speech API.
    
- **Discapacidad Motriz:** Navegación 100% por voz, switches de accesibilidad, evitar drag-and-drop obligatorio (siempre alternativa por click).
    

# 2. Requerimientos del sistema

## 2.1 Módulo de autenticación, registro y onboarding

### 2.1.1 Pantalla de Login (Pantalla #1)

- **URL:** `/login`
    
- **Layout:** Centrado, fondo con patrón sutil de constelaciones animadas (CSS/SVG, no video). Logo centrado.
    
- **Campos:**
    
    - Email (validación visual regex RFC 5322, mensaje de error inline).
        
    - Contraseña (mínimo 8 caracteres, 1 mayúscula, 1 número, 1 símbolo. Mostrar/ocultar con ícono de ojo).
        
- **Botones:** "Iniciar sesión", "Crear cuenta", "¿Olvidaste tu contraseña?".
    
- **OAuth opcional:** Google, Microsoft (para instituciones educativas).
    
- **Accesibilidad:** Labels ARIA explícitos, contraste 7:1, foco visible con `outline: 3px solid #3B82F6`.
    
- **Flujo post-login:** La app recibe el rol del usuario y redirige condicionalmente:
    
    - `student` → `/dashboard`
        
    - `teacher` → `/teacher/dashboard`
        
    - `parent` → `/parent/dashboard`
        
    - `admin` → `/admin/panel`
        

### 2.1.2 Pantalla de Registro (Pantalla #2)

- **URL:** `/register`
    
- **Paso 1 — Selección de Rol:**
    
    - Cards grandes seleccionables: "Soy Estudiante", "Soy Docente", "Soy Padre/Tutor".
        
    - Cada card muestra ícono, breve descripción de funcionalidades, y color distintivo.
        
- **Paso 2 — Datos de Cuenta:**
    
    - Nombre completo, email, contraseña, confirmar contraseña.
        
    - Checkbox: "Acepto términos y política de privacidad" (obligatorio).
        
    - Si rol = **student**: campo "Edad" (selector 7-10, 11-14, 15-17, 18+). Si edad < 13, solicitar email de padre/tutor para consentimiento (envío de email con enlace de aprobación; cuenta en estado `pending_parent` hasta aprobación).
        
    - Si rol = **teacher**: campo "Institución/Escuela" (texto libre) y "Materia principal" (dropdown: Matemáticas, Ciencias, Historia, Tecnología, Idiomas, Otros).
        
    - Si rol = **parent**: campo "Relación con el estudiante" (Padre, Madre, Tutor legal, Otro).
        
- **Paso 3 — Verificación:**
    
    - Envío de email con código OTP de 6 dígitos (expira en 10 minutos).
        
    - Pantalla de verificación: 6 inputs de un dígito cada uno, auto-focus al siguiente.
        
    - Reenvío de código disponible después de 60 segundos.
        
- **Paso 4 — Onboarding Específico por Rol:**
    
    - Estudiante: Ver sección 2.1.3.
        
    - Docente: Onboarding de herramientas de creación.
        
    - Padre: Pantalla de vinculación: "Ingresa el código de tu hijo/a" o "Buscar por email del estudiante". El estudiante debe aprobar la vinculación (notificación in-app).
        

### 2.1.3 Onboarding del Estudiante (Pantalla #3 y #4)

- **Pantalla #3 — Configuración de Accesibilidad:**
    
    - Título: "Personaliza tu experiencia de aprendizaje".
        
    - Toggle switches (no checkboxes) para:
        
        - "Modo de alto contraste" (aplica tema oscuro/claro forzado con contraste máximo).
            
        - "Narración por voz automática" (activa Web Speech API TTS en todas las pantallas).
            
        - "Reducir animaciones" (reemplaza transiciones complejas por fades simples, respeta `prefers-reduced-motion`).
            
        - "Navegación por voz" (habilita micrófono permanente).
            
        - "Texto grande" (aumenta base font-size a 18px).
            
        - "Modo para daltónismo" (paletas de color seguras: viridis o cividis).
            
    - Cada toggle, al activarse, ejecuta una demostración inmediata en la misma pantalla (ej. si activa narración, el sistema lee el título en voz alta).
        
- **Pantalla #4 — Avatar y Mascota:**
    
    - Selector de avatar inicial: 8 opciones vectoriales (SVG), diversas en género y tono de piel.
        
    - Selector de mascota base: 3 opciones (Dragón, Robot, Búho). Cada una con animación CSS idle (flotación suave).
        
    - Campo de nombre para la mascota (opcional, default según tipo).
        
    - Botón "Comenzar mi viaje" → redirige a `/dashboard`.
        

### 2.1.4 Recuperación de Contraseña

- **URL:** `/forgot-password`
    
- Formulario de email → envío de link mágico (expira 1h) → pantalla de nueva contraseña → login.
    

## 2.2 Módulo de gestión de cursos (panel docente)

### 2.2.1 Dashboard del Docente (Pantalla #5)

- **URL:** `/teacher/dashboard`
    
- **Layout Desktop:** Sidebar izquierda fija (200px) con navegación. Área principal con widgets.
    
- **Secciones:**
    
    - **"Mis Cursos":** Cards de cursos creados. Cada card muestra: portada (subida o generada por IA), título, cantidad de estudiantes inscritos, estado (Borrador / Publicado / Archivado), fecha de última modificación.
        
    - **"Acciones rápidas":** Botón grande "+ Crear nuevo curso", "Ver reportes", "Subir material".
        
    - **"Alertas recientes":** Lista de estudiantes con dificultades (nombre, curso, concepto problemático, nivel de alerta: amarillo/naranja/rojo).
        
- **Sección Analytics** (solo desktop, tablet en modal):
    
    - Gráfico de líneas: estudiantes activos por día (últimos 7 días).
        
    - Gráfico circular: distribución de sincronía promedio por curso.
        

### 2.2.2 Creación de Curso (Pantalla #6)

- **URL:** `/teacher/courses/create`
    
- **Paso 1 — Información Básica:**
    
    - Título del curso (máx. 100 caracteres).
        
    - Descripción (máx. 500 caracteres, textarea con contador).
        
    - Categoría (dropdown: Matemáticas, Ciencias Naturales, Física, Química, Historia, Lengua, Programación, Arte, Otros).
        
    - Nivel educativo (dropdown según edades: 7-10, 11-14, 15-17, 18+).
        
    - Imagen de portada: Upload (JPG/PNG, máx. 2MB, min. 800×450px) o "Generar con IA" (prompt automático basado en título + categoría).
        
- **Paso 2 — Carga de Material Fuente (RAG):**
    
    - Zona de drag-and-drop (con fallback a click para seleccionar archivos) para subir:
        
        - PDFs (máx. 50MB por archivo, máx. 10 archivos).
            
        - DOCX.
            
        - Archivos de texto.
            
        - URLs de YouTube (el sistema extraerá transcripción automáticamente).
            
    - Lista de archivos subidos con progreso de procesamiento visual: "Extrayendo texto..." → "Generando embeddings..." → "Listo".
        
- **Paso 3 — Generación del Roadmap por IA:**
    
    - Botón "Generar Roadmap con IA".
        
    - El sistema envía el material fuente al LLM y recibe una estructura de nodos.
        
    - **Pantalla de Revisión del Roadmap Generado:**
        
        - Visualización previa del camino serpiente (SVG estático, no editable en posición pero sí en contenido).
            
        - Cada nodo es editable inline: el docente puede cambiar el título, cambiar el tipo, eliminarlo, o agregar uno nuevo.
            
        - Botón "Regenerar nodo [X]" si no le gusta la descripción.
            
        - Toggle "Incluir examen final (Coliseo)" (default: true si hay >= 8 nodos).
            
        - Toggle "Habilitar refuerzo multifuente" (default: true).
            
    - Botón "Publicar curso" → estado `published`. Botón "Guardar borrador" → estado `draft`.
        
- **Restricciones de interfaz:**
    
    - Un curso no puede publicarse sin al menos 1 archivo fuente subido y procesado.
        
    - Un curso no puede publicarse con menos de 5 nodos.
        
    - Una vez publicado, el docente puede editar descripciones pero **NO** eliminar nodos que ya tengan estudiantes con progreso. Puede agregar nodos nuevos al final.
        

### 2.2.3 Gestión de Estudiantes por Curso (Pantalla #7)

- **URL:** `/teacher/courses/:courseId/students`
    
- Tabla de estudiantes con columnas: Nombre, Email, Progreso (% de nodos completados), Sincronía promedio, Última actividad, Alertas.
    
- **Filtros:** Por rango de sincronía, por inactividad (> 3 días, > 7 días), por dificultades persistentes.
    
- **Acciones por fila:**
    
    - "Ver detalle" → abre panel lateral (drawer) con: gráfico de progreso temporal, matriz de debilidades (top 5 conceptos con errores), veces que presionó "Aún no entiendo", tiempos de estudio por día.
        
    - "Enviar mensaje" (fase 2: chat directo).
        
    - "Generar informe PDF" → descarga PDF con toda la analítica del estudiante en ese curso.
        
- **Botón "Invitar estudiantes":** Genera un enlace de invitación único (`/join/:courseToken`) o un código QR. El estudiante ingresa el código en su dashboard para inscribirse.
    

### 2.2.4 Validación y Moderación de Contenido IA

- **URL:** `/teacher/courses/:courseId/content-review`
    
- Cada vez que la IA genera contenido teórico para un nodo, queda en estado `pending_teacher_review`.
    
- El docente ve una comparativa lado a lado: "Material fuente original (chunk relevante)" vs "Contenido generado por IA".
    
- El docente puede: (a) Aprobar, (b) Editar inline, (c) Rechazar con comentario (la IA regenera teniendo en cuenta el feedback).
    
- Una vez aprobado, el contenido pasa a `published` y es visible para estudiantes.
    
- **Configuración de rigor:** El docente puede ajustar un slider "Rigor del contenido" (1-5) que afecta los prompts de la IA: 1 = lenguaje muy simple, analogías frecuentes; 5 = lenguaje técnico, formal.
    

## 2.3 Módulo: Dashboard del estudiante

### 2.3.1 Dashboard Principal (Pantalla #8)

- **URL:** `/dashboard`
    
- **Layout:**
    
    - **Header fijo** (sticky top, 64px height): Logo izquierda, barra de búsqueda de cursos (centro, solo desktop), ícono de notificaciones (campana con badge numérico), avatar del estudiante (dropdown con: Perfil, Configuración, Cerrar sesión).
        
    - **Área principal:**
        
        - **Saludo dinámico:** "¡Buenos días, [Nombre]!" (cambia según hora local: 5-11am mañana, 12-6pm tarde, 7-11pm noche).
            
        - **Card "Continuar donde lo dejaste":** Ocupa el ancho completo en mobile, 60% en desktop. Muestra: portada del curso, nombre del nodo exacto, mini-progress bar circular, y botón "Continuar" primario. Si no hay sesión previa (< 24h), muestra "¿Por dónde empezamos hoy?" con sugerencias de cursos.
            
        - **Sección "Mis Cursos":** Grid de cards (1 columna mobile, 2 tablet, 3 desktop). Cada card:
            
            - Imagen de portada (aspect-ratio 16/9, object-fit cover).
                
            - Título (2 líneas máx, ellipsis).
                
            - Nombre del docente.
                
            - Barra de progreso lineal con porcentaje exacto.
                
            - Etiqueta de estado: "En progreso" (azul), "Nuevo" (verde), "Completado" (púrpura), "Pendiente de invitación" (gris).
                
            - Hover en desktop: elevación (box-shadow aumentado), scale 1.02, transición 200ms.
                
        - **Sección "Retos del día":** Máximo 2 cards pequeñas: repaso espaciado de un tema completado, o invitación a un Coliseo recién desbloqueado.
            
    - **Sidebar derecha** (desktop only, 300px): Panel de "Tu mascota" mostrando estado actual (animación CSS idle), XP hasta siguiente nivel, y última medalla obtenida.
        

### 2.3.2 Inscripción a Curso

- El estudiante puede inscribirse de dos formas:
    
    1. **Por código:** Input en dashboard "Unirme a un curso con código". Respuesta inmediata en UI: éxito (aparece en "Mis Cursos") o error (token inválido, curso lleno si hay límite, curso no publicado).
        
    2. **Por catálogo público:** URL `/explore`. Lista de cursos públicos con filtros por categoría, nivel, idioma. El estudiante hace click en "Inscribirme".
        
- Al inscribirse, el sistema genera automáticamente el estado del roadmap para ese curso (todos los nodos en estado `locked` excepto el primero en `available`).
    

## 2.4 Módulo: Roadmap de aprendizaje

### 2.4.1 Pantalla del Roadmap (Pantalla #9)

- **URL:** `/courses/:courseId/roadmap`
    
- **Canvas/SVG Responsive:**
    
    - El roadmap es un componente canvas o SVG que ocupa el 100% del viewport height menos el header (`100vh - 64px`).
        
    - **Mobile:** Orientación vertical. Scroll nativo del navegador. La serpiente/camino desciende en zig-zag.
        
    - **Desktop:** Pan y zoom libre (mouse drag para pan, scroll wheel para zoom, límites definidos por bounding box del SVG). Botones flotantes de zoom (+/-) y "Centrar en mi posición".
        
- **Estructura de nodos** (mínimo 5, máximo recomendado 15 por curso):
    
    - **Nodo Teoría** (Azul, radio 24px): Lectura generada por IA.
        
    - **Nodo Práctica** (Verde, radio 24px): Ejercicio interactivo.
        
    - **Nodo Quiz** (Naranja, radio 28px): Evaluación rápida 3-5 preguntas.
        
    - **Nodo Jefe/Examen** (Rojo con borde dorado, radio 36px): Examen final de unidad.
        
    - **Nodo Recompensa** (Dorada, radio 20px): Medalla o personalización.
        
- **Estados visuales:**
    
    - `locked`: Gris, opacidad 0.4, ícono de candado pequeño. No clickable.
        
    - `available`: Color completo, pulso suave CSS (`animation: pulse 2s infinite`). Cursor pointer.
        
    - `in_progress`: Color completo, borde blanco sólido de 3px, animación de brillo.
        
    - `completed`: Color sólido, ícono de check blanco interior. Opacidad 1.0.
        
- **Mascota guía:** Sprite CSS o Lottie posicionado **SIEMPRE** junto al nodo `available` o `in_progress` más reciente. Mira hacia el siguiente nodo (rotación CSS según ángulo de la línea). Burbuja de diálogo aparece al entrar a la pantalla con mensaje contextual generado por IA o seleccionado de pool de 20 frases.
    
- **Línea conectora:** SVG path con `stroke-dasharray` animado. Los segmentos hasta el nodo actual son sólidos y de color dorado. Los futuros son punteados y grises.
    

### 2.4.2 Interacción con Nodos

- **Click en nodo bloqueado:** Shake animation horizontal (CSS translateX 3 veces). Mascota muestra tooltip: "Aún no puedes pasar aquí. Completa los desafíos anteriores." Si Vibration API disponible, vibración corta (`vibrate [50,50,50]`).
    
- **Click en nodo completado:** Modal centrado con resumen: título, fecha de completado (formato localizado), score obtenido, botón "Repasar" (regenera contenido simplificado) y "Cerrar".
    
- **Click en nodo disponible:** Transición de zoom (CSS transform scale desde el centro del nodo hasta fullscreen overlay, 400ms ease-out) → navegación a la pantalla correspondiente según tipo.
    
- **Hover en desktop:** Tooltip con nombre del nodo y tipo. Si es quiz, muestra "3 preguntas · ~5 minutos".
    

### 2.4.3 Barra de Sincronía (Nivel de Entendimiento)

- Fija en la parte superior del roadmap (debajo del header), altura 8px.
    
- **Fórmula exacta mostrada:** `S = (Nc * 0.40) + (P * 0.30) + (Ii * 0.20) + (Te * 0.10)`
    
    - `Nc` = nodos completados / total nodos (normalizado 0-1).
        
    - `P` = promedio de score en tests (0-1).
        
    - `Ii` = interacciones con IA / umbral máximo (normalizado, cap en 1.0).
        
    - `Te` = tiempo de estudio activo (min) / meta semanal (normalizado, cap en 1.0).
        
- **Colores por rango:** 0-30% `#EF4444`, 31-60% `#F97316`, 61-85% `#3B82F6`, 86-100% `#8B5CF6` con glow box-shadow.
    
- Al cambiar de nivel de color, animación de confeti (librería canvas-js o CSS particles, 2s) y mascota celebra.
    

## 2.5 Módulo: Lección teórica inmersiva

### 2.5.1 Pantalla de Lectura (Pantalla #10)

- **URL:** `/courses/:courseId/nodes/:nodeId/lesson`
    
- **Layout:**
    
    - **Header fijo:** Botón atrás (flecha), título del nodo (truncado con ellipsis), botón "Modo audio" (altavoz, toggle on/off de TTS continuo).
        
    - **Área de contenido:** Contenedor centrado, max-width 720px (legibilidad óptima), padding 24px.
        
    - **Footer fijo** (mobile) o sidebar sticky (desktop): Botón "Ir al cuestionario" (deshabilitado hasta condición de lectura).
        
- **Efecto Máquina de Escribir IA:**
    
    - El contenido se renderiza en bloques `<p>`. Cada párrafo se revela carácter por carácter.
        
    - Velocidad base: 20ms por carácter en desktop, 15ms en mobile (menor tiempo por pantalla más pequeña).
        
    - Cuando la IA detecta un `<key_concept>` (etiquetado en el contenido), la velocidad baja a 40ms por carácter y el texto se resalta con background `#FEF08A` que fadea a transparente en 1.5s.
        
    - **Sonido ambiental:** Web Audio API reproduce teclado suave (volumen 10% del master) solo si el usuario **NO** tiene activado `prefers-reduced-motion` o modo accesibilidad total.
        
    - **Skip:** Botón "Saltar animación" flotante (esquina inferior derecha). Al hacer click, revela todo el párrafo actual y todos los siguientes.
        
- **Palabras interactivas:** Términos clave con `border-bottom` punteado `#3B82F6`. Al click:
    
    - Se abre un drawer/bottom sheet (mobile) o modal lateral (desktop) con:
        
        - Definición generada por IA (máx. 2 oraciones).
            
        - Botón "Escuchar" (Web Speech API TTS).
            
        - Botón "Ejemplo personalizado" → la IA genera un ejemplo basado en el perfil del estudiante.
            

### 2.5.2 Progreso de Lectura y Transición

- El porcentaje de lectura se calcula por tiempo de visualización por párrafo / tiempo esperado (basado en longitud y complejidad Flesch-Kincaid).
    
- El botón "Ir al cuestionario" muestra: "Avance: X%" y está disabled con opacity 0.5 hasta 80%.
    
- Al habilitarse, click ejecuta:
    
    1. Registro de progreso de lectura.
        
    2. Transición slide-up a la evaluación.
        

## 2.6 Módulo: Evaluaciones adaptativas

### 2.6.1 Micro-Quiz (Nodos Intermedios) — Pantalla #11

- **URL:** `/courses/:courseId/nodes/:nodeId/quiz`
    
- **Estructura:** 3 preguntas generadas por IA en tiempo real basadas en el contenido teórico del nodo.
    
- **Timer:** Barra de progreso horizontal decreciente. 30 segundos por pregunta. Al llegar a 0:
    
    - Cuenta como error.
        
    - Sonido de error (Web Audio API, tono grave 200Hz, 300ms).
        
    - Si Vibration API disponible: `navigator.vibrate([100,100,100])`.
        
    - Avance automático a siguiente pregunta.
        
- **Tipos de pregunta:**
    
    - **Opción múltiple:** 4 botones grandes, full-width en mobile. Al seleccionar, se bloquea la interfaz 1.5s.
        
        - Correcto: fondo verde `#22C55E`, check icon, sonido ding, vibración `[50,50,100,50,150]`.
            
        - Incorrecto: fondo rojo `#EF4444`, X icon, opción correcta se revela en verde tras 800ms delay.
            
    - **Verdadero/Falso:** Dos botones lado a lado.
        
    - **Emparejamiento** (desktop/tablet): Drag and drop con mouse/touch. En mobile, versión alternativa: seleccionar par de una lista.
        
- **Respuesta por voz:**
    
    - Botón de micrófono flotante. Mantener presionado (long-press 500ms) para escuchar. Soltar para procesar.
        
    - Comandos: "Opción uno/dos/tres/cuatro", "A/B/C/D", "Verdadero/Falso".
        
    - Si confianza STT < 0.80, muestra: "No entendí bien. Intenta de nuevo." Sin penalización.
        

### 2.6.2 Fin de Micro-Quiz

- **Pantalla intermedia de resultados:**
    
    - Score: X/3.
        
    - Si >= 2/3: "¡Bien hecho!". Botón "Continuar camino". Se otorgan 10 XP. Nodo marcado como completado.
        
    - Si < 2/3: "Necesitas repasar". Botón "Volver a la lección" (contenido regenerado simplificado) o "Intentar de nuevo" (nuevas 3 preguntas, máx. 3 intentos; tras 3 fallos, fuerza repaso).
        
- Cada error se registra en la matriz de debilidades del estudiante.
    

### 2.6.3 Test de Unidad (Pantalla #12)

- **URL:** `/courses/:courseId/nodes/:nodeId/test`
    
- **Pantalla de inicio** (modal de confirmación):
    
    - Título: "¿Listo para el desafío?"
        
    - Info: "10 preguntas · 15 minutos · Necesitas 70% para avanzar".
        
    - Botones: "Volver al roadmap" / "Comenzar".
        
    - Si cancela 3 veces seguidas, la próxima vez la mascota muestra mensaje de ánimo.
        
- **Reglas:**
    
    - 10 preguntas adaptativas: 40% de puntos débiles, 40% contenido actual, 20% integración (spaced repetition de cursos previos).
        
    - Timer global 15:00 (MM:SS). A 2 minutos restantes, parpadeo rojo y tick-tock cada 10s.
        
    - Navegación: flechas laterales o comandos de voz. Se permite cambiar respuestas mientras no se entregue.
        
    - **Anti-trampa:** Si `document.visibilityState === 'hidden'` por más de 5 segundos, se marca `suspicious_activity=true` y se notifica al docente. Se muestra warning al usuario: "No cambies de pestaña durante el examen."
        
- **Entrega:** Botón "Entregar" habilitado solo tras responder todas. Auto-entrega al llegar a 0:00.
    
- **Procesamiento:** Pantalla de carga "La IA está evaluando..." (mínimo 2s forzados).
    

### 2.6.4 Examen Final — Coliseo de Retos (Pantalla #13)

- **URL:** `/courses/:courseId/coliseo`
    
- **Desbloqueo:** Requiere TODOS los nodos teóricos completados + TODOS los quizzes intermedios >= 70% + Sincronía >= 60%.
    
- **Estructura:**
    
    - 20 preguntas integradoras en un caso práctico narrativo continuo.
        
    - Duración: 30 minutos. NO se puede pausar.
        
    - Dificultad adaptativa: Si acierta las primeras 5, la IA aumenta complejidad léxica y conceptual. Si falla, mantiene nivel pero cambia enfoque.
        
    - **Sistema de vidas visuales:** 3 corazones. Cada error pierde uno. Si se pierden todos, score máximo posible = 60%.
        
- **Ceremonia de finalización:**
    
    - > = 80%: Pantalla fullscreen "¡MAESTRÍA LOGRADA!". Trofeo dorado animado (CSS 3D rotate), confeti, música de victoria (Web Audio). Medalla dinámica SVG con nombre: "Maestro de [Tema]". Vibración compleja `[100,50,100,50,100,200]`.
        
    - 70-79%: "¡APROBADO!" Medalla de plata. Recomendación de repaso de 2 subtemas específicos.
        
    - < 70%: "Aún no estás listo". NO avanza al siguiente tema. Se desbloquea "Modo Entrenamiento Especial" (5 micro-lecciones generadas sobre debilidades detectadas). Cooldown de 4 horas para reintentar.
        

## 2.7 Módulo: Retroalimentación cognitiva y refuerzo multifuente

### 2.7.1 Pantalla de Corrección Cognitiva (Pantalla #14)

- **URL:** `/courses/:courseId/nodes/:nodeId/review`
    
- Se accede tras completar un test/examen, o al repasar errores.
    
- **Estructura por pregunta fallida:**
    
    1. "Tu respuesta:" Texto exacto del usuario resaltado en rojo suave.
        
    2. "Análisis de la IA:" Párrafo generado identificando el concepto erróneo específico. Ej: "Parece que confundiste 'velocidad' con 'rapidez'. Recuerda: la velocidad es un vector..."
        
    3. "Explicación correcta:" Paso a paso, citando el material de clase original (con link al chunk fuente).
        
    4. Botones: "¡Entendido!" (verde, cierra sección) / "Aún no entiendo" (naranja, activa refuerzo).
        
- Si el usuario permanece > 20s sin interactuar, la mascota aparece con tooltip: "¿Te quedó claro? Puedo explicarlo de otra forma."
    

### 2.7.2 Hub de Refuerzo Multifuente (Pantalla #15)

- Se accede al presionar "Aún no entiendo".
    
- **Sección 1 — Analogía IA:**
    
    - Dropdown de estilos: "Explicación estándar", "Como si tuviera 5 años", "Con videojuegos", "Con cocina", "Con deportes", "Con memes".
        
    - La IA regenera la explicación en < 3 segundos (loading skeleton mientras tanto).
        
- **Sección 2 — Fuentes externas curadas:**
    
    - Agente de búsqueda interno sobre base de videos prevalidados por docentes.
        
    - Máximo 3 resultados: thumbnail de video, título, duración, timestamp exacto (ej. "02:15 – 04:30"). Al click, abre modal con reproductor embebido (iframe lazy-loaded).
        
    - Artículos simplificados (máx. 5 min lectura).
        
- **Sección 3 — Práctica guiada:**
    
    - Mini-ejercicio interactivo paso a paso sobre el concepto específico.
        
- **Tracking:** Cada "Aún no entiendo" incrementa el nivel de confusión del concepto. Si llega a 3, se genera alerta automática en el panel del docente.
    

## 2.8 Módulo: Gamificación y progreso

### 2.8.1 Sistema de Medallas Dinámicas

- Las medallas son SVGs generados dinámicamente con: nombre del estudiante, fecha, ícono vectorial, color según rareza (Común `#9CA3AF`, Rara `#3B82F6`, Épica `#8B5CF6`, Legendaria `#F59E0B`).
    
- **Categorías:**
    
    - **Comportamentales:** "Explorador Curioso" (tocar 5 palabras interactivas), "Persistente" (superar nodo tras 3 intentos), "Veloz" (test en < 50% tiempo), "Nocturno" (estudiar después de las 10pm – humorístico).
        
    - **De Maestría:** "Aprendiz de [Tema]" (completar 50%), "Maestro de [Tema]" (Coliseo >= 80%), "Coliseo Victorioso" (primera vez sin reintentos).
        
    - **Secretas:** Desbloqueadas por acciones no documentadas (ej. completar un test con 100% en < 3 minutos).
        
- **Ceremonia de desbloqueo:** Modal fullscreen interrumpe el flujo. Medalla rota 360° (CSS transform, 1.5s). TTS lee el nombre y descripción si accesibilidad está activa.
    

### 2.8.2 Pantalla de Logros (Pantalla #16)

- **URL:** `/achievements`
    
- Grid responsive (2 cols mobile, 4 tablet, 6 desktop).
    
- Medallas obtenidas: color completo, brillante.
    
- Medallas no obtenidas: silueta gris, candado overlay. Hover/click muestra hint de cómo desbloquear.
    
- **Filtros:** "Todas", "Maestría", "Comportamiento", "Secretas".
    
- **Stats superiores:** Total medallas, racha de días consecutivos (contador que incrementa al estudiar > 15 minutos en un día), XP total.
    

### 2.8.3 Mascotas y Personalización

- **3 mascotas base:** Dragón (fuego), Robot (tecnología), Búho (sabiduría).
    
- **Evolución por niveles de XP:**
    
    - Nivel 1 (0-500 XP): Bebé.
        
    - Nivel 2 (501-1500): Juvenil, nuevos colores.
        
    - Nivel 3 (1501+): Final, aura CSS (box-shadow animado), animaciones adicionales.
        
- En `/profile`, el usuario puede: cambiar nombre de mascota (máx. 12 chars), seleccionar accesorios desbloqueados (gorro, gafas, capa), cambiar mascota base (conservando XP).
    
- **Estados emocionales de la mascota** (afectan animación CSS):
    
    - Normal: idle flotante.
        
    - Eufórica (3 días estudiando): saltos rápidos.
        
    - Triste (48h sin entrar): cabeza gacha, opacidad reducida.
        
    - Preocupada (test fallido): manos en la cara.
        

## 2.9 Módulo: Accesibilidad web total (WCAG 2.1 AA)

### 2.9.1 Navegación por Voz Hands-Free (Web Speech API)

- **FAB de micrófono flotante** (posición fixed, bottom: 24px, right: 24px, z-index: 50). Estado visual: idle (gris), escuchando (pulsación roja + ondas CSS), procesando (spinner).
    
- **Comandos globales** (disponibles en cualquier pantalla):
    
    - "Ir al dashboard" → navega.
        
    - "Ir al curso [nombre]" → fuzzy matching, navega si encuentra.
        
    - "Ir al cuestionario" → abre quiz pendiente del contexto.
        
    - "Explícame esto de otra forma" → activa refuerzo.
        
    - "Pausar" / "Continuar" → controla timers y TTS.
        
    - "Leer pantalla" → Web Speech API TTS lee todo el contenido textual visible en orden DOM.
        
    - "Ayuda" → mascota enumera comandos disponibles para pantalla actual.
        
- **Modo Guía** (comando "Activar guía"):
    
    - Overlay semitransparente indica "Modo Guía Activo".
        
    - Navegación por voz como cursor virtual: "Siguiente" / "Anterior" mueve foco entre elementos interactivos. El enfocado recibe `outline: 3px solid #F59E0B` y `scrollIntoView({behavior:'smooth', block:'center'})`.
        
    - "Seleccionar" activa el elemento enfocado.
        

### 2.9.2 Narración Espacial en Roadmap (Accesibilidad Visual)

- Cuando un usuario con screen reader entra al roadmap, el sistema **NO** describe una imagen. Expone una estructura semántica:
    
    - Lista ordenada (`<ol>`) de nodos con `aria-label` descriptivo: "Nodo 1: Introducción a la Fotosíntesis. Tipo: Teoría. Estado: Completado."
        
    - El nodo actual tiene `aria-current="step"`.
        
- **Comandos de voz específicos:** "Ir al siguiente nodo", "Ir al nodo [nombre]", "Estado del camino" (lee progreso y próximo desafío).
    

### 2.9.3 Refactorización Cognitiva Automática

- Si el estudiante comete 2 errores seguidos en una evaluación Y tiene activado modo accesibilidad o bajo desempeño histórico:
    
    - La siguiente pregunta reduce complejidad léxica (sinónimos simples vía IA en tiempo real).
        
    - Tiempo límite +25%.
        
    - Pista auditiva previa: "Esta pregunta trata sobre [tema]".
        
- Se desactiva automáticamente si el score mejora en la siguiente pregunta.
    

### 2.9.4 Alto Contraste y Teclado

- Cumplimiento WCAG 2.1 AA: contraste mínimo 4.5:1 texto normal, 3:1 texto grande/UI components.
    
- Navegación 100% por teclado: Tab order lógico, foco visible siempre, skip link "Ir al contenido principal".
    
- No usar color como único indicador: errores tienen ícono X + texto + color; aciertos tienen check + texto + color.
    
- Respetar `prefers-reduced-motion`: si está activo, eliminar confeti, pulso de nodos, y máquina de escribir (texto aparece completo inmediatamente).
    

## 2.10 Módulo: Panel de tutores/padres

### 2.10.1 Dashboard del Padre (Pantalla #17)

- **URL:** `/parent/dashboard`
    
- **Layout:** Similar al estudiante pero en modo read-only.
    
- **Sección "Mis Vinculados":** Cards por cada estudiante vinculado. Muestra: nombre, avatar, curso en progreso, sincronía actual, última actividad ("Hace 2 horas" / "Hace 3 días").
    
- **Sección "Alertas":** Notificaciones de riesgo: "[Nombre] tiene dificultades persistentes en Fotosíntesis", "[Nombre] no ha estudiado en 5 días".
    
- **Sección "Resumen semanal":** Gráfico de barras con minutos de estudio por día (últimos 7 días).
    

### 2.10.2 Detalle del Estudiante Vinculado (Pantalla #18)

- **URL:** `/parent/students/:studentId`
    
- **Tabs:**
    
    - **"Progreso":** Lista de cursos inscritos con barras de progreso.
        
    - **"Medallas":** Grid de medallas obtenidas (solo lectura).
        
    - **"Dificultades":** Top 5 conceptos con errores acumulados, con links a recursos recomendados (solo lectura).
        
    - **"Tiempo de estudio":** Gráfico de líneas, filtrable por semana/mes.
        
- **Botón "Generar informe PDF":** Descarga informe completo del progreso del hijo/a.
    
- **NO puede:** responder por el estudiante, modificar progreso, ni acceder a evaluaciones en tiempo real.
    

### 2.10.3 Configuración de Notificaciones del Padre

- Toggle por email: Reporte semanal automático, alertas de inactividad (> 3 días), alertas de dificultades persistentes.
    
- Toggle por in-app (si el padre usa la plataforma): mismas opciones.
    

# 3. Casos de uso

### CU 01: Exploración de Contenidos en Grafo Dinámico

- **Actor:** Estudiante.
    
- **Precondición:** Estudiante autenticado, inscrito en al menos un curso publicado.
    
- **Flujo principal:**
    
    1. Estudiante accede a `/dashboard` y hace click en card de curso.
        
    2. Sistema renderiza `/courses/:courseId/roadmap` con SVG del camino serpiente.
        
    3. Estudiante hace scroll (mobile) o pan con mouse (desktop) para explorar nodos.
        
    4. Estudiante hace hover/click en nodo disponible. El nodo emite feedback visual (pulse) y háptico si Vibration API disponible.
        
    5. Estudiante hace click en nodo actual. Sistema ejecuta transición zoom y navega a la pantalla del nodo según su tipo.
        
    6. La IA adapta complejidad del texto del nodo según matriz de debilidades previa.
        
- **Flujo alternativo A — Accesibilidad visual:** El estudiante dice "Activar guía". El TTS narra: "Estás en el camino de Biología. Tu posición es el nodo 3: La Célula. Adelante tienes un Quiz. Di 'ir al siguiente nodo' para continuar."
    
- **Flujo alternativo B — Nodo bloqueado:** El estudiante intenta click en nodo bloqueado. Sistema ejecuta shake animation, muestra tooltip de mascota, y reproduce sonido de error.
    

### CU 02: Evaluación Adaptativa y Corrección por IA

- **Actor:** Estudiante / Sistema IA.
    
- **Precondición:** Estudiante ha completado al menos 80% de la lectura de un nodo teórico.
    
- **Flujo principal:**
    
    1. Estudiante hace click en "Ir al cuestionario".
        
    2. Sistema genera 3-5 preguntas vía LLM, priorizando conceptos con errores previos.
        
    3. Estudiante responde vía click o voz (Web Speech API).
        
    4. Si error: sistema NO muestra "Incorrecto". Muestra pantalla de Corrección Cognitiva con análisis del concepto erróneo y explicación personalizada basada en material de clase.
        
    5. Sistema actualiza matriz de debilidades y Barra de Sincronía.
        
- **Flujo alternativo — Desempeño bajo:** Si score < 40%, sistema activa vibración de advertencia (si disponible), la mascota muestra mensaje de ánimo, y se sugiere repaso obligatorio antes de reintentar.
    

### CU 03: Protocolo de Refuerzo de Aprendizaje ("Aún no entiendo")

- **Actor:** Estudiante / IA.
    
- **Precondición:** Estudiante ha visto la corrección de una pregunta y presiona "Aún no entiendo".
    
- **Flujo principal:**
    
    1. Sistema presenta Hub de Refuerzo con 3 secciones: Analogía IA, Fuentes externas, Práctica guiada.
        
    2. Estudiante selecciona estilo de analogía (ej. "Como si tuviera 5 años"). IA regenera explicación en < 3s.
        
    3. Estudiante ve video recomendado con timestamp exacto. Al click, modal con reproductor.
        
    4. Sistema incrementa nivel de confusión del concepto.
        
    5. Si nivel de confusión >= 3, sistema genera alerta en panel del docente.
        
- **Flujo alternativo — Entendimiento:** Estudiante presiona "¡Entendido!". Sistema cierra hub, registra éxito de refuerzo, y reduce peso de ese concepto en futuras evaluaciones.
    

### CU 04: Reto de Maestría y Gamificación (Coliseo de Retos)

- **Actor:** Estudiante.
    
- **Precondición:** Todos los nodos teóricos del curso completados, quizzes >= 70%, sincronía >= 60%.
    
- **Flujo principal:**
    
    1. Estudiante hace click en nodo Jefe (rojo/dorado) del roadmap.
        
    2. Sistema muestra pantalla de acceso al Coliseo con animación épica.
        
    3. Estudiante confirma "Comenzar". Sistema inicia examen de 20 preguntas, 30 min, caso práctico integrador.
        
    4. Estudiante responde secuencialmente. La IA adapta dificultad en tiempo real.
        
    5. Al entregar, sistema procesa con pantalla de carga de 2s mínimo.
        
    6. Si >= 80%: pantalla Maestría Lograda, medalla SVG dinámica generada con nombre del estudiante y fecha, confeti, vibración compleja.
        
- **Flujo alternativo — Fallo:** Si < 70%, sistema desbloquea Modo Entrenamiento Especial y bloquea reintento por 4 horas.
    

### CU 05: Navegación de Accesibilidad Multimodal

- **Actor:** Estudiante con discapacidad visual o motriz.
    
- **Precondición:** Modo accesibilidad activado en perfil o detectado por `prefers-reduced-motion` + screen reader.
    
- **Flujo principal:**
    
    1. Estudiante dice "Activar guía" o presiona shortcut de teclado (Alt + G).
        
    2. Sistema activa Modo Guía: overlay visible, TTS describe pantalla actual.
        
    3. Estudiante navega con "Siguiente" / "Anterior" por elementos interactivos. Cada elemento enfocado se anuncia y se desplaza al centro de viewport.
        
    4. En roadmap, TTS describe estructura como lista semántica, no como imagen.
        
    5. Estudiante selecciona opciones con voz ("Abrir cuestionario") o teclado (Enter).
        
    6. Ante errores, sistema simplifica lenguaje automáticamente.
        
- **Flujo alternativo — Sin micrófono:** Navegación 100% por teclado con Tab/Shift+Tab, Enter, y atajos (Alt + 1 para dashboard, Alt + 2 para roadmap, etc.).
    

### CU 06: Creación de Curso por Docente

- **Actor:** Docente.
    
- **Precondición:** Docente autenticado con rol teacher.
    
- **Flujo principal:**
    
    1. Docente accede a `/teacher/dashboard` y hace click en "+ Crear nuevo curso".
        
    2. Completa título, descripción, categoría, nivel.
        
    3. Sube material fuente (PDFs, URLs) en zona de drag-and-drop.
        
    4. Sistema procesa material: extracción de texto, chunking, embeddings.
        
    5. Docente hace click en "Generar Roadmap". Sistema envía material a LLM y recibe estructura de nodos.
        
    6. Docente revisa roadmap visual, edita títulos, cambia tipos de nodos, aprueba o regenera.
        
    7. Docente ajusta slider de rigor pedagógico.
        
    8. Docente hace click en "Publicar". Sistema cambia estado a published y genera token de invitación.
        
    9. Docente copia enlace o código QR y lo comparte con estudiantes.
        
- **Flujo alternativo — Material insuficiente:** Si el material subido tiene < 500 palabras procesables, sistema muestra error: "Material insuficiente para generar un roadmap robusto. Sube más contenido."
    

### CU 07: Vinculación Padre-Estudiante

- **Actor:** Padre / Estudiante.
    
- **Precondición:** Ambos tienen cuentas verificadas.
    
- **Flujo principal:**
    
    1. Padre accede a `/parent/dashboard` y hace click en "Vincular estudiante".
        
    2. Padre ingresa email del estudiante o código de 6 dígitos generado por el estudiante en `/profile`.
        
    3. Sistema envía notificación in-app al estudiante: "[Nombre del padre] quiere vincularse para ver tu progreso. ¿Aceptar?"
        
    4. Estudiante acepta. Sistema crea relación parent-student.
        
    5. Padre ve dashboard read-only del estudiante.
        
- **Flujo alternativo — Rechazo:** Estudiante rechaza vinculación. Padre recibe notificación: "El estudiante rechazó la vinculación."
    

### CU 08: Supervisión y Alertas del Docente

- **Actor:** Docente.
    
- **Precondición:** Curso publicado con estudiantes inscritos.
    
- **Flujo principal:**
    
    1. Docente accede a `/teacher/courses/:courseId/students`.
        
    2. Sistema muestra tabla con filtros y alertas automáticas.
        
    3. Docente ve alerta roja en estudiante Juan: "Dificultad persistente: Fotosíntesis (confusión nivel: 4)".
        
    4. Docente hace click en "Ver detalle". Drawer lateral muestra matriz de debilidades, gráfico temporal, y veces que presionó "Aún no entiendo".
        
    5. Docente hace click en "Generar informe PDF". Sistema genera PDF con gráficos y lo descarga.
        
    6. Docente hace click en "Enviar mensaje" (fase 2) o "Ajustar contenido" para regenerar material de refuerzo.
        

# 4. Requerimientos no funcionales de la interfaz

### 4.1 Rendimiento Visual

- **First Contentful Paint (FCP)** < 1.5s en 4G.
    
- **Time to Interactive (TTI)** < 3.5s.
    
- El roadmap SVG debe mantener 60fps con hasta 50 nodos (GPU-accelerated transforms).
    
- **Lazy loading** obligatorio para imágenes, videos, y chunks de contenido IA.
    

### 4.2 Seguridad en Cliente

- Todas las respuestas de IA deben ser sanitizadas (DOMPurify) antes de renderizar en frontend.
    
- Datos de menores de edad: cifrado en reposo local, consentimiento parental verificable.
    

### 4.3 Disponibilidad y Escalabilidad Visual

- CDN para assets estáticos.
    
- Arquitectura de caché local para contenido frecuente.
    

### 4.4 Accesibilidad

- Cumplimiento **WCAG 2.1 AA** obligatorio en todas las pantallas.
    
- Audit automático con axe-core en CI/CD.
    
- Soporte para screen readers NVDA, JAWS, VoiceOver.
    

### 4.5 Internacionalización (i18n)

- Estructura preparada para i18n. Idioma inicial: Español. Claves de traducción en JSON.
    
- Fechas, monedas y números localizados con Intl API.
    

# 5. Mapeo de requerimientos funcionales (RF)

### 5.1 Tabla de requerimientos funcionales

|**Código**|**Requerimiento Funcional (Interfaz)**|**Sección**|
|---|---|---|
|**RF-01**|Pantalla de Login con validaciones visuales, OAuth y accesibilidad|2.1.1|
|**RF-02**|Wizard de Registro por rol (Estudiante/Docente/Padre) con OTP|2.1.2|
|**RF-03**|Onboarding de accesibilidad, avatar y mascota (Estudiante)|2.1.3|
|**RF-04**|Flujo de recuperación de contraseña por link mágico|2.1.4|
|**RF-05**|Dashboard Docente con cursos, alertas y gráficos de analytics|2.2.1|
|**RF-06**|Wizard de creación/edición de curso (info, material, roadmap IA)|2.2.2|
|**RF-07**|Tabla de estudiantes con filtros, drawer de detalle e invitación|2.2.3|
|**RF-08**|Revisión lado-a-lado de contenido IA con slider de rigor|2.2.4|
|**RF-09**|Dashboard Estudiante con saludo dinámico, cursos y retos|2.3.1|
|**RF-10**|Inscripción a curso por código o catálogo público|2.3.2|
|**RF-11**|Roadmap interactivo (SVG/Canvas) con pan, zoom y estados de nodos|2.4.1|
|**RF-12**|Interacción táctil/mouse con nodos (shake, zoom, tooltips)|2.4.2|
|**RF-13**|Barra de Sincronía visual con fórmula y celebración por nivel|2.4.3|
|**RF-14**|Lección teórica con efecto máquina de escribir y palabras interactivas|2.5.1|
|**RF-15**|Cálculo visual de progreso de lectura y transición al cuestionario|2.5.2|
|**RF-16**|Micro-Quiz con timer, tipos de pregunta y respuesta por voz|2.6.1|
|**RF-17**|Pantalla de resultados del quiz con rutas de repaso o continuar|2.6.2|
|**RF-18**|Test de Unidad con modal de confirmación, timer global y anti-trampa visual|2.6.3|
|**RF-19**|Coliseo de Retos con vidas, dificultad adaptativa y ceremonia de finalización|2.6.4|
|**RF-20**|Pantalla de Corrección Cognitiva con análisis de errores|2.7.1|
|**RF-21**|Hub de Refuerzo Multifuente (analogías, videos, práctica guiada)|2.7.2|
|**RF-22**|Sistema de Medallas Dinámicas (SVG) con rareza y ceremonia|2.8.1|
|**RF-23**|Pantalla de Logros con grid, filtros y estadísticas|2.8.2|
|**RF-24**|Mascotas evolutivas con estados emocionales y personalización|2.8.3|
|**RF-25**|Navegación por voz hands-free con FAB y comandos globales|2.9.1|
|**RF-26**|Narración espacial del roadmap para screen readers|2.9.2|
|**RF-27**|Refactorización cognitiva automática en evaluaciones|2.9.3|
|**RF-28**|Cumplimiento WCAG 2.1 AA (contraste, teclado, reduced-motion)|2.9.4|
|**RF-29**|Dashboard Padre en modo solo-lectura con vinculados y alertas|2.10.1|
|**RF-30**|Detalle del estudiante vinculado (tabs de progreso, medallas, dificultades)|2.10.2|
|**RF-31**|Configuración de notificaciones del padre (email/in-app)|2.10.3|

### 5.2 Mapeo

|**Requerimiento**|**Casos de Uso donde se aplica**|
|---|---|
|**RF-01** Login|— (Flujo transversal previo a todos los CU)|
|**RF-02** Registro|CU-07|
|**RF-03** Onboarding Estudiante|— (Flujo previo a CU-01~05)|
|**RF-04** Recuperación de Contraseña|— (Flujo alternativo de auth)|
|**RF-05** Dashboard Docente|CU-06, CU-08|
|**RF-06** Creación de Curso|CU-06|
|**RF-07** Gestión de Estudiantes|CU-08|
|**RF-08** Revisión de Contenido IA|CU-06, CU-08|
|**RF-09** Dashboard Estudiante|CU-01|
|**RF-10** Inscripción a Curso|CU-01|
|**RF-11** Roadmap|CU-01, CU-04|
|**RF-12** Interacción con Nodos|CU-01|
|**RF-13** Barra de Sincronía|CU-01|
|**RF-14** Lección Teórica|CU-01, CU-02|
|**RF-15** Progreso de Lectura|CU-02|
|**RF-16** Micro-Quiz|CU-02|
|**RF-17** Fin de Micro-Quiz|CU-02|
|**RF-18** Test de Unidad|CU-02|
|**RF-19** Coliseo de Retos|CU-04|
|**RF-20** Corrección Cognitiva|CU-02, CU-03|
|**RF-21** Hub de Refuerzo|CU-03|
|**RF-22** Medallas Dinámicas|CU-04|
|**RF-23** Pantalla de Logros|CU-04|
|**RF-24** Mascotas|CU-04|
|**RF-25** Navegación por Voz|CU-01, CU-03, CU-05|
|**RF-26** Narración Espacial Roadmap|CU-01, CU-05|
|**RF-27** Refactorización Cognitiva|CU-02, CU-05|
|**RF-28** Accesibilidad WCAG|CU-01, CU-02, CU-05|
|**RF-29** Dashboard Padre|CU-07|
|**RF-30** Detalle Estudiante (Padre)|CU-07|
|**RF-31** Config. Notificaciones Padre|— (Configuración transversal)|

# 6. Pantallas requeridas

|**#**|**Nombre**|**URL**|**Rol**|**Módulo**|
|---|---|---|---|---|
|1|Login|`/login`|Todos|Auth|
|2|Registro|`/register`|Todos|Auth|
|3|Onboarding Estudiante|`/onboarding/student`|Student|Auth|
|4|Onboarding Docente|`/onboarding/teacher`|Teacher|Auth|
|5|Dashboard Estudiante|`/dashboard`|Student|Core|
|6|Explorar Cursos|`/explore`|Student|Core|
|7|Roadmap de Curso|`/courses/:id/roadmap`|Student|Core|
|8|Lección Teórica|`/courses/:id/nodes/:nid/lesson`|Student|Core|
|9|Micro-Quiz|`/courses/:id/nodes/:nid/quiz`|Student|Core|
|10|Test de Unidad|`/courses/:id/nodes/:nid/test`|Student|Core|
|11|Coliseo de Retos|`/courses/:id/coliseo`|Student|Core|
|12|Corrección y Refuerzo|`/courses/:id/review`|Student|Core|
|13|Hub de Refuerzo Multifuente|`/courses/:id/reinforcement`|Student|Core|
|14|Logros y Medallas|`/achievements`|Student|Gamification|
|15|Perfil y Configuración|`/profile`|Todos|Core|
|16|Dashboard Docente|`/teacher/dashboard`|Teacher|Teacher Panel|
|17|Crear/Editar Curso|`/teacher/courses/create`|Teacher|Teacher Panel|
|18|Gestión de Estudiantes|`/teacher/courses/:id/students`|Teacher|Teacher Panel|
|19|Revisión de Contenido IA|`/teacher/courses/:id/content-review`|Teacher|Teacher Panel|
|20|Dashboard Padre|`/parent/dashboard`|Parent|Parent Panel|
|21|Detalle Estudiante (Padre)|`/parent/students/:id`|Parent|Parent Panel|

# 7. Análisis de sistemas y aplicaciones similares

Se ha realizado un análisis comparativo de plataformas educativas digitales que comparten dominio funcional con la presente propuesta. El objetivo es identificar patrones de interacción validados, brechas de experiencia no cubiertas y oportunidades de diferenciación en el diseño de la interfaz.

|**Plataforma**|**Dominio**|**Fortalezas detectadas**|**Brechas / Oportunidades**|
|---|---|---|---|
|**Duolingo**|Gamificación de rutas de aprendizaje|Roadmap lineal visual (árbol/skills), mascota guía (Duo), recompensas inmediatas, streaks.|La ruta es rígida; no existe detección proactiva de frustración ni adaptación emocional del tutor. No integra refuerzo multimodal (video + texto + voz) en un mismo flujo de error.|
|**Khan Academy**|Contenido teórico + práctica|Dashboard de progreso por temas, videos embebidos, ejercicios adaptativos.|La retroalimentación ante errores es genérica; carece de un "motor de refuerzo" que genere analogías alternativas automáticamente. La navegación por voz es inexistente.|
|**Quizlet / Anki**|Memorización espaciada|Tarjetas interactivas, repaso adaptativo, estudio offline.|Enfoque exclusivo en memorización; sin comprensión conceptual profunda. Sin personaje guía ni gamificación emocional.|
|**Photomath / Socratic**|Tutoría por IA|Explicaciones paso a paso, reconocimiento de imágenes/voz.|La interacción es transaccional (pregunta-respuesta); no hay un road map visual ni persistencia del estado de aprendizaje en un grafo de conocimiento.|
|**Coursera / edX**|Cursos masivos online|Estructura de módulos clara, foros, evaluaciones por unidad.|Alta carga cognitiva en la navegación. Sin adaptación en tiempo real al ritmo emocional del estudiante. Sin soporte hands-free.|
|**Kahoot! / Mentimeter**|Interacción colaborativa en aula|Gamificación en grupo, tiempo real, competencia sana.|Dependen de un docente mediador; no son sistemas autónomos de refuerzo individual. Sin accesibilidad avanzada (voz, screen reader espacial).|
|**Speechify / Voice Dream**|Accesibilidad lectora|TTS avanzado, navegación por voz, soporte para dislexia.|Son herramientas de consumo pasivo de contenido; no integran evaluación, retroalimentación cognitiva ni gamificación.|

Ninguna de las plataformas revisadas integra de forma simultánea:

1. Un **roadmap visual no lineal** (grafo/mapa) con navegación por voz y gestos.
    
2. Un **protocolo de refuerzo reactivo y proactivo** que combine analogías generadas por IA, fragmentos exactos de video y micro-desafíos de consolidación.
    
3. **Detección emocional** (tono de voz, pausas) para adaptar la interfaz y el ritmo del tutor virtual.
    
4. **Accesibilidad total multimodal** (voz, teclado, tacto, screen readers espaciales) dentro de un mismo ecosistema gamificado.
    

# 8. Criterios de usabilidad

Estos criterios actúan como aproximcacion de diseño y métricas de evaluación para cada pantalla y flujo de la interfaz.

## 8.1 Usabilidad cognitiva y pedagógica

|**ID**|**Criterio**|**Definición operativa**|**Métrica de evaluación**|
|---|---|---|---|
|**UC-01**|**Carga cognitiva reducida**|Cada pantalla debe presentar una única tarea principal visible (principio de "una cosa a la vez").|Test de pensamiento en voz alta: el usuario describe su objetivo en < 5 segundos al ver la pantalla.|
|**UC-02**|**Retroalimentación inmediata**|Toda acción del usuario (click, voz, toque) genera una respuesta visual, sonora o háptica en < 200 ms.|Medición de tiempo de respuesta de la interfaz (frontend) ante eventos de input.|
|**UC-03**|**Claridad de estado del sistema**|El estudiante debe saber en todo momento dónde está (roadmap), qué puede hacer a continuación y cuánto ha avanzado (Barra de Sincronía).|Tasa de éxito en tarea de orientación: "¿En qué nodo estás y qué falta para el siguiente?"|
|**UC-04**|**Tolerancia a errores**|Permitir deshacer o corregir sin penalización grave (ej. cambiar respuesta en test antes de entregar, recuperar sesión interrumpida).|Número de pasos para recuperarse de un error accidental.|

## 8.2 Accesibilidad multimodal

|**ID**|**Criterio**|**Definición operativa**|**Métrica de evaluación**|
|---|---|---|---|
|**AM-01**|**Equivalencia modal**|Toda función disponible por tacto/ratón debe tener equivalente por voz y por teclado.|Checklist de funciones: ¿Se puede completar el CU-01 (explorar roadmap) solo con voz? ¿Solo con teclado?|
|**AM-02**|**Screen reader espacial**|En componentes visuales no estándar (roadmap SVG), el lector de pantalla debe exponer una estructura semántica alternativa (lista ordenada, no imagen).|Auditoría con NVDA/VoiceOver: ¿El usuario entiende la secuencia de nodos sin ver la pantalla?|
|**AM-03**|**Respeto a preferencias del sistema**|La interfaz debe detectar y respetar `prefers-reduced-motion`, alto contraste y tamaño de fuente del SO.|Validación con herramientas automáticas (axe-core) + prueba manual con usuarios.|
|**AM-04**|**Input por voz robusto**|El sistema debe reconocer comandos de voz con una tasa de acierto ≥ 90 % en condiciones de ruido moderado.|Tasa de precisión del STT en pruebas de campo.|

## 8.3 Eficiencia y satisfaccion emocional

|**ID**|**Criterio**|**Definición operativa**|**Métrica de evaluación**|
|---|---|---|---|
|**ES-01**|**Eficiencia hands-free**|Un usuario experto debe poder completar un micro-quiz o solicitar refuerzo usando exclusivamente comandos de voz en un tiempo ≤ 1.5× el del modo táctil.|Comparativa de tiempo de tarea: voz vs. tacto.|
|**ES-02**|**Inmersión gamificada**|El sistema debe generar momentos de celebración (confeti, vibración, medallas) en hitos de aprendizaje para reforzar la motivación intrínseca.|Escala de satisfacción post-tarea (1-5) tras completar un nodo.|
|**ES-03**|**Empatía percibida**|El tutor virtual (mascota) y las respuestas de la IA deben ajustar su tono ante señales de frustración, transmitiendo calma y no presión.|Escala Likert: "Sentí que el sistema me entendió cuando me equivoqué".|
|**ES-04**|**Utilidad percibida del refuerzo**|Tras activar el protocolo "Aún no entiendo", el estudiante debe considerar útil el nuevo material presentado (analogía + video + micro-desafío).|Tasa de aprobación del refuerzo: % de usuarios que presionan "¡Entendido!" tras el hub.|

# 9. Alternativas de diseño propuestas en el proceso

## 9.1 Alternativa 1: Diseño base (reactivo)

Esta alternativa define un flujo de aprendizaje secuencial, donde el estudiante avanza por un roadmap predefinido y solicita ayuda de forma explícita.

### Características de interfaz clave:

- **Roadmap fijo:** El grafo de nodos (Mapa de Constelaciones) se genera una vez al crear el curso y permanece inmutable salvo por adiciones del docente al final.
    
- **Refuerzo bajo demanda:** El protocolo "Aún no entiendo" se activa únicamente tras un error en evaluación y mediante un click explícito.
    
- **Contenido externo enlazado:** Las fuentes de refuerzo (videos, artículos) se presentan como enlaces o thumbnails que redirigen o abren reproductores externos.
    
- **Interacción individual:** El estudiante interactúa solo con el sistema; no hay espacio de trabajo colaborativo.
    
- **Retroalimentación objetiva:** La IA corrige indicando el concepto erróneo, pero mantiene un tono neutral y uniforme.
    

### Fortalezas:

- Alta predictabilidad para el docente (el contenido no muta inesperadamente).
    
- Implementación de interfaz más directa (estados de nodos binarios: locked/available/completed).
    
- Control total del usuario sobre cuándo recibir ayuda.
    

### Limitaciones detectadas:

- **Fricción en el refuerzo:** El usuario debe navegar fuera del flujo principal para consumir videos externos.
    
- **Frialdad algorítmica:** La interacción se siente mecánica; la IA no detecta frustración ni duda antes de que el usuario falle.
    
- **Mapa rígido:** No se adapta a las preguntas espontáneas del estudiante ni permite exploración radial por curiosidad.
    

## 9.2 Alternativa 2: Diseño Mejorado con SCAMPER

Esta alternativa surge de aplicar las técnicas **Substitute, Combine, Adapt, Modify, Put to other uses, Eliminate y Rearrange** sobre el CU-03 (Protocolo de Refuerzo) y el CU-01 (Exploración del Mapa).

### Características de interfaz clave:

- **Detección proactiva de duda:** El sistema escucha continuamente (con consentimiento) el tono de voz, pausas largas o vacilaciones. Antes de que el usuario presione "Aún no entiendo", la mascota interviene: _"Te noto un poco inseguro en este punto, ¿quieres que intentemos una analogía diferente?"_
    
- **Tutor con personalidad adaptativa:** La IA modifica su velocidad de habla, tono y uso de sonidos ambientales relajantes según el estado emocional detectado (frustración vs. curiosidad).
    
- **Micro-Desafío de Consolidación:** Inmediatamente después de una analogía, la interfaz presenta un caso práctico simplificado que el estudiante resuelve por voz, cerrando el ciclo teórico-práctico sin salir de la pantalla.
    
- **Reproducción integrada:** Los fragmentos de video de YouTube se reproducen en un modal embebido con timestamp exacto; no hay navegación externa.
    
- **Mapa de Calor Emocional:** El panel del docente incluye una visualización de tipo heatmap que muestra qué conceptos generan más estrés en el grupo, derivado de los registros de duda y tono emocional.
    
- **Modo Colaborativo (Combine):** Los estudiantes pueden unirse a una sesión compartida donde el mapa de conocimiento se construye radialmente a partir de las preguntas del grupo, no de un temario fijo.