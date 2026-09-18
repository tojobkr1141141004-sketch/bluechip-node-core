-- PHASE 13 privilege hardening: lock the issuance policy table to read-only access.
revoke all on public.mining_issuance_policies from public,anon,authenticated;
grant select on public.mining_issuance_policies to authenticated;
