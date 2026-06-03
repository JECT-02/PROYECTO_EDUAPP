# Instrucciones DB — EduApp / Supabase

Pasos simples para cuando termine la espera del circuit breaker (~30 min).

---

## 1. Verificar que el bloqueo del pooler se levantó

```powershell
# Cargar el token del .env y probar conexión al pooler
$env:SUPABASE_ACCESS_TOKEN = (Get-Content -LiteralPath ".env" | Where-Object { $_ -match '^SUPABASE_ACCESS_TOKEN=' } | Select-Object -First 1).Substring(22)
npx supabase migration list --linked
```

Si responde sin `ECIRCUITBREAKER` → seguimos en el paso 2.
Si sigue bloqueado → esperar otros 15 min y reintentar.

---

## 2. Empujar las migraciones a la nube

```powershell
npx supabase db push
```

Debería aplicar las 2 migraciones que ya están en `supabase/migrations/`:
- `20260602200820_init.sql` (tablas base + RLS + storage)
- `20260602200821_rag_vector.sql` (documents + match_documents + HNSW)

Confirmar al final:
```powershell
npx supabase migration list --linked
# debe mostrar las 2 con check verde (aplicadas)
```

---

## 3. Rellenar las variables del frontend en `.env`

Abrir `.env` y completar los dos campos vacíos con los valores del dashboard:
**Supabase Dashboard → Project Settings → API**

```
VITE_SUPABASE_URL=https://oodijhbtgomlrchrvwzu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

> El `SUPABASE_ACCESS_TOKEN` ya está bien, no tocar.

---

## 4. Verificar que el schema quedó aplicado

Dashboard → **Table Editor** → confirmar que existen las tablas:
`profiles`, `courses`, `nodes`, `enrollments`, `progress`,
`source_files`, `documents`, `weaknesses`, `medals`,
`notifications`, `parent_links`.

Dashboard → **Database → Extensions** → confirmar que `vector` está **enabled**.

---

## 5. Listo

Con eso el backend queda funcional. Siguiente paso sería:
- Crear un usuario de prueba desde el dashboard (Auth → Users)
- Verificar que se le cree un row en `profiles` automáticamente
- Conectar el frontend (`src/lib/supabase.js`)

---

## Si `db push` sigue fallando después de 30 min

Plan B: aplicar el schema a mano.
1. Abrir **Supabase Dashboard → SQL Editor → New query**
2. Pegar el contenido de `supabase/migrations/20260602200820_init.sql` → Run
3. Nueva query → pegar el contenido de `20260602200821_rag_vector.sql` → Run
4. Listo. Después correr `npx supabase db pull` para sincronizar el estado local.
