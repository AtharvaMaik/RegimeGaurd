# RegimeGuard AI Platform Design

## Goal

Build an industry-grade hosted crypto strategy lab where authenticated users can backtest BTC/ETH strategies, compare experiments, deploy a live watchdog session, inspect regime shifts and strategy decay, and review structured AI-generated incident postmortems.

## Product Scope

This implementation treats all features in the user brief as mandatory for version one:

- Research Lab with historical backtests, walk-forward evaluation, overfitting checks, factor diagnostics, regime timeline, and strategy comparisons.
- Regime Detector that classifies market conditions into trending up, trending down, range-bound, or high-volatility stress.
- Watchdog Agent that monitors live price action, volatility regime, liquidity proxies, execution risk proxies, PnL drift, signal decay, feature drift, and anomaly score.
- Incident Replay that stores alert snapshots and renders before/after metrics plus a postmortem.
- AI Analyst that translates structured telemetry into plain-English explanations and recommended actions.
- Experiments page that persists runs and notes for comparison.
- Hosted deployment that remains usable on free tiers by avoiding permanent background workers.

## Architecture

The platform is a monorepo with a Next.js frontend in `apps/web`, a FastAPI backend in `apps/api`, pure-Python quant services in `services`, Supabase SQL in `supabase`, and design/deployment documentation in `docs`.

The frontend owns authentication, product navigation, charts, strategy controls, session polling, and experiment management. The backend owns market data access, feature engineering, strategies, backtests, regime scoring, watchdog evaluation, incident generation, and AI summaries. Supabase stores durable user state, runs, sessions, alerts, snapshots, and notes.

To preserve free-tier compatibility, the watchdog is implemented as a tick-based session. The user launches a session once, and the frontend polls the backend every twenty seconds while the dashboard is open. Each poll fetches fresh market data, recomputes features, updates watchdog state, persists any new alerts, and returns the current status.

## Functional Design

### Research Lab

Users choose `BTCUSDT` or `ETHUSDT`, select a strategy template (`momentum_breakout`, `mean_reversion`, `volatility_expansion`), configure parameters, and run a backtest.

The backend:

- pulls historical Binance candles,
- derives indicators and liquidity proxies,
- performs walk-forward evaluation,
- computes performance metrics,
- labels historical regimes,
- stores the run and diagnostics,
- returns chart-ready series plus summary metrics.

The frontend renders:

- equity curve,
- drawdown curve,
- regime timeline,
- feature importance or diagnostic contribution cards,
- table of trades and per-split metrics.

### Regime Detector

The detector is deterministic and explainable. It computes rolling volatility, price momentum, volume change, drawdown slope, and spread/liquidity proxies, then maps each bar into one of four named regimes using calibrated threshold rules. Each classification includes contributing feature values so the UI and analyst can explain why the label changed.

### Watchdog Agent

The watchdog session stores:

- strategy configuration,
- baseline expectations from the most recent backtest,
- session thresholds,
- current regime state,
- last telemetry sample,
- active alert state.

Each tick computes:

- realized volatility jump,
- signal drift against historical expectations,
- rolling PnL deviation,
- execution risk proxy from spread and range,
- anomaly score from normalized feature deviation,
- regime instability score.

Alert types are:

- `regime_shift_detected`
- `signal_quality_deteriorating`
- `execution_risk_elevated`
- `bot_behavior_anomaly`

Each alert includes severity, triggered detectors, snapshot metrics, recommended action, and a generated postmortem.

### Incident Replay

For each alert, the backend persists:

- session identifiers,
- triggering metrics,
- previous metrics,
- current regime label,
- strategy health values,
- action recommendation,
- analyst narrative,
- created timestamp.

The incident page reconstructs the event using structured sections instead of free-form logs:

- What changed
- Signals that fired
- Strategy state impact
- Recommendation
- Supporting metrics and before/after deltas

### AI Analyst

The analyst is deterministic-first. It turns structured alert telemetry into a plain-English narrative and action recommendation. The design keeps the analyst module pluggable so a hosted LLM can be added later, but the MVP ships with a local template-based summarizer that already behaves like an analyst agent.

### Experiments

Users can save any run as an experiment with notes. The experiments view supports:

- filtering by symbol and strategy,
- comparing metrics side by side,
- inspecting regime mix,
- opening the full run detail.

## Data Model

Supabase tables:

- `profiles`
- `strategies`
- `backtest_runs`
- `backtest_splits`
- `watchdog_sessions`
- `watchdog_ticks`
- `alerts`
- `incident_snapshots`
- `experiment_notes`

IDs are UUIDs. Structured strategy configuration, thresholds, and telemetry are stored in `jsonb` columns where flexibility is useful. Metric columns are still broken out into typed numeric fields for filtering and ranking.

## API Design

Core endpoints:

- `POST /api/v1/backtest`
- `POST /api/v1/detect-regime`
- `POST /api/v1/watchdog/start`
- `POST /api/v1/watchdog/{session_id}/tick`
- `GET /api/v1/watchdog/{session_id}/status`
- `GET /api/v1/incidents/{incident_id}`
- `POST /api/v1/ai-summary`
- `GET /api/v1/experiments`

The API contract is versioned and typed with Pydantic schemas. Responses are UI-shaped where useful, but the core domain modules remain framework-agnostic.

## Frontend Design

Pages:

- `/` landing page with strong product framing
- `/lab` backtest workflow
- `/monitor` watchdog session and live alerts
- `/incident/[id]` incident replay
- `/experiments` saved runs and comparisons

The visual language should feel like a quant lab and control room rather than a generic admin dashboard. The interface uses a bold data-product aesthetic with a warm off-white base, deep ink panels, accent greens/oranges for state, and condensed display typography for metrics.

## Reliability and Security

- Secrets live in environment variables only.
- Backend is stateless beyond Supabase persistence.
- Binance failures degrade gracefully with actionable UI errors.
- Watchdog ticks are idempotent by timestamp window.
- Input validation enforces supported symbols, strategies, and parameter ranges.
- All database writes pass through typed repository functions.

## Testing Strategy

- Unit tests for indicators, strategy logic, regime scoring, watchdog scoring, and analyst summaries.
- API tests for backtest, watchdog launch, tick evaluation, and incident retrieval.
- Frontend component tests for critical states.
- End-to-end smoke verification for the main user flow using mocked backend data where necessary.

## Deployment Design

- `apps/web` deploys to Vercel Hobby.
- `apps/api` deploys to Hugging Face Space using Docker.
- Supabase provides auth and Postgres.
- `.env.example` files document local and hosted configuration.
- The repo includes Docker, Vercel, and Supabase setup instructions so the deployment is reproducible.

## Assumptions

- Supported assets for the first version are `BTCUSDT` and `ETHUSDT`.
- Public Binance data is sufficient for research and live polling in the MVP.
- The AI analyst ships as a structured deterministic engine with a clear extension point for a future hosted LLM.
- Free-tier hosting is a hard constraint, so no always-on worker or scheduler is required for core functionality.
