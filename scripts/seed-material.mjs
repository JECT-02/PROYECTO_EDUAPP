// scripts/seed-material.mjs
// Inserta un documento de prueba en `documents` para que el chat RAG tenga material.
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const envPath = path.resolve(__dirname, '..', '.env')
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const TEXT = `La célula es la unidad estructural y funcional básica de todos los seres vivos. Existen dos grandes tipos: procariotas y eucariotas.
La célula eucariota tiene un núcleo definido donde se almacena el material genético (ADN). Dentro de ella encontramos varios orgánulos:
- Mitocondria: central energética de la célula. Realiza la respiración celular para producir ATP.
- Núcleo: contiene el ADN y dirige las actividades celulares.
- Retículo endoplásmico: participa en la síntesis de proteínas (RE rugoso) y lípidos (RE liso).
- Aparato de Golgi: modifica, empaca y distribuye proteínas y lípidos.
- Lisosomas: contienen enzimas digestivas que descomponen materiales.
- Ribosomas: sintetizan proteínas, pueden estar libres o adheridos al RE.
- Citoesqueleto: da forma y soporte a la célula, permite el movimiento.
La membrana plasmática es una bicapa lipídica con proteínas que regula el paso de sustancias.
La célula se reproduce por mitosis (células somáticas) o meiosis (células sexuales).`

const { data: course } = await admin.from('courses').select('id').eq('invite_code', 'DEMO01').single()
if (!course) { console.error('Curso demo no existe'); process.exit(1) }

// Insertamos un document de prueba (sin embedding real; el chat lo recuperará por texto en el RAG)
const { data, error } = await admin.from('documents').insert({
  course_id: course.id,
  chunk_index: 0,
  content: TEXT,
  embedding: null, // no se usará para búsqueda (el RAG matchea por embedding)
  metadata: { kind: 'seed', original_name: 'biologia-celular.txt' },
})
if (error) { console.error('Error:', error.message); process.exit(1) }
console.log('✓ Documento de prueba insertado:', data)
