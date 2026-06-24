-- Update notifications type check to include all real notification types used by the app
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in (
    'parent_request', 'parent_linked',
    'alert', 'medal', 'message',
    'progress', 'quiz_result', 'enrollment',
    'new_student', 'student_progress', 'inactivity_alert',
    'child_progress', 'child_medal', 'coliseo_result'
  ));
