# RegimeGuard AI Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hosted crypto strategy lab with backtesting, regime detection, watchdog monitoring, incident replay, AI summaries, and deployment-ready frontend/backend infrastructure.

**Architecture:** A monorepo with a Next.js frontend, FastAPI backend, shared quant services, and Supabase persistence. The backend computes research and watchdog intelligence; the frontend presents the lab and monitoring workflows; both consume typed schemas and deterministic domain modules.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, FastAPI, Pydantic, pytest, pandas, numpy, httpx, Supabase SQL, Docker.

---

### Task 1: Scaffold the monorepo

**Files:**
- Create: `apps/web/*`
- Create: `apps/api/*`
- Create: `services/*`
- Create: `supabase/migrations/*`
- Create: `README.md`

- [ ] Step 1: Create the workspace structure and package manifests
- [ ] Step 2: Add shared environment examples and ignore rules
- [ ] Step 3: Add base README and local run instructions

### Task 2: Implement quant domain models with failing tests first

**Files:**
- Create: `apps/api/tests/test_domain_models.py`
- Create: `services/common/types.py`
- Create: `services/common/enums.py`

- [ ] Step 1: Write failing tests for symbols, strategies, regime labels, and alert structures
- [ ] Step 2: Run the targeted pytest command and confirm failure
- [ ] Step 3: Implement the minimal typed models and rerun tests

### Task 3: Implement market data and feature engineering

**Files:**
- Create: `apps/api/tests/test_features.py`
- Create: `services/market_data/binance.py`
- Create: `services/features/indicators.py`
- Create: `services/features/liquidity.py`

- [ ] Step 1: Write failing tests for candle normalization, rolling volatility, momentum, liquidity proxy, and spread proxy
- [ ] Step 2: Run pytest to confirm the expected failures
- [ ] Step 3: Implement the minimal feature functions and rerun tests

### Task 4: Implement strategies and backtest engine

**Files:**
- Create: `apps/api/tests/test_backtest.py`
- Create: `services/backtest/strategies.py`
- Create: `services/backtest/engine.py`
- Create: `services/backtest/metrics.py`

- [ ] Step 1: Write failing tests for each strategy template and for performance metrics
- [ ] Step 2: Run pytest to confirm the failures
- [ ] Step 3: Implement minimal strategy and engine code until green

### Task 5: Implement regime detection and watchdog evaluation

**Files:**
- Create: `apps/api/tests/test_regimes.py`
- Create: `apps/api/tests/test_watchdog.py`
- Create: `services/regimes/classifier.py`
- Create: `services/watchdog/evaluator.py`
- Create: `services/watchdog/recommendations.py`

- [ ] Step 1: Write failing tests for regime classification, anomaly scoring, drift detection, and recommendations
- [ ] Step 2: Run pytest and confirm red state
- [ ] Step 3: Implement the classifier and watchdog evaluator until tests pass

### Task 6: Implement analyst summaries and incident shaping

**Files:**
- Create: `apps/api/tests/test_analyst.py`
- Create: `services/analyst/summarizer.py`
- Create: `services/watchdog/incidents.py`

- [ ] Step 1: Write failing tests for narrative generation and incident payload formatting
- [ ] Step 2: Run pytest to confirm failures
- [ ] Step 3: Implement summarizer and incident builder until green

### Task 7: Build the FastAPI service

**Files:**
- Create: `apps/api/tests/test_api.py`
- Create: `apps/api/app/main.py`
- Create: `apps/api/app/schemas.py`
- Create: `apps/api/app/config.py`

- [ ] Step 1: Write failing API tests for backtest, regime detection, watchdog start, tick, status, incident, and experiments
- [ ] Step 2: Run pytest to observe the missing endpoint failures
- [ ] Step 3: Implement the API and rerun the suite

### Task 8: Build the web app product surfaces

**Files:**
- Create: `apps/web/app/*`
- Create: `apps/web/components/*`
- Create: `apps/web/lib/*`
- Create: `apps/web/tests/*`

- [ ] Step 1: Create page-level tests or smoke assertions for landing, lab, monitor, incident, and experiments pages
- [ ] Step 2: Implement the UI shell, data cards, and charts
- [ ] Step 3: Wire typed fetchers and mocked local data states, then run frontend checks

### Task 9: Add Supabase schema and deployment assets

**Files:**
- Create: `supabase/migrations/202605020001_initial_schema.sql`
- Create: `supabase/seed.sql`
- Create: `apps/api/Dockerfile`
- Create: `apps/web/vercel.json`
- Create: `.env.example`

- [ ] Step 1: Add database schema and seed data
- [ ] Step 2: Add Docker and deployment configuration
- [ ] Step 3: Document hosted deployment steps

### Task 10: Run full verification

**Files:**
- Modify: `README.md`

- [ ] Step 1: Run backend tests
- [ ] Step 2: Run frontend checks
- [ ] Step 3: Run build commands and update README with exact commands and outputs expected by contributors
