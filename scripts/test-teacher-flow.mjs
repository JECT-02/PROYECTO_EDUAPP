// scripts/test-teacher-flow.mjs
// Simula el flujo completo del docente: crear curso + subir archivo + generar roadmap
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env
const envPath = path.resolve(__dirname, '..', '.env')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
const PDF_PATH = path.resolve(__dirname, '..', 'vui_sesion01.pdf')

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } })

async function main() {
  console.log('=== SIMULACIÓN: FLUJO COMPLETO DOCENTE ===\n')

  // 1. Login como teacher
  console.log('[1/5] Iniciando sesión como docente...')
  const { data: login, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'default_teacher@eduapp.test',
    password: 'teacher123',
  })
  if (loginErr) {
    console.error('  ERROR login:', loginErr.message)
    console.log('  Intentando crear usuario teacher...')
    const { data: newUser, error: signUpErr } = await supabase.auth.signUp({
      email: 'default_teacher@eduapp.test',
      password: 'teacher123',
      options: { data: { role: 'teacher', full_name: 'Docente Demo' } }
    })
    if (signUpErr) { console.error('  ERROR signup:', signUpErr.message); process.exit(1) }
    console.log('  Usuario creado, intentando login otra vez...')
    const { data: login2 } = await supabase.auth.signInWithPassword({
      email: 'default_teacher@eduapp.test', password: 'teacher123'
    })
    if (!login2?.session) { console.error('  No se pudo autenticar'); process.exit(1) }
    login = login2
  }
  const token = login.session.access_token
  console.log(`  ✓ Autenticado como ${login.user.email} (${login.user.id.slice(0, 8)}...)`)

  // 2. Crear curso
  console.log('\n[2/5] Creando curso "ejemplo"...')
  const coursePayload = {
    teacher_id: login.user.id,
    title: 'ejemplo',
    description: 'Curso de ejemplo para probar la generación de roadmap con IA usando el documento VUI Sesión 1',
    category: 'Prueba',
    level: '18+',
    status: 'draft',
    rigor: 3,
    invite_code: 'EJ' + String(Date.now()).slice(-6),
  }
  const { data: course, error: courseErr } = await supabase
    .from('courses')
    .insert(coursePayload)
    .select()
    .single()
  if (courseErr) { console.error('  ERROR crear curso:', courseErr.message); process.exit(1) }
  console.log(`  ✓ Curso creado: ${course.id} (invite: ${course.invite_code})`)

  // 3. Subir PDF como archivo de referencia
  console.log('\n[3/5] Subiendo vui_sesion01.pdf como referencia...')
  if (!fs.existsSync(PDF_PATH)) {
    console.warn('  ⚠ PDF no encontrado en:', PDF_PATH)
    console.log('   Continuando sin archivo de referencia...')
  } else {
    const pdfBuf = fs.readFileSync(PDF_PATH)
    const content = pdfBuf.toString('base64')
    const uploadRes = await fetch(`${SUPABASE_URL}/functions/v1/upload-source`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        courseId: course.id,
        filename: 'vui_sesion01.pdf',
        content,
      }),
    })
    if (!uploadRes.ok) {
      const errText = await uploadRes.text()
      console.error(`  ERROR subiendo archivo: ${uploadRes.status} ${errText.slice(0, 200)}`)
      console.log('  Continuando sin archivo de referencia...')
    } else {
      const uploadData = await uploadRes.json()
      console.log(`  ✓ Archivo subido: ${uploadData.id} → ${uploadData.storage_path}`)
    }
  }

  // 4. Generar roadmap vía NVIDIA API directo (como hace el frontend: generateRoadmapDirect)
  console.log('\n[4/5] Generando roadmap via NVIDIA API directo...')
  console.log('  (Equivalente a: generateRoadmapDirect() desde CourseCreateModal)\n')

  const ROADMAP_SYSTEM = `Eres un diseñador instruccional experto. Genera un roadmap de aprendizaje en formato JSON. Cada nodo incluye estructura Y contenido educativo completo.
El roadmap tiene entre 5 y 10 nodos en secuencia pedagógica.
TIPOS DE NODO:
- "theory": Lección teórica. CONTENIDO: HTML con <h2>, <p>, <strong>, <ul>/<li>. 200-400 palabras.
- "practice": Ejercicio práctico. CONTENIDO: HTML con <h2>, <p>, <div class="exercise-box">, opcional <pre><code>. 100-300 palabras.
- "quiz": Evaluación corta (máx 1 cada 3 nodos). CONTENIDO: JSON string con preguntas.
- "boss": Examen final (siempre el último). CONTENIDO: JSON string con preguntas.
- "reward": Reconocimiento (0 o 1, opcional).
REGLAS:
1. Primer nodo = "theory" (introducción). 2. Último nodo = "boss" (examen final). 3. Máx 1 quiz cada 3 nodos. 4. 5-10 nodos en total.
RESPONDE SOLO CON JSON. Sin markdown, sin texto adicional.`

  // Read file if it exists
  let fileContent = ''
  if (fs.existsSync(PDF_PATH)) {
    console.log('  Leyendo PDF para contexto...')
    // In browser this would be FileReader.readAsText, for PDFs we just note the filename
    fileContent = '[Archivo: vui_sesion01.pdf - Contenido extraíble limitado desde navegador]'
  }

  const userMsg = `Curso: ejemplo
Descripción: Curso de ejemplo para probar la generación de roadmap con IA usando el documento VUI Sesión 1
Categoría: Prueba
Nivel: 18+, rigor: 3/5.
${fileContent ? 'MATERIAL DE REFERENCIA:\n' + fileContent : '(Sin archivos de referencia)'}

Genera 5-10 nodos con contenido completo. SOLO JSON, sin markdown.`

  const nvRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + process.env.VITE_NVIDIA_API_KEY },
    body: JSON.stringify({
      model: 'moonshotai/kimi-k2.6',
      messages: [
        { role: 'system', content: ROADMAP_SYSTEM },
        { role: 'user', content: userMsg },
      ],
      temperature: 0.6,
      max_tokens: 8192,
    }),
  })
  if (!nvRes.ok) {
    console.error('  ERROR NVIDIA:', nvRes.status, await nvRes.text())
    process.exit(1)
  }
  const nvData = await nvRes.json()
  const raw = nvData.choices?.[0]?.message?.content || ''
  console.log('  ✓ NVIDIA respondió (' + raw.length + ' chars)')

  // Parse JSON from response (robust, like safeParseJson in the edge function)
  let roadmapJson
  try {
    let s = raw.trim()
    s = s.replace(/^```(?:json)?\s*/im, '').replace(/\s*```$/im, '').trim()
    const firstBrace = s.indexOf('{')
    const lastBrace = s.lastIndexOf('}')
    if (firstBrace === -1 || lastBrace <= firstBrace) throw new Error('No JSON object found')
    s = s.slice(firstBrace, lastBrace + 1)
    s = s.replace(/,\s*([}\]])/g, '$1').replace(/,\s*$/gm, '')
    roadmapJson = JSON.parse(s)
    if (roadmapJson.roadmap && Array.isArray(roadmapJson.roadmap.nodes)) {
      roadmapJson = roadmapJson.roadmap
    }
    // Post-process: enforce regulation (same as enforceRegulation in edge function)
    const nodes = roadmapJson.nodes || []
    // Assign sequential positions
    nodes.forEach((n, i) => { n.position = i + 1 })
    // Ensure last node is boss
    if (nodes.length > 0 && nodes[nodes.length - 1].type !== 'boss') {
      // Add a boss node at the end
      nodes.push({
        position: nodes.length + 1,
        type: 'boss',
        title: `Examen Final: ${roadmapJson.title || 'Curso'}`,
        description: 'Evaluación final del curso',
        content: '{"questions":[{"id":1,"text":"Pregunta de evaluación","options":["A) Opción A","B) Opción B","C) Opción C","D) Opción D"],"correct":0,"explanation":"Explicación"}]}'
      })
      console.log('  ✓ Nodo boss añadido al final')
    }
    // Ensure first node is theory
    if (nodes.length > 0 && nodes[0].type !== 'theory') {
      nodes.unshift({
        position: 1,
        type: 'theory',
        title: `Introducción a ${roadmapJson.title || 'Curso'}`,
        description: 'Bienvenida e introducción',
        content: '<h2>Bienvenido</h2><p>Introducción al curso.</p>'
      })
      nodes.forEach((n, i) => { n.position = i + 1 })
      console.log('  ✓ Nodo theory añadido al inicio')
    }
    // Fill missing descriptions
    const DESC_FALLBACK = { theory: 'Lección teórica', practice: 'Ejercicio práctico', quiz: 'Evaluación', boss: 'Examen final', reward: 'Reconocimiento' }
    for (const n of nodes) {
      if (!n.description) n.description = DESC_FALLBACK[n.type] || 'Nodo del curso'
    }
    roadmapJson.nodes = nodes
    console.log(`  ✓ JSON parseado: ${nodes.length} nodos (${nodes.filter(n=>n.content&&n.content.length>0).length} con contenido)`)
  } catch (parseErr) {
    console.error('  ERROR parseando JSON:', parseErr.message)
    console.error('  Respuesta raw (primeros 300):', raw.slice(0, 300))
    process.exit(1)
  }

  // 5. Publicar curso (como hace el frontend)
  console.log('\n[5/5] Publicando curso...')
  const { error: pubErr } = await supabase
    .from('courses')
    .update({ status: 'published' })
    .eq('id', course.id)
  if (pubErr) console.error('  ERROR publicar:', pubErr.message)
  else console.log('  ✓ Curso publicado')

  // Mostrar resultados
  console.log('\n========================================')
  console.log('RESULTADO DEL ROADMAP')
  console.log('========================================\n')
  const counts = {}
  for (const n of roadmapJson.nodes || []) {
    counts[n.type] = (counts[n.type] || 0) + 1
  }
  console.log('Distribución de tipos:')
  for (const [type, count] of Object.entries(counts)) {
    console.log(`  ${type}: ${count}`)
  }
  console.log(`\nTotal: ${roadmapJson.nodes?.length || 0} nodos\n`)

  console.log('--- Plan de nodos ---')
  for (const n of roadmapJson.nodes || []) {
    const hasContent = n.content && n.content.length > 0
    const preview = hasContent
      ? (n.content.length > 80 ? n.content.slice(0, 80) + '...' : n.content)
      : 'SIN CONTENIDO'
    console.log(`${String(n.position || n.id || '-').padStart(2)}. [${n.type.padEnd(8)}] ${n.title}`)
    console.log(`     Desc: ${(n.description || '').slice(0, 100)}`)
    console.log(`     Content: ${preview.replace(/\n/g, ' ')}`)
    console.log()
  }

  // Validar regulación
  const nodes = roadmapJson.nodes || []
  let regOK = true
  if (nodes.length > 0 && nodes[0].type !== 'theory') {
    console.error('✗ VIOLACIÓN: primer nodo debe ser theory')
    regOK = false
  }
  if (nodes.length > 0 && nodes[nodes.length - 1].type !== 'boss') {
    console.error('✗ VIOLACIÓN: último nodo debe ser boss')
    regOK = false
  }
  const quizPositions = nodes.filter(n => n.type === 'quiz').map(n => n.position)
  for (let i = 1; i < quizPositions.length; i++) {
    if (quizPositions[i] - quizPositions[i - 1] < 3) {
      console.error(`✗ VIOLACIÓN: quizzes muy cerca (pos ${quizPositions[i-1]} y ${quizPositions[i]})`)
      regOK = false
    }
  }
  console.log(regOK ? '✓ Regulación respetada' : '✗ Errores de regulación encontrados')

  // Verificar contenido completo
  const nodesWithContent = nodes.filter(n => n.content && n.content.length > 0)
  console.log(`\n✓ ${nodesWithContent.length}/${nodes.length} nodos tienen contenido completo`)
  
  // Limpieza: eliminar curso de prueba
  console.log('\n--- Limpieza ---')
  await supabase.from('nodes').delete().eq('course_id', course.id)
  await supabase.from('courses').delete().eq('id', course.id)
  console.log('Curso de prueba eliminado.')
}

main().catch(console.error)
