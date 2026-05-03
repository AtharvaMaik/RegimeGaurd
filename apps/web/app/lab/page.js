import { AppShell } from "../../components/app-shell";
import { LabLiveClient } from "../../components/lab-live-client";
import { defaultBacktestRequest, getApiBaseUrl, postJson } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function LabPage() {
  const apiBaseUrl = getApiBaseUrl();
  const run = await postJson("/api/v1/backtest", defaultBacktestRequest);

  return (
    <AppShell>
      <section className="page-hero">
        <div className="eyebrow">Research Lab</div>
        <h1 className="page-title">Build and score a BTC or ETH strategy across changing regimes.</h1>
        <p className="page-copy">
          Configure symbol, timeframe, lookback, risk limits, and exits, then inspect diagnostics that show where a
          strategy is robust and where it starts to overfit or decay.
        </p>
      </section>
      <LabLiveClient apiBaseUrl={apiBaseUrl} initialRun={run} />
    </AppShell>
  );
}
