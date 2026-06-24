-- Add INSERT policy for notifications so frontend can create notifications
-- Only allow inserting notifications for oneself (user_id must match auth.uid())
create policy notifications_insert on public.notifications
  for insert to authenticated
  with check (user_id = auth.uid());
