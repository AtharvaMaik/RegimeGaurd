import { buildEquityChartModel, buildTickStripValues, getChartValuePrecision } from "../lib/lab";

function formatBps(value) {
  const precision = Math.abs(value) < 0.01 ? 4 : 3;
  return `${value >= 0 ? "+" : ""}${value.toFixed(precision)} bps`;
}

export function SparklineChart({
  values,
  regimes = [],
  livePrice = null,
  liveDrift = null,
  tickPrices = [],
  showTickStrip = true,
  valueSuffix = "%",
}) {
  const model = buildEquityChartModel(values, regimes);
  const precision = getChartValuePrecision(values, 4);
  const latestLabel = `${model.currentPoint.value >= 0 ? "+" : ""}${model.currentPoint.value.toFixed(precision)}${valueSuffix}`;
  const liveDriftLabel =
    liveDrift === null ? null : `${liveDrift >= 0 ? "+" : ""}${(liveDrift * 100).toFixed(3)}%`;
  const tickValues = buildTickStripValues(tickPrices);
  const tickModel = tickValues.length ? buildEquityChartModel(tickValues, Array.from({ length: tickValues.length }, () => "range_bound"), 250, 110) : null;

  return (
    <div className="equity-stage" aria-label="Equity curve stage">
      <div className="equity-stage-metrics">
        <div>
          <span className="chart-meta-label">Range</span>
          <strong>
            {model.yTicks.at(-1)?.label ?? "0.00%"} to {model.yTicks[0]?.label ?? "0.00%"}
          </strong>
        </div>
        <div>
          <span className="chart-meta-label">Latest</span>
          <strong>{latestLabel}</strong>
        </div>
        {livePrice !== null ? (
          <div>
            <span className="chart-meta-label">Live Mid</span>
            <strong>{livePrice.toFixed(3)}</strong>
          </div>
        ) : null}
        {liveDriftLabel ? (
          <div>
            <span className="chart-meta-label">Live Drift</span>
            <strong>{liveDriftLabel}</strong>
          </div>
        ) : null}
      </div>

      <svg viewBox={`0 0 ${model.width} ${model.height}`} className="equity-stage-svg" role="img" aria-label="Equity curve">
        <defs>
          <linearGradient id="equity-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(0, 206, 209, 0.34)" />
            <stop offset="100%" stopColor="rgba(0, 206, 209, 0.02)" />
          </linearGradient>
        </defs>

        {model.regimeBands.map((band, index) => (
          <rect
            key={`${band.regime}-${index}`}
            x={band.x}
            y={band.y}
            width={band.width}
            height={band.height}
            className={`regime-band ${band.className}`}
          />
        ))}

        {model.yTicks.map((tick, index) => (
          <g key={`${tick.label}-${index}`}>
            <line className="equity-grid-line" x1={model.plot.left} x2={model.plot.right} y1={tick.y} y2={tick.y} />
            <text className="equity-axis-label" x={model.plot.left - 12} y={tick.y + 4} textAnchor="end">
              {tick.label}
            </text>
          </g>
        ))}

        {model.xTicks.map((tick, index) => (
          <text key={`${tick.label}-${index}`} className="equity-axis-label equity-axis-label-x" x={tick.x} y={model.height - 14} textAnchor="middle">
            {tick.label}
          </text>
        ))}

        <path className="equity-area" d={model.areaPath} />
        <path className="equity-line" d={model.path} />

        {model.troughPoint ? <circle className="equity-marker equity-marker-low" cx={model.troughPoint.x} cy={model.troughPoint.y} r="4.5" /> : null}
        {model.peakPoint ? <circle className="equity-marker equity-marker-high" cx={model.peakPoint.x} cy={model.peakPoint.y} r="4.5" /> : null}
        <circle className="equity-marker equity-marker-current" cx={model.currentPoint.x} cy={model.currentPoint.y} r="6" />
        <text className="equity-current-label" x={Math.min(model.currentPoint.x + 12, model.width - 70)} y={Math.max(model.currentPoint.y - 10, 18)}>
          Live
        </text>
      </svg>

      {showTickStrip && tickModel ? (
        <div className="tick-strip">
        <div className="tick-strip-head">
          <span className="chart-meta-label">Live Tick Strip</span>
          <strong>{formatBps(tickValues.at(-1))}</strong>
        </div>
          <svg viewBox={`0 0 ${tickModel.width} ${tickModel.height}`} className="tick-strip-svg" role="img" aria-label="Live tick strip">
            {tickModel.yTicks.map((tick, index) => (
              <line key={`${tick.label}-${index}`} className="tick-strip-grid" x1={tickModel.plot.left} x2={tickModel.plot.right} y1={tick.y} y2={tick.y} />
            ))}
            <path className="tick-strip-line" d={tickModel.path} />
            <circle className="tick-strip-marker" cx={tickModel.currentPoint.x} cy={tickModel.currentPoint.y} r="4" />
          </svg>
        </div>
      ) : null}
    </div>
  );
}
