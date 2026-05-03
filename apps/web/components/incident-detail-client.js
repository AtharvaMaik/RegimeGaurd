"use client";

import { useEffect, useState } from "react";

import { AppShell } from "./app-shell";
import { SectionHead } from "./section-head";

export function IncidentDetailClient({ incidentId, apiBaseUrl }) {
  const [incident, setIncident] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let timerId = null;

    async function loadIncident() {
      try {
        const response = await fetch(`${apiBaseUrl}/api/v1/incidents/${incidentId}/live`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Incident request failed with status ${response.status}`);
        }

        const payload = await response.json();
        if (!cancelled) {
          setIncident(payload);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Unable to load incident details.");
        }
      }
    }

    loadIncident();
    timerId = window.setInterval(loadIncident, 5000);

    return () => {
      cancelled = true;
      if (timerId) {
        window.clearInterval(timerId);
      }
    };
  }, [apiBaseUrl, incidentId]);

  return (
    <AppShell>
      <section className="page-hero">
        <div className="eyebrow">Incident Replay</div>
        <h1 className="page-title">
          {incident ? incident.alert_type.replaceAll("_", " ") : "Loading Incident"}
        </h1>
        <p className="page-copy">
          {error || incident?.what_changed || "Fetching structured telemetry and replay context from the live watchdog."}
        </p>
      </section>

      {incident ? (
        <>
          <section className="section page-grid">
            <div className="panel">
              <SectionHead title="What Changed" copy="The analyst view turns structured telemetry into a readable postmortem." />
              <p className="section-copy">{incident.what_changed}</p>
              <p className="section-copy">{incident.narrative}</p>
              <div className="timeline">
                {incident.signals_triggered.map((trigger) => (
                  <span key={trigger} className="chip">
                    {trigger.replaceAll("_", " ")}
                  </span>
                ))}
              </div>
            </div>
            <div className="panel panel-dark">
              <SectionHead title="Recommended Action" copy="Reduce uncertainty before restarting the bot." />
              <p>{incident.recommended_action.replaceAll("_", " ")}</p>
            </div>
          </section>

          {incident.live ? (
            <section className="section page-grid">
              <div className="panel panel-dark">
                <SectionHead title="Live Analyst" copy="The incident is rehydrated against the current Binance tape every few seconds." />
                <p>{incident.live.analyst_summary}</p>
                <p className="muted">Updated {new Date(incident.live.refreshed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
              </div>
              <div className="panel">
                <SectionHead title="Live Market Overlay" copy="Current regime and signal state relative to the original incident baseline." />
                <p className="muted">Current regime: {incident.live.current_regime.replaceAll("_", " ")}</p>
                <p className="muted">Live mid price: {Number(incident.live.live_mid_price).toFixed(2)}</p>
                <p className="muted">Signal delta vs expected: {Number(incident.live.comparison.signal_delta_vs_expected).toFixed(4)}</p>
                <p className="muted">Return delta vs expected: {Number(incident.live.comparison.return_delta_vs_expected).toFixed(4)}</p>
              </div>
            </section>
          ) : null}

          <section className="section">
            <SectionHead title="Before / After Metrics" copy="Each incident keeps the evidence side by side." />
            <div className="table-card">
              <table className="table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Baseline Delta</th>
                    <th>Current Delta</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(incident.before_after).map(([label, value]) => (
                    <tr key={label}>
                      <td>{label.replaceAll("_", " ")}</td>
                      <td>0.00</td>
                      <td>{Number(value).toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </AppShell>
  );
}
