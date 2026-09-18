-- PHASE 16 — schedule internal notification refresh.
do $schedule$
begin
  if not exists (
    select 1 from cron.job
    where jobname='apex-matrix-admin-notification-refresh'
  ) then
    perform cron.schedule(
      'apex-matrix-admin-notification-refresh',
      '* * * * *',
      'select private.refresh_admin_notifications();'
    );
  end if;
end;
$schedule$;