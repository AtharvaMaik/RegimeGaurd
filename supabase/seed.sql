insert into profiles (id, email, display_name)
values ('11111111-1111-1111-1111-111111111111', 'quant@regimeguard.ai', 'Quant Researcher')
on conflict (email) do nothing;

insert into strategies (id, user_id, symbol, template, timeframe, config)
values
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'BTCUSDT',
    'momentum_breakout',
    '1h',
    '{"lookback_window": 6, "risk_limit": 0.03, "stop_loss": 0.02, "take_profit": 0.05}'::jsonb
  )
on conflict do nothing;

insert into backtest_runs (id, user_id, strategy_id, symbol, strategy_template, timeframe, metrics, diagnostics, regime_timeline)
values
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'BTCUSDT',
    'momentum_breakout',
    '1h',
    '{"total_return": 0.23, "sharpe": 1.84, "sortino": 2.31, "max_drawdown": -0.096, "win_rate": 0.58, "turnover": 14.0, "trades": 12}'::jsonb,
    '{"average_signal_strength": 0.71, "average_volatility": 0.032, "average_spread_proxy": 0.013}'::jsonb,
    '["range_bound", "trending_up", "high_volatility_stress", "trending_down"]'::jsonb
  )
on conflict do nothing;

insert into watchdog_sessions (id, user_id, backtest_run_id, symbol, strategy_template, status, baseline, thresholds)
values
  (
    '44444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    'BTCUSDT',
    'momentum_breakout',
    'active',
    '{"expected_return": 0.02, "expected_volatility": 0.03, "expected_signal_strength": 0.71}'::jsonb,
    '{"alert_threshold": 0.5}'::jsonb
  )
on conflict do nothing;

insert into alerts (id, session_id, alert_type, severity, recommendation, triggers)
values
  (
    '55555555-5555-5555-5555-555555555555',
    '44444444-4444-4444-4444-444444444444',
    'regime_shift_detected',
    'high',
    'pause_bot',
    '["signal_decay", "volatility_jump", "execution_risk"]'::jsonb
  )
on conflict do nothing;

insert into incident_snapshots (id, alert_id, snapshot, analyst_summary)
values
  (
    '66666666-6666-6666-6666-666666666666',
    '55555555-5555-5555-5555-555555555555',
    '{"regime": "high_volatility_stress", "before_after": {"volatility": ["3.2%", "8.1%"], "signal_strength": ["0.72", "0.21"]}}'::jsonb,
    'Momentum signal decayed while realized volatility doubled and spread proxy widened.'
  )
on conflict do nothing;

insert into experiment_notes (id, run_id, user_id, note, tags)
values
  (
    '77777777-7777-7777-7777-777777777777',
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'Best balance between crisis detection and drawdown control.',
    '{"btc", "momentum", "benchmark"}'
  )
on conflict do nothing;

