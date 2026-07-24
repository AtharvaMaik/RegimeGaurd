# RegimeGuard AI

RegimeGuard AI is a hosted crypto strategy lab for quant researchers who want to backtest strategies, classify market regimes, deploy live watchdog sessions, and review AI-generated incident postmortems when behavior deteriorates.

It is designed to feel like a quant research notebook, a strategy control room, and an AI watchdog surface in one product. The platform does not place trades. It evaluates strategy behavior against live BTC and ETH market conditions and explains when the market, signal quality, or execution environment starts to diverge from expectations.

## What The Product Does

- Runs historical backtests against live Binance candle data.
- Labels regime transitions such as trending up, trending down, range bound, and high-volatility stress.
- Scores signal health, volatility shifts, liquidity stress, and execution deterioration.
- Starts watchdog sessions that re-check live market conditions on a polling loop.
- Stores incidents and renders analyst-style summaries from structured telemetry.
- Rehydrates saved experiments and incidents against the current market so the product stays live instead of snapshot-only.

## Core Product Surfaces

### Research Lab

The lab is the primary strategy workspace. A researcher selects a symbol and strategy template, runs the backtest pipeline, inspects diagnostics, and watches both:

- a regime-aware backtest equity curve
- a separate live session equity trace driven by incoming trade tape
- live agent activity across signal, regime, risk, and analyst modules

### Monitor

The monitor page launches a watchdog session and polls the backend for fresh strategy telemetry. It highlights:

- regime shifts
- PnL drift versus expected behavior
- signal decay
- liquidity and spread stress
- anomaly-style watchdog alerts

### Incident Replay

When the watchdog detects abnormal behavior, the platform stores an incident snapshot and renders:

- what changed
- which conditions triggered the alert
- the affected strategy state
- a recommended action
- a live follow-up overlay showing current conditions versus the original incident

### Experiments

Experiments preserve backtest runs and live-rehydrate them against current Binance market data. That lets the user compare saved research setups while still seeing live metrics, regime state, and analyst summaries.

## Architecture

### Frontend

- `apps/web` is a Next.js App Router app intended for Vercel deployment.
- The UI is organized around `/`, `/lab`, `/monitor`, `/incident/[id]`, and `/experiments`.
- Client-side polling is used to keep the lab, monitor, and live experiment views fresh without requiring always-on workers.

### Backend

- `apps/api` is a FastAPI service intended for a Hugging Face Docker Space.
- The API keeps HTTP orchestration thin and pushes domain logic into shared services.
- The backend exposes live backtesting, regime detection, watchdog lifecycle, incident retrieval, and live experiment hydration endpoints.

### Shared Services

- `services/market_data`: Binance REST fetchers for klines, recent trades, top-of-book, and depth.
- `services/features`: indicator and feature engineering.
- `services/backtest`: strategy engine, metrics, and strategy templates.
- `services/regimes`: market regime classification.
- `services/watchdog`: alert scoring and incident creation.
- `services/analyst`: structured narrative generation.
- `services/common`: domain types, enums, and runtime persistence helpers.

### Persistence

- `supabase/` contains SQL migrations and seed data for the intended hosted persistence layer.
- The local development build also uses a JSON runtime store for watchdog sessions, incidents, and experiments so the app can run end to end without external infrastructure.

## Live Data Model

RegimeGuard AI now uses live Binance public REST data end to end for the main product loop:

- historical candles for backtests
- recent trades for live tape and live session equity
- book ticker for top-of-book pricing
- order book depth for spread and liquidity proxies

The current implementation is intentionally stateless enough for free hosting tiers. Instead of relying on permanent workers, the web client polls the backend, and the backend recomputes fresh live state on demand.

## Repository Layout

```text
regimeguard-ai/
  apps/
    api/        FastAPI backend
    web/        Next.js frontend
  services/
    analyst/
    backtest/
    common/
    features/
    market_data/
    regimes/
    watchdog/
  supabase/
    migrations/
    seed.sql
  docs/
    architecture.md
  README.md
```

## API Surface

The backend currently exposes the following primary endpoints:

- `POST /api/v1/backtest`
- `POST /api/v1/detect-regime`
- `POST /api/v1/watchdog/start`
- `POST /api/v1/watchdog/{session_id}/tick`
- `GET /api/v1/watchdog/{session_id}/status`
- `GET /api/v1/incidents/{incident_id}`
- `GET /api/v1/incidents/{incident_id}/live`
- `GET /api/v1/experiments`
- `GET /api/v1/experiments/live`
- `POST /api/v1/ai-summary`
- `GET /api/v1/health`

## Local Development

### Prerequisites

- Node.js 20+
- Python 3.10+
- npm

### Install Dependencies

```bash
npm install
python -m pip install -r apps/api/requirements.txt
```

### Run The Backend

```bash
python -m uvicorn apps.api.app.main:app --host 127.0.0.1 --port 8010
```

### Run The Frontend

```bash
cd apps/web
npm run dev
```

Or from the repo root:

```bash
npm run dev:web
```

### Default Local URLs

- Web app: `http://127.0.0.1:3000` in dev, `http://127.0.0.1:3101` in the verified production-style run
- API: `http://127.0.0.1:8010`

## Verification

### Unit And Build Checks

```bash
python -m pytest apps/api/tests -q
npm run test:web
npm run build:web
```

### Browser Verification

The repo includes a Playwright verification spec for the main product routes:

```bash
npx playwright test apps/web/tests/ui-verify.spec.js
```

## Deployment

### Vercel Hobby

- Deploy `apps/web`
- Configure `NEXT_PUBLIC_API_BASE_URL`
- Optionally configure Supabase public env vars when wiring full hosted auth and persistence

### Hugging Face Spaces

- Deploy `apps/api` as a Docker Space
- Use the included `apps/api/Dockerfile`
- Expose the FastAPI service port expected by the Space runtime

### Supabase Free

- Apply `supabase/migrations/202605020001_initial_schema.sql`
- Load `supabase/seed.sql`
- Wire auth and persistence credentials into the deployed frontend and backend

## Current State

This repository is an end-to-end hosted MVP with:

- live Binance market data
- deterministic strategy templates
- regime classification
- watchdog alerting
- incident replay
- live experiment hydration
- analyst summaries from structured telemetry

It is intentionally built so that live REST polling works on free hosting tiers first. If you want to push the platform further, the natural next steps are:

- Binance WebSocket ingestion
- durable database-backed runtime state instead of local JSON storage
- user-authenticated multi-tenant experiment history
- richer factor diagnostics and walk-forward evaluation
- alert delivery through email, Telegram, or Slack

