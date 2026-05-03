import Link from "next/link";

import { AppShell } from "../components/app-shell";
import { HomeEquityPreviewClient } from "../components/home-equity-preview-client";
import { MetricCard } from "../components/metric-card";
import { SectionHead } from "../components/section-head";
import { StatusChip } from "../components/status-chip";
import { defaultBacktestRequest, getApiBaseUrl, getJson, postJson } from "../lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const apiBaseUrl = getApiBaseUrl();
  const [btcRun, ethRun, experiments] = await Promise.all([
    postJson("/api/v1/backtest", defaultBacktestRequest),
    postJson("/api/v1/backtest", {
      ...defaultBacktestRequest,
      symbol: "ETHUSDT",
      strategy: "volatility_expansion",
      timeframe: "4h",
    }),
    getJson("/api/v1/experiments"),
  ]);

  const metrics = [
    { label: "BTC Sharpe", value: btcRun.metrics.sharpe.toFixed(2), tone: "up", hint: "Live Binance candles" },
    {
      label: "BTC Max Drawdown",
      value: `${(btcRun.metrics.max_drawdown * 100).toFixed(1)}%`,
      tone: "down",
      hint: "Calculated from current kline history",
    },
    { label: "ETH Sharpe", value: ethRun.metrics.sharpe.toFixed(2), tone: "up", hint: "Volatility expansion template" },
    {
      label: "Experiments Stored",
      value: `${experiments.experiments.length}`,
      tone: "alert",
      hint: "Generated from live research runs",
    },
  ];

  const strategyTemplates = [
    {
      name: "Momentum Breakout",
      frame: "BTCUSDT | 1H",
      copy: "Directional breakout diagnostics rendered from the latest live candle history.",
    },
    {
      name: "Volatility Expansion",
      frame: "ETHUSDT | 4H",
      copy: "Stress-sensitive template built from real Binance kline and liquidity conditions.",
    },
  ];

  return (
    <AppShell>
      <section className="hero">
        <div className="hero-card">
          <div className="eyebrow">Quant Research Notebook x Trading Bot Control Room x AI Watchdog</div>
          <h1>Backtest a crypto strategy. Deploy a watchdog. Catch decay before it hurts.</h1>
          <p className="hero-copy">
            RegimeGuard AI helps quant researchers pressure-test BTC and ETH strategies, classify market regimes,
            monitor live signal drift, and inspect AI-generated postmortems when alerts fire.
          </p>
          <div className="hero-actions">
            <Link href="/lab" className="button button-primary">
              Run Backtest
            </Link>
            <Link href="/monitor" className="button button-secondary">
              Open Watchdog
            </Link>
          </div>
        </div>
        <div className="hero-side">
          <div className="panel panel-dark">
            <div className="eyebrow">Current Coverage</div>
            <div className="stat-grid">
              <div>
                <div className="metric-value">BTCUSDT</div>
                <p className="muted">Spot regime monitoring</p>
              </div>
              <div>
                <div className="metric-value">ETHUSDT</div>
                <p className="muted">Strategy decay tracking</p>
              </div>
              <div>
                <div className="metric-value">2</div>
                <p className="muted">Live strategy templates</p>
              </div>
              <div>
                <div className="metric-value">20s</div>
                <p className="muted">Watchdog polling cadence</p>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="eyebrow">Regime Timeline</div>
            <div className="timeline" style={{ marginTop: 14 }}>
              {btcRun.regime_timeline.slice(-6).map((regime, index) => (
                <div key={`${regime}-${index}`} className="timeline-pill">
                  <span className={`status-dot status-${regime}`} />
                  {regime.replaceAll("_", " ")}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHead
          title="Research Grade Metrics"
          copy="Backtests expose returns, drawdowns, turnover, regime exposure, and feature diagnostics in a format that feels closer to a strategy lab than a generic dashboard."
        />
        <div className="metric-grid">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </section>

      <section className="section page-grid">
        <div className="timeline-card chart">
          <HomeEquityPreviewClient apiBaseUrl={apiBaseUrl} initialRun={btcRun} />
        </div>
        <div className="panel">
          <div className="eyebrow">Strategy Templates</div>
          <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
            {strategyTemplates.map((template) => (
              <div key={template.name}>
                <strong>{template.name}</strong>
                <div className="muted">{template.frame}</div>
                <p className="muted">{template.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <SectionHead
          title="Incident Intelligence"
          copy="Alerts are created from live market telemetry. Open the monitor to run a watchdog session against current Binance conditions."
          action={
            <Link href="/monitor" className="button button-secondary">
              Start Live Watchdog
            </Link>
          }
        />
        <div className="alert-grid">
          {strategyTemplates.map((template) => (
            <article key={template.name} className="panel">
              <div className="eyebrow">{template.name}</div>
              <div style={{ marginTop: 12 }}>
                <StatusChip label={btcRun.regime_timeline.at(-1)} />
              </div>
              <p className="section-copy">{template.copy}</p>
              <strong>{template.frame}</strong>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
