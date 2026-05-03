create extension if not exists "pgcrypto";

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  symbol text not null,
  template text not null,
  timeframe text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists backtest_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  strategy_id uuid references strategies(id) on delete set null,
  symbol text not null,
  strategy_template text not null,
  timeframe text not null,
  metrics jsonb not null,
  diagnostics jsonb not null,
  regime_timeline jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists watchdog_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  backtest_run_id uuid references backtest_runs(id) on delete set null,
  symbol text not null,
  strategy_template text not null,
  status text not null default 'active',
  baseline jsonb not null,
  thresholds jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists watchdog_ticks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references watchdog_sessions(id) on delete cascade,
  telemetry jsonb not null,
  anomaly_score numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references watchdog_sessions(id) on delete cascade,
  alert_type text not null,
  severity text not null,
  recommendation text not null,
  triggers jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists incident_snapshots (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references alerts(id) on delete cascade,
  snapshot jsonb not null,
  analyst_summary text not null,
  created_at timestamptz not null default now()
);

create table if not exists experiment_notes (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references backtest_runs(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  note text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_backtest_runs_user_created_at on backtest_runs(user_id, created_at desc);
create index if not exists idx_watchdog_sessions_user_created_at on watchdog_sessions(user_id, created_at desc);
create index if not exists idx_alerts_session_created_at on alerts(session_id, created_at desc);
create index if not exists idx_incident_snapshots_alert on incident_snapshots(alert_id);

