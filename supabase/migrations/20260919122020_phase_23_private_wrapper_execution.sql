-- PHASE 23 follow-up: allow the authenticated public wrapper to invoke the
-- isolated private SECURITY DEFINER implementation. The private schema is not an API
-- surface; anonymous execution remains denied.

revoke execute on function private.start_my_mining_contract(uuid, uuid, numeric, text) from public;
revoke execute on function private.start_my_mining_contract(uuid, uuid, numeric, text) from anon;
grant execute on function private.start_my_mining_contract(uuid, uuid, numeric, text) to authenticated;

revoke execute on function private.mark_my_notification_read(uuid, uuid) from public;
revoke execute on function private.mark_my_notification_read(uuid, uuid) from anon;
grant execute on function private.mark_my_notification_read(uuid, uuid) to authenticated;

revoke execute on function private.mark_all_my_notifications_read(uuid) from public;
revoke execute on function private.mark_all_my_notifications_read(uuid) from anon;
grant execute on function private.mark_all_my_notifications_read(uuid) to authenticated;
