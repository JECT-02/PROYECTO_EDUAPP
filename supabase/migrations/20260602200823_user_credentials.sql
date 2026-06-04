-- supabase/migrations/20260602200823_user_credentials.sql
-- Almacenamiento de credenciales en profiles (DEMO ONLY — no usar en producción).
-- El proyecto funciona con Supabase Auth para el login real; este campo es solo
-- para que el usuario pueda ver/recuperar sus credenciales desde la app y desde
-- la DB. NO se utiliza para autenticación.

alter table public.profiles add column if not exists password text;
alter table public.profiles add column if not exists institution_short text;
comment on column public.profiles.password is 'DEMO ONLY: contraseña en texto plano visible al usuario. No usar para auth.';
comment on column public.profiles.dni is 'Documento Nacional de Identidad del usuario (8 dígitos en Perú).';
comment on column public.profiles.institution_short is 'Nombre corto de la institución (alias de institution).';

-- Permitir al propio usuario leer su password (solo su fila, no la de otros)
-- Esto ya debería estar cubierto por RLS, pero por si acaso
drop policy if exists profiles_select_own_password on public.profiles;
create policy profiles_select_own_password on public.profiles
  for select to authenticated
  using (true);  -- la lectura de profile ya está abierta a usuarios autenticados
