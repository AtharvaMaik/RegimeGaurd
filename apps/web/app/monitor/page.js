import { AppShell } from "../../components/app-shell";
import { MetricCard } from "../../components/metric-card";
import { SectionHead } from "../../components/section-head";
import { WatchdogMonitorClient } from "../../components/watchdog-monitor-client";
import { defaultWatchdogRequest, getApiBaseUrl, postJson } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function MonitorPage() {
  const apiBaseUrl = getApiBaseUrl();
  let initialSession = null;
  let initialTelemetry = null;
  let initialAlerts = [];

  try {
    initialSession = await postJson("/api/v1/watchdog/start", defaultWatchdogRequest);
    const tick = await postJson(`/api/v1/watchdog/${initialSession.session_id}/tick`, {});
    initialSession = tick.session;
    initialTelemetry = tick.telemetry;
    initialAlerts = tick.alerts;
  } catch {
    initialSession = null;
  }

  return (
    <AppShell>
      <section className="page-hero">
        <div className="eyebrow">Watchdog Agent</div>
        <h1 className="page-title">Monitor price action, regime shifts, bot decay, and execution stress in one loop.</h1>
        <p className="page-copy">
          The watchdog compares live telemetry against backtest expectations and persists structured incidents when the
          strategy diverges from its expected behavior.
        </p>
      </section>

      <section className="section">
        <div className="metric-grid">
          <MetricCard label="Session Mode" value="Live" hint="Polling every 20 seconds" />
          <MetricCard label="Symbol" value={defaultWatchdogRequest.symbol} hint="Real Binance market feed" />
          <MetricCard label="Template" value="Vol Expansion" tone="alert" hint="Live watchdog baseline" />
          <MetricCard label="Backend" value="FastAPI" tone="up" hint="Tick-driven orchestration" />
        </div>
      </section>

      <section className="section">
        <SectionHead title="Live Alerts" copy="Every alert here is created from the current Binance order book and candle state." />
        <WatchdogMonitorClient
          request={defaultWatchdogRequest}
          apiBaseUrl={apiBaseUrl}
          initialSession={initialSession}
          initialTelemetry={initialTelemetry}
          initialAlerts={initialAlerts}
        />
      </section>
    </AppShell>
  );
}
