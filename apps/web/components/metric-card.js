export function MetricCard({ label, value, tone = "default", hint }) {
  const toneClass =
    tone === "up" ? "trend-up" : tone === "down" ? "trend-down" : tone === "alert" ? "trend-alert" : "";

  return (
    <article className="metric-card">
      <div className="metric-label">{label}</div>
      <div className={`metric-value ${toneClass}`}>{value}</div>
      {hint ? <p className="muted">{hint}</p> : null}
    </article>
  );
}

