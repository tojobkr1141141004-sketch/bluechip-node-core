create schema if not exists private;

comment on schema private is
  'APEX-MATRIX internal-only database objects; never exposed through the public Data API.';

revoke all on schema private from public;
revoke all on schema private from anon;
revoke all on schema private from authenticated;
