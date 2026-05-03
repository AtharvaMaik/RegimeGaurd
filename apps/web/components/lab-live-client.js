"use client";

import { useEffect, useRef, useState } from "react";

import { AgentActivityPanel } from "./agent-activity-panel";
import { MetricCard } from "./metric-card";
import { SectionHead } from "./section-head";
import { SparklineChart } from "./sparkline-chart";
import { defaultBacktestRequest } from "../lib/api";
import { buildAgentActivity, buildDisplayChartFrame, buildLabMetrics, buildEquityCurveSeries, buildLiveContext, buildLiveEquitySeries, normalizeTradeEntries, rollForwardTickSeries } from "../lib/lab";

async function postJsonTo(apiBaseUrl, path, body) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

function buildRefreshLabel(lastUpdated) {
  return lastUpdated
    ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
    : "Live snapshot loaded. Waiting for the next refresh tick.";
}

export function LabLiveClient({ apiBaseUrl, initialRun }) {
  const refreshIntervalMs = 5000;
  const [run, setRun] = useState(initialRun);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tickSeries, setTickSeries] = useState({
    entries: normalizeTradeEntries(
      initialRun.diagnostics.recent_trades ?? [initialRun.diagnostics.live_trade_price ?? initialRun.diagnostics.live_mid_price],
    ),
  });
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    setLastUpdated(new Date());

    async function refreshRun() {
      try {
        setIsRefreshing(true);
        const nextRun = await postJsonTo(apiBaseUrl, "/api/v1/backtest", defaultBacktestRequest);
        if (cancelled) {
          return;
        }
        setRun(nextRun);
        setTickSeries((currentSeries) =>
          rollForwardTickSeries(
            currentSeries,
            nextRun.diagnostics.recent_trades ?? [nextRun.diagnostics.live_trade_price ?? nextRun.diagnostics.live_mid_price],
            160,
          ),
        );
        setLastUpdated(new Date());
        setError("");
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to refresh live backtest data.");
        }
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      }
    }

    refreshRun();
    timerRef.current = window.setInterval(refreshRun, refreshIntervalMs);

    return () => {
      cancelled = true;
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [apiBaseUrl, refreshIntervalMs]);

  if (!run) {
    return <section className="section"><div className="panel">Loading the lab snapshot from the live backend...</div></section>;
  }

  const baseValues = buildEquityCurveSeries(run.equity_curve, 72);
  const baseRegimes = run.regime_timeline.slice(-baseValues.length);
  const chartFrame = buildDisplayChartFrame(baseValues, baseRegimes, tickSeries.entries, 20);
  const liveEquityValues = buildLiveEquitySeries(tickSeries.entries, run.diagnostics.live_signal_exposure ?? 1, 160);
  const liveEquityRegimes = Array.from({ length: liveEquityValues.length }, () => run.regime_timeline.at(-1) ?? "range_bound");
  const liveContext = buildLiveContext(tickSeries.entries);
  const metrics = buildLabMetrics(run, liveContext);
  const agents = buildAgentActivity(run, liveContext);

  return (
    <>
      <section className="section lab-top-grid">
        <div className="panel lab-builder-panel">
          <SectionHead title="Backtest Builder" copy="Hosted strategy research without local notebooks." />
          <div className="two-column">
            <div className="table-card">
              <div className="metric-label">Symbol</div>
              <div className="metric-value">BTCUSDT</div>
            </div>
            <div className="table-card">
              <div className="metric-label">Template</div>
              <div className="metric-value">Momentum Breakout</div>
            </div>
            <div className="table-card">
              <div className="metric-label">Timeframe</div>
              <div className="metric-value">1H</div>
            </div>
            <div className="table-card">
              <div className="metric-label">Risk Limits</div>
              <div className="metric-value">3%</div>
            </div>
          </div>
        </div>

        <div className="timeline-card chart lab-chart-panel">
          <div className="chart-head">
            <div className="eyebrow">Backtest Equity</div>
            <div className={`live-badge ${isRefreshing ? "live-badge-hot" : ""}`}>Live Refresh</div>
          </div>
          <p className="chart-copy">
            {buildRefreshLabel(lastUpdated)}. This is the research backtest curve, with only the latest edge informed by the current tape.
          </p>
          {error ? <div className="chart-error">{error}</div> : null}
          <SparklineChart
            values={chartFrame.values}
            regimes={chartFrame.regimes}
            livePrice={typeof run.diagnostics.live_mid_price === "number" ? run.diagnostics.live_mid_price : null}
            liveDrift={typeof run.diagnostics.live_price_change === "number" ? run.diagnostics.live_price_change : null}
            tickPrices={tickSeries.entries}
          />
        </div>
      </section>

      <section className="section">
        <div className="timeline-card chart">
          <div className="chart-head">
            <div className="eyebrow">Live Session Equity</div>
            <div className="live-badge">Continuous Tape</div>
          </div>
          <p className="chart-copy">
            A separate live equity trace compounded only from the incoming trade tape, so it no longer snaps back to the backtest anchor.
          </p>
          <SparklineChart
            values={liveEquityValues}
            regimes={liveEquityRegimes}
            livePrice={typeof run.diagnostics.live_mid_price === "number" ? run.diagnostics.live_mid_price : null}
            liveDrift={typeof run.diagnostics.live_price_change === "number" ? run.diagnostics.live_price_change : null}
            tickPrices={tickSeries.entries}
            showTickStrip={false}
          />
        </div>
      </section>

      <section className="section">
        <AgentActivityPanel agents={agents} />
      </section>

      <section className="section">
        <SectionHead
          title="Performance Snapshot"
          copy="Sharpe, Sortino, max drawdown, win rate, and turnover are presented alongside regime context."
        />
        <div className="metric-grid">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </section>

      <section className="section page-grid">
        <div className="panel">
          <SectionHead title="Regime Timeline" copy="Detects trend, range, and stress transitions over the backtest window." />
          <div className="timeline">
            {run.regime_timeline.slice(-8).map((regime, index) => (
              <div key={`${regime}-${index}`} className="timeline-pill">
                <span className={`status-dot status-${regime}`} />
                {regime.replaceAll("_", " ")}
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <SectionHead title="Signal Diagnostics" copy="Structured factor explanations keep the product feeling AI-first and research-ready." />
          <ul className="muted">
            <li>Average signal strength: {run.diagnostics.average_signal_strength.toFixed(2)}</li>
            <li>Average rolling volatility: {(run.diagnostics.average_volatility * 100).toFixed(2)}%</li>
            <li>Average spread proxy: {(run.diagnostics.average_spread_proxy * 100).toFixed(2)}%</li>
            <li>Live mid price: {typeof run.diagnostics.live_mid_price === "number" ? run.diagnostics.live_mid_price.toFixed(2) : "n/a"}</li>
          </ul>
        </div>
      </section>
    </>
  );
}
