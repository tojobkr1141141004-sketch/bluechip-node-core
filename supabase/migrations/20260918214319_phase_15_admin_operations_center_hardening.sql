-- PHASE 15 hardening: no direct table access is required for the operations snapshot.
do $migration_sync$ begin null; end $migration_sync$;
