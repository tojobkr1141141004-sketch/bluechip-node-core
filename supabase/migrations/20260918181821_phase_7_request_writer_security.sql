alter function public.create_deposit_request(uuid, numeric, text, text)
  security definer;

alter function public.create_deposit_request(uuid, numeric, text, text)
  set search_path = public, auth, pg_temp;

alter function public.create_withdrawal_request(uuid, numeric, text, text, text, text, text, text)
  security definer;

alter function public.create_withdrawal_request(uuid, numeric, text, text, text, text, text, text)
  set search_path = public, auth, pg_temp;

revoke all on function public.create_deposit_request(uuid, numeric, text, text) from public, anon;
grant execute on function public.create_deposit_request(uuid, numeric, text, text) to authenticated;

revoke all on function public.create_withdrawal_request(uuid, numeric, text, text, text, text, text, text) from public, anon;
grant execute on function public.create_withdrawal_request(uuid, numeric, text, text, text, text, text, text) to authenticated;