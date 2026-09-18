-- PHASE 18 — private trigger helpers are internal-only.
revoke execute on function private.audit_member_status_change() from public;
revoke execute on function private.sync_member_directory_from_auth_users() from public;
revoke execute on function private.touch_updated_at() from public;