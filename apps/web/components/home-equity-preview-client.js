"use client";

import { useEffect, useRef, useState } from "react";

import { SparklineChart } from "./sparkline-chart";
import { defaultBacktestRequest } from "../lib/api";
import { buildDisplayChartFrame, buildEquityCurveSeries, normalizeTradeEntries, rollForwardTickSeries } from "../lib/lab";

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

export function HomeEquityPreviewClient({ apiBaseUrl, initialRun }) {
  const refreshIntervalMs = 5000;
  const [run, setRun] = useState(initialRun);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
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
        const nextRun = await postJsonTo(apiBaseUrl, "/api/v1/backtest", defaultBacktestRequest);
        if (cancelled) {
          return;
        }
        setRun(nextRun);
        setTickSeries((currentSeries) =>
          rollForwardTickSeries(
            currentSeries,
            nextRun.diagnostics.recent_trades ?? [nextRun.diagnostics.live_trade_price ?? nextRun.diagnostics.live_mid_price],
            48,
          ),
        );
        setLastUpdated(new Date());
        setError("");
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to refresh equity preview.");
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

  const baseValues = buildEquityCurveSeries(run.equity_curve, 72);
  const baseRegimes = run.regime_timeline.slice(-baseValues.length);
  const chartFrame = buildDisplayChartFrame(baseValues, baseRegimes, tickSeries.entries, 20);

  return (
    <>
      <div className="eyebrow">Live Equity Curve Preview</div>
      <p className="chart-copy">
        {buildRefreshLabel(lastUpdated)}. Previewing the latest 72 normalized points with a magnified live tail x{chartFrame.liveTailScale.toFixed(1)}.
      </p>
      {error ? <div className="chart-error">{error}</div> : null}
      <SparklineChart
        values={chartFrame.values}
        regimes={chartFrame.regimes}
        livePrice={typeof run.diagnostics.live_mid_price === "number" ? run.diagnostics.live_mid_price : null}
        liveDrift={typeof run.diagnostics.live_price_change === "number" ? run.diagnostics.live_price_change : null}
        tickPrices={tickSeries.entries}
      />
    </>
  );
}
