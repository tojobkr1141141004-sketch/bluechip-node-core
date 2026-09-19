-- PHASE 22 PATCH: authenticated public wrappers use SECURITY DEFINER
-- Privileged private functions keep direct EXECUTE revoked.

create or replace function public.start_my_mining_contract(
  p_product_version_id uuid,
  p_capacity numeric,
  p_idempotency_key text
)
returns uuid
language sql
security definer
volatile
set search_path = public, auth, pg_temp
as $function$
  select private.start_my_mining_contract(
    (select auth.uid()),
    p_product_version_id,
    p_capacity,
    p_idempotency_key
  );
$function$;

revoke all on function public.start_my_mining_contract(uuid, numeric, text)
  from public, anon;

grant execute on function public.start_my_mining_contract(uuid, numeric, text)
  to authenticated;

create or replace function public.mark_my_notification_read(
  p_notification_id uuid
)
returns integer
language sql
security definer
volatile
set search_path = public, auth, pg_temp
as $function$
  select private.mark_my_notification_read(
    (select auth.uid()),
    p_notification_id
  );
$function$;

revoke all on function public.mark_my_notification_read(uuid)
  from public, anon;

grant execute on function public.mark_my_notification_read(uuid)
  to authenticated;

create or replace function public.mark_all_my_notifications_read()
returns integer
language sql
security definer
volatile
set search_path = public, auth, pg_temp
as $function$
  select private.mark_all_my_notifications_read((select auth.uid()));
$function$;

revoke all on function public.mark_all_my_notifications_read()
  from public, anon;

grant execute on function public.mark_all_my_notifications_read()
  to authenticated;
