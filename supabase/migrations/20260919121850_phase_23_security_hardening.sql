-- PHASE 23: public user wrappers must not execute with definer privileges.
-- The privileged implementation remains isolated in private.* SECURITY DEFINER functions.

create or replace function public.start_my_mining_contract(
  p_product_version_id uuid,
  p_capacity numeric,
  p_idempotency_key text
)
returns uuid
language sql
security invoker
set search_path = ''
as $function$
  select private.start_my_mining_contract(
    (select auth.uid()),
    p_product_version_id,
    p_capacity,
    p_idempotency_key
  );
$function$;

create or replace function public.mark_my_notification_read(
  p_notification_id uuid
)
returns integer
language sql
security invoker
set search_path = ''
as $function$
  select private.mark_my_notification_read(
    (select auth.uid()),
    p_notification_id
  );
$function$;

create or replace function public.mark_all_my_notifications_read()
returns integer
language sql
security invoker
set search_path = ''
as $function$
  select private.mark_all_my_notifications_read((select auth.uid()));
$function$;
