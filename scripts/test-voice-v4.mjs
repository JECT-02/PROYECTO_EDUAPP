const BACKEND = 'http://localhost:3001'; const KEY = 'eduapp-dev-key'
async function post(e,b){const r=await fetch(BACKEND+e,{method:'POST',headers:{'Content-Type':'application/json','X-API-Key':KEY},body:JSON.stringify(b)});return r.json()}
const tests=[
 {t:'que opciones tengo',c:{page:'dashboard',courses:['Python']}},
 {t:'que puedo hacer',c:{page:'lesson',courseTitle:'Python',nodeTitle:'Variables'}},
 {t:'opciones disponibles',c:{page:'quiz',options:['Rojo','Azul','Verde'],nodeTitle:'Color'}},
 {t:'que acciones hay aqui',c:{page:'roadmap',courseTitle:'Python',nodePosition:3,totalNodes:8}},
]
async function main(){
 const h=await fetch(BACKEND+'/api/health',{headers:{'X-API-Key':KEY}}).then(r=>r.json())
 console.log('Backend:',h.status,'\n')
 let ok=0
 for(const x of tests){
  try{const r=await post('/api/voice/categorize',{transcript:x.t,context:x.c});console.log('  [OK] "'+x.t+'" ('+x.c.page+') -> '+r.category+'/'+r.action);ok++}catch(e){console.log('  [FAIL] "'+x.t+'" -> '+e.message)}
 }
 console.log('\n'+ok+'/'+tests.length+' passed')
}
main().catch(e=>console.error(e.message))
