-- Security definer function to insert notifications bypassing RLS
-- Allows parents to notify students, teachers to notify students, etc.
create or replace function public.insert_notification(
  p_user_id uuid,
  p_type text,
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (user_id, type, payload)
  values (p_user_id, p_type, p_payload)
  returning id into v_id;
  return v_id;
end;
$$;
