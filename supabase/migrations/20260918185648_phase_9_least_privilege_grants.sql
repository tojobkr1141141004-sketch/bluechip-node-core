
-- PHASE 9 least-privilege table grants.
revoke all on
  public.mining_contracts,
  public.mining_calculation_runs,
  public.mining_calculation_errors,
  public.mining_reward_accruals,
  public.mining_reward_payments
from anon, authenticated;

grant select on
  public.mining_contracts,
  public.mining_calculation_runs,
  public.mining_calculation_errors,
  public.mining_reward_accruals,
  public.mining_reward_payments
to authenticated;
