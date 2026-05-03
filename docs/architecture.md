# RegimeGuard AI Architecture

## Frontend

- Next.js App Router hosted on Vercel Hobby.
- Static-first product pages with API integration points for backtests, watchdog sessions, incidents, and experiments.
- Designed to remain useful even when the backend sleeps by rendering persisted Supabase history and polling when the monitor page is open.

## Backend

- FastAPI service hosted on a Hugging Face Docker Space.
- Domain logic is concentrated in the `services` packages to keep the API layer thin.
- Watchdog sessions are tick-driven rather than worker-driven, matching free-tier hosting constraints.

## Persistence

- Supabase Postgres stores users, strategies, backtest runs, sessions, alerts, snapshots, and notes.
- The current repo includes migration and seed SQL for a reproducible project bootstrap.

## Market Data Strategy

- The platform now pulls live Binance REST data for klines, book ticker, and order book depth.
- The dedicated market-data module remains the extension point for future WebSocket streaming without changing the rest of the product boundaries.
