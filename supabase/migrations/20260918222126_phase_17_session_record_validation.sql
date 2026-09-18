-- PHASE 17 — session record validation checkpoint.
-- The immediately preceding migration establishes the session-aware
-- admin gate. This migration keeps that requirement explicit in the
-- migration chain so a fresh build cannot silently omit auth.sessions
-- validation.
do $verify$
declare
  v_source text;
begin
  select p.prosrc into v_source
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private'
    and p.proname='is_recent_admin_session'
    and pg_get_function_identity_arguments(p.oid)='p_max_age_seconds integer'
  limit 1;

  if v_source is null then
    raise exception 'private.is_recent_admin_session(integer) is missing';
  end if;

  if position('auth.sessions' in v_source) = 0 then
    raise exception 'admin session validation must check auth.sessions';
  end if;

  if position('session_id' in v_source) = 0 then
    raise exception 'admin session validation must check JWT session_id';
  end if;
end;
$verify$;