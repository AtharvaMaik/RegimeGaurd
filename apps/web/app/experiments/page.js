import { AppShell } from "../../components/app-shell";
import { ExperimentsLiveClient } from "../../components/experiments-live-client";
import { SectionHead } from "../../components/section-head";
import { getApiBaseUrl, getJson } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function ExperimentsPage() {
  const apiBaseUrl = getApiBaseUrl();
  const payload = await getJson("/api/v1/experiments/live");

  return (
    <AppShell>
      <section className="page-hero">
        <div className="eyebrow">Experiments</div>
        <h1 className="page-title">Compare live-rehydrated runs, preserve notes, and surface the best regime-aware setups.</h1>
        <p className="page-copy">
          Saved experiments are now refreshed against the current Binance market so the table reads like a live strategy bench, not a stale archive.
        </p>
      </section>

      <section className="section">
        <SectionHead title="Live Experiment Bench" copy="Each row shows the saved configuration overlaid with current market state, current metrics, and the latest analyst read." />
        <ExperimentsLiveClient apiBaseUrl={apiBaseUrl} initialPayload={payload} />
      </section>
    </AppShell>
  );
}
