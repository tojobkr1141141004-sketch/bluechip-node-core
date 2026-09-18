-- PHASE 18 — allow authenticated RLS evaluation through the guarded
-- admin permission SECURITY DEFINER helper.
--
-- This function only returns a boolean and still enforces the recent-admin
-- session plus RBAC checks internally. Granting EXECUTE is required because
-- PostgreSQL evaluates RLS policy expressions as the querying role.
grant execute on function private.has_admin_permission(text) to authenticated;