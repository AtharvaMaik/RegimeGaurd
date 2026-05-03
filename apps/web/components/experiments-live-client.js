"use client";

import { useEffect, useRef, useState } from "react";

import { StatusChip } from "./status-chip";

async function fetchJsonFrom(apiBaseUrl, path) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

function formatStamp(value) {
  if (!value) {
    return "Waiting for live market refresh.";
  }

  return `Updated ${new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
}

export function ExperimentsLiveClient({ apiBaseUrl, initialPayload }) {
  const refreshIntervalMs = 5000;
  const [payload, setPayload] = useState(initialPayload);
  const [error, setError] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function refreshExperiments() {
      try {
        const nextPayload = await fetchJsonFrom(apiBaseUrl, "/api/v1/experiments/live");
        if (cancelled) {
          return;
        }
        setPayload(nextPayload);
        setError("");
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to refresh live experiments.");
        }
      }
    }

    refreshExperiments();
    timerRef.current = window.setInterval(refreshExperiments, refreshIntervalMs);

    return () => {
      cancelled = true;
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [apiBaseUrl, refreshIntervalMs]);

  const liveExperiments = payload.experiments.filter((experiment) => experiment.live);
  const visibleExperiments = liveExperiments.length ? liveExperiments : payload.experiments;

  return (
    <>
      <p className="page-copy" style={{ marginTop: 0 }}>
        {formatStamp(payload?.refreshed_at)} Every saved run is rehydrated against the live Binance market before it is rendered here.
      </p>
      {error ? <div className="panel">{error}</div> : null}
      <div className="table-card">
        <table className="table">
          <thead>
            <tr>
              <th>Experiment</th>
              <th>Strategy</th>
              <th>Live Regime</th>
              <th>Live Sharpe</th>
              <th>Live Win Rate</th>
              <th>Live Mid</th>
              <th>Analyst</th>
            </tr>
          </thead>
          <tbody>
            {visibleExperiments.map((experiment) => {
              const live = experiment.live;
              return (
                <tr key={experiment.id}>
                  <td>
                    <strong>{experiment.symbol}</strong>
                    <div className="muted">{experiment.timeframe}</div>
                  </td>
                  <td>{experiment.strategy.replaceAll("_", " ")}</td>
                  <td>{live ? <StatusChip label={live.current_regime} /> : <span className="muted">legacy snapshot</span>}</td>
                  <td>{live ? Number(live.metrics.sharpe).toFixed(2) : Number(experiment.metrics.sharpe).toFixed(2)}</td>
                  <td>{live ? `${(Number(live.metrics.win_rate) * 100).toFixed(1)}%` : `${(Number(experiment.metrics.win_rate) * 100).toFixed(1)}%`}</td>
                  <td>{live ? Number(live.diagnostics.live_mid_price).toFixed(2) : "n/a"}</td>
                  <td>
                    <div>{live?.analyst_summary ?? experiment.analyst_summary ?? experiment.note}</div>
                    <div className="muted" style={{ marginTop: 8 }}>
                      Snapshot Sharpe {Number(experiment.metrics.sharpe).toFixed(2)} | Snapshot DD {(Number(experiment.metrics.max_drawdown) * 100).toFixed(1)}%
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
