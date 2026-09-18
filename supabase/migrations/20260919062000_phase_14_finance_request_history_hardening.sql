-- PHASE 14 hardening: make RLS intent explicit and cover the transaction foreign key.

create policy finance_request_events_admin_select
on public.finance_request_events
for select to authenticated
using ((select private.has_admin_permission('finance.read')));

create index finance_request_events_transaction_idx
on public.finance_request_events(transaction_id)
where transaction_id is not null;