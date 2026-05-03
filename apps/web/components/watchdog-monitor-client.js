"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { StatusChip } from "./status-chip";

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

export function WatchdogMonitorClient({
  request,
  apiBaseUrl,
  initialSession = null,
  initialTelemetry = null,
  initialAlerts = [],
}) {
  const [session, setSession] = useState(initialSession);
  const [telemetry, setTelemetry] = useState(initialTelemetry);
  const [alerts, setAlerts] = useState(initialAlerts);
  const [error, setError] = useState("");
  const sessionIdRef = useRef("");

  useEffect(() => {
    let cancelled = false;
    let timerId = null;

    async function startAndPoll() {
      try {
        if (!sessionIdRef.current) {
          const started = initialSession ?? (await postJsonTo(apiBaseUrl, "/api/v1/watchdog/start", request));
          if (cancelled) {
            return;
          }
          sessionIdRef.current = started.session_id;
          setSession(started);
        }

        const tick = async () => {
          const payload = await postJsonTo(apiBaseUrl, `/api/v1/watchdog/${sessionIdRef.current}/tick`, {});
          if (cancelled) {
            return;
          }
          setSession(payload.session);
          setTelemetry(payload.telemetry);
          setAlerts(payload.alerts);
        };

        if (!initialTelemetry) {
          await tick();
        }
        timerId = window.setInterval(tick, 20000);
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to start live watchdog session.");
        }
      }
    }

    startAndPoll();

    return () => {
      cancelled = true;
      if (timerId) {
        window.clearInterval(timerId);
      }
    };
  }, [apiBaseUrl, initialSession, initialTelemetry, request]);

  if (error) {
    return <div className="panel">{error}</div>;
  }

  if (!session || !telemetry) {
    return <div className="panel">Starting live watchdog session against Binance market data...</div>;
  }

  return (
    <div className="alert-grid">
      <article className="panel">
        <div className="eyebrow">Session</div>
        <div className="metric-value">{session.status}</div>
        <p className="muted">Session ID: {session.session_id}</p>
        <div style={{ marginTop: 12 }}>
          <StatusChip label={telemetry.regime} />
        </div>
      </article>
      <article className="panel">
        <div className="eyebrow">Live Telemetry</div>
        <p className="muted">Mid price: {telemetry.mid_price?.toFixed(2)}</p>
        <p className="muted">Rolling volatility: {(telemetry.rolling_volatility * 100).toFixed(2)}%</p>
        <p className="muted">Signal strength: {telemetry.signal_strength?.toFixed(2)}</p>
        <p className="muted">Anomaly score: {telemetry.anomaly_score?.toFixed(2)}</p>
      </article>
      {alerts.length ? (
        alerts.map((alert) => (
          <article key={alert.incident_id} className="panel">
            <div className="eyebrow">{alert.alert_type.replaceAll("_", " ")}</div>
            <p className="muted">Severity: {alert.severity}</p>
            <p className="muted">Recommendation: {alert.recommendation.replaceAll("_", " ")}</p>
            <Link href={`/incident/${alert.incident_id}`} className="button button-secondary">
              Open Incident
            </Link>
          </article>
        ))
      ) : (
        <article className="panel">
          <div className="eyebrow">Alerts</div>
          <p className="muted">No active incidents yet. The watchdog is still watching live conditions.</p>
        </article>
      )}
    </div>
  );
}
