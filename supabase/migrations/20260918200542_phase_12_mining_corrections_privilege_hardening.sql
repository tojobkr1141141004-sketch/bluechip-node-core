-- PHASE 12 privilege hardening: expose correction records as read-only data.
revoke all on table public.mining_reward_corrections from anon, authenticated;
grant select on table public.mining_reward_corrections to authenticated;
