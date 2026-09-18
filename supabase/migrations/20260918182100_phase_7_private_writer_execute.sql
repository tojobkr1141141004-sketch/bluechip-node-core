grant execute on function private.create_deposit_request(uuid, numeric, text, text)
  to authenticated;

grant execute on function private.create_withdrawal_request(
  uuid, numeric, text, text, text, text, text, text
) to authenticated;

revoke execute on function private.write_finance_audit(
  uuid, uuid, text, text, text, jsonb
) from public, anon, authenticated;

revoke execute on function private.validate_request_asset_amount(
  uuid, numeric
) from public, anon, authenticated;