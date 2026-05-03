import { titleCase } from "./format.js";

const AGENT_NAMES = {
  signal: "SIGNAL_AGENT_01",
  regime: "REGIME_AGENT_02",
  risk: "RISK_AGENT_03",
  analyst: "ANALYST_AGENT_04",
};

const REGIME_TONES = {
  trending_up: "regime-band-up",
  trending_down: "regime-band-down",
  range_bound: "regime-band-range",
  high_volatility_stress: "regime-band-stress",
};

function toFiniteNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export function normalizeTradeEntries(entriesOrPrices = []) {
  return entriesOrPrices
    .map((entry, index) => {
      if (typeof entry === "number") {
        return {
          id: `price-${index}`,
          price: entry,
          qty: 0,
          time: index,
          isBuyerMaker: false,
        };
      }

      const price = toFiniteNumber(entry?.price);
      if (price === null) {
        return null;
      }

      return {
        id: entry?.id ?? entry?.time ?? `trade-${index}`,
        price,
        qty: toFiniteNumber(entry?.qty) ?? 0,
        time: Number.isFinite(Number(entry?.time)) ? Number(entry.time) : index,
        isBuyerMaker: Boolean(entry?.is_buyer_maker ?? entry?.isBuyerMaker),
      };
    })
    .filter(Boolean);
}

export function buildEquityCurveSeries(equityCurve, sampleSize = 72) {
  const slice = equityCurve.slice(-sampleSize);
  if (!slice.length) {
    return [];
  }

  const baseline = slice[0] || 1;
  return slice.map((value) => Number((((value / baseline) - 1) * 100).toFixed(4)));
}

export function buildLiveEquitySeries(entriesOrPrices, exposure = 1, sampleSize = 48) {
  const entries = normalizeTradeEntries(entriesOrPrices).slice(-sampleSize);
  if (!entries.length) {
    return [];
  }

  const scaledExposure = Math.max(0, Math.min(1, Math.abs(Number(exposure) || 0)));
  const effectiveExposure = scaledExposure || 1;
  const equityCurve = [1];
  const averageQty =
    entries.reduce((sum, entry) => sum + Math.abs(entry.qty || 0), 0) / Math.max(entries.length, 1) || 1;

  for (let index = 1; index < entries.length; index += 1) {
    const previousEntry = entries[index - 1];
    const currentEntry = entries[index];
    const previousPrice = previousEntry.price || currentEntry.price || 1;
    const currentPrice = currentEntry.price || previousPrice;
    const priceReturn = previousPrice ? ((currentPrice / previousPrice) - 1) * effectiveExposure : 0;
    const normalizedQty = Math.max(-2, Math.min(2, (currentEntry.qty || 0) / averageQty));
    const flowDirection = currentEntry.isBuyerMaker ? -1 : 1;

    // Binance prints many consecutive trades at the same price, so use a tiny flow component
    // to keep the live equity path responsive to buy/sell pressure even when the quote is flat.
    const flowReturn =
      Math.abs(priceReturn) < 0.000001
        ? flowDirection * normalizedQty * 0.00001 * effectiveExposure
        : flowDirection * normalizedQty * 0.0000035 * effectiveExposure;
    const periodReturn = priceReturn + flowReturn;
    equityCurve.push(equityCurve.at(-1) * (1 + periodReturn));
  }

  return equityCurve.map((value) => Number((((value / equityCurve[0]) - 1) * 100).toFixed(4)));
}

export function getChartValuePrecision(values = [], minimum = 2) {
  if (!values.length) {
    return minimum;
  }

  const span = Math.max(...values) - Math.min(...values);
  if (span < 0.01) {
    return Math.max(minimum, 4);
  }
  if (span < 0.1) {
    return Math.max(minimum, 3);
  }
  return minimum;
}

export function rollForwardChartFrame(previousFrame, nextValues, nextRegimes) {
  if (!previousFrame?.values?.length || previousFrame.values.length !== nextValues.length) {
    return { values: nextValues, regimes: nextRegimes.slice(-nextValues.length) };
  }

  return {
    values: [...previousFrame.values.slice(1), nextValues.at(-1)],
    regimes: [...previousFrame.regimes.slice(1), nextRegimes.at(-1) ?? "range_bound"],
  };
}

export function rollForwardTickSeries(previousSeries, nextPrices, maxPoints = 24) {
  const appended = normalizeTradeEntries(Array.isArray(nextPrices) ? nextPrices : [nextPrices]);
  const existing = normalizeTradeEntries(previousSeries?.entries ?? previousSeries?.prices ?? []);
  const merged = [...existing, ...appended];
  const deduped = [];
  const seen = new Set();

  for (let index = merged.length - 1; index >= 0; index -= 1) {
    const entry = merged[index];
    if (seen.has(entry.id)) {
      continue;
    }
    seen.add(entry.id);
    deduped.push(entry);
  }

  const entries = deduped.reverse().slice(-maxPoints);
  return { entries, prices: entries.map((entry) => entry.price) };
}

export function buildTickStripValues(entriesOrPrices) {
  const entries = normalizeTradeEntries(entriesOrPrices);
  if (!entries.length) {
    return [];
  }

  const baseline = entries[0].price || 1;
  return entries.map((entry) => Number((((entry.price / baseline) - 1) * 10000).toFixed(3)));
}

export function buildDisplayChartFrame(values, regimes, entriesOrPrices, tailPoints = 18) {
  const entries = normalizeTradeEntries(entriesOrPrices);
  const tickValues = buildTickStripValues(entries);

  if (!values.length || tickValues.length < 3) {
    return { values, regimes, liveTailScale: 1 };
  }

  const tail = tickValues.slice(-Math.min(tailPoints, tickValues.length));
  const anchorIndex = Math.max(values.length - tail.length - 1, 0);
  const anchorValue = values[anchorIndex] ?? values.at(0) ?? 0;
  const localWindow = values.slice(Math.max(0, anchorIndex - 12), anchorIndex + 1);
  const localRange = Math.max(...localWindow) - Math.min(...localWindow) || 0.24;
  const tickRangePercent = (Math.max(...tail) - Math.min(...tail)) / 100;
  const liveTailScale = tickRangePercent
    ? Math.min(140, Math.max(10, (localRange * 0.42) / Math.max(tickRangePercent, 0.00005)))
    : 14;
  const liveTailValues = tail.map((value) => Number((anchorValue + (value / 100) * liveTailScale).toFixed(4)));
  const nextValues = [...values.slice(0, values.length - liveTailValues.length), ...liveTailValues];
  const tailRegime = regimes.at(-1) ?? "range_bound";
  const nextRegimes = [...regimes.slice(0, regimes.length - liveTailValues.length), ...Array.from({ length: liveTailValues.length }, () => tailRegime)];

  return {
    values: nextValues,
    regimes: nextRegimes,
    liveTailScale: Number(liveTailScale.toFixed(1)),
  };
}

export function buildLiveContext(entriesOrPrices) {
  const entries = normalizeTradeEntries(entriesOrPrices);
  const tickValues = buildTickStripValues(entries);
  if (!tickValues.length) {
    return {
      tickValues: [],
      latestTickBps: 0,
      rangeBps: 0,
      volatilityBps: 0,
      direction: "flat",
      tradeCount: 0,
      momentumBps: 0,
      lastStepBps: 0,
      aggressorBias: 0,
      pacePerMinute: 0,
      tapeState: "No live tape",
    };
  }

  const latestTickBps = tickValues.at(-1);
  const rangeBps = Math.max(...tickValues) - Math.min(...tickValues);
  const deltas = tickValues.slice(1).map((value, index) => value - tickValues[index]);
  const momentumBps = tickValues.at(-1) - tickValues[0];
  const lastStepBps = deltas.at(-1) ?? 0;
  const volatilityBps = deltas.length
    ? Math.sqrt(deltas.reduce((sum, value) => sum + value ** 2, 0) / deltas.length)
    : 0;
  const direction = momentumBps > 0.001 ? "up" : momentumBps < -0.001 ? "down" : "flat";
  const totalQty = entries.reduce((sum, entry) => sum + Math.abs(entry.qty), 0) || 1;
  const aggressorBias = entries.reduce(
    (sum, entry) => sum + (entry.isBuyerMaker ? -1 : 1) * Math.abs(entry.qty || 1),
    0,
  ) / totalQty;
  const firstTime = entries[0]?.time ?? 0;
  const lastTime = entries.at(-1)?.time ?? firstTime;
  const elapsedMinutes = Math.max((lastTime - firstTime) / 60000, 0.01);
  const pacePerMinute = entries.length / elapsedMinutes;
  const tapeState =
    rangeBps < 0.0015
      ? "Compressed"
      : aggressorBias > 0.12 && momentumBps >= 0
        ? "Lifting offers"
        : aggressorBias < -0.12 && momentumBps <= 0
          ? "Hitting bids"
          : Math.sign(lastStepBps) !== Math.sign(momentumBps) && Math.abs(momentumBps) > 0.001
            ? "Reverting"
            : "Two-way churn";

  return {
    tickValues,
    latestTickBps,
    rangeBps: Number(rangeBps.toFixed(3)),
    volatilityBps: Number(volatilityBps.toFixed(3)),
    direction,
    tradeCount: entries.length,
    momentumBps: Number(momentumBps.toFixed(3)),
    lastStepBps: Number(lastStepBps.toFixed(3)),
    aggressorBias: Number(aggressorBias.toFixed(3)),
    pacePerMinute: Number(pacePerMinute.toFixed(1)),
    tapeState,
  };
}

function clampRange(min, max) {
  if (min === max) {
    return [min - 1, max + 1];
  }

  const padding = (max - min) * 0.14;
  return [min - padding, max + padding];
}

function buildTickValues(min, max, count = 4) {
  return Array.from({ length: count }, (_, index) => max - ((max - min) * index) / (count - 1));
}

function sampleLabels(length) {
  if (length <= 1) {
    return [{ index: 0, label: "Live" }];
  }

  return [
    { index: 0, label: `${length - 1} bars ago` },
    { index: Math.floor((length - 1) / 2), label: `${Math.floor((length - 1) / 2)} bars ago` },
    { index: length - 1, label: "Live" },
  ];
}

function findExtreme(values, mode) {
  return values.reduce(
    (selected, value, index) => {
      if (selected === null) {
        return { index, value };
      }
      if (mode === "max" ? value > selected.value : value < selected.value) {
        return { index, value };
      }
      return selected;
    },
    null,
  );
}

function buildSmoothPath(points) {
  if (!points.length) {
    return "";
  }

  if (points.length === 1) {
    return `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  }

  const smoothing = 0.18;
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(index - 1, 0)];
    const current = points[index];
    const next = points[index + 1];
    const after = points[Math.min(index + 2, points.length - 1)];

    const controlPoint1X = current.x + (next.x - previous.x) * smoothing;
    const controlPoint1Y = current.y + (next.y - previous.y) * smoothing;
    const controlPoint2X = next.x - (after.x - current.x) * smoothing;
    const controlPoint2Y = next.y - (after.y - current.y) * smoothing;

    path += ` C ${controlPoint1X.toFixed(2)} ${controlPoint1Y.toFixed(2)}, ${controlPoint2X.toFixed(2)} ${controlPoint2Y.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
  }

  return path;
}

function normalizeRegimes(regimes, length) {
  if (!regimes.length) {
    return Array.from({ length }, () => "range_bound");
  }

  return regimes.slice(-length);
}

function buildRegimeBands(regimes, scaleX, bottom, top) {
  const bands = [];
  let start = 0;

  for (let index = 1; index <= regimes.length; index += 1) {
    if (index === regimes.length || regimes[index] !== regimes[start]) {
      const x = scaleX(start);
      const nextX = scaleX(Math.max(index - 1, start)) + (scaleX(1) - scaleX(0) || 0);
      bands.push({
        regime: regimes[start],
        className: REGIME_TONES[regimes[start]] ?? REGIME_TONES.range_bound,
        x,
        width: Math.max(nextX - x, 12),
        y: top,
        height: bottom - top,
      });
      start = index;
    }
  }

  return bands;
}

export function buildEquityChartModel(values, regimes, width = 760, height = 320) {
  if (!values.length) {
    return {
      path: "",
      areaPath: "",
      currentPoint: { x: 0, y: 0, value: 0 },
      peakPoint: null,
      troughPoint: null,
      yTicks: [],
      xTicks: [],
      regimeBands: [],
      width,
      height,
      plot: { left: 58, top: 24, right: 24, bottom: 278 },
    };
  }

  const plot = {
    left: 58,
    top: 24,
    right: width - 24,
    bottom: height - 42,
  };
  const [minValue, maxValue] = clampRange(Math.min(...values), Math.max(...values));
  const spanX = Math.max(values.length - 1, 1);
  const spanY = maxValue - minValue || 1;
  const scaleX = (index) => plot.left + ((plot.right - plot.left) * index) / spanX;
  const scaleY = (value) => plot.bottom - ((value - minValue) * (plot.bottom - plot.top)) / spanY;

  const points = values.map((value, index) => ({ x: scaleX(index), y: scaleY(value), value }));
  const path = buildSmoothPath(points);
  const areaPath = `${path} L ${points.at(-1).x.toFixed(2)} ${plot.bottom.toFixed(2)} L ${plot.left.toFixed(2)} ${plot.bottom.toFixed(2)} Z`;
  const precision = getChartValuePrecision(values);
  const yTicks = buildTickValues(minValue, maxValue).map((value) => ({
    value,
    label: `${value >= 0 ? "+" : ""}${value.toFixed(precision)}%`,
    y: scaleY(value),
  }));
  const xTicks = sampleLabels(values.length).map(({ index, label }) => ({
    x: scaleX(index),
    label,
  }));
  const alignedRegimes = normalizeRegimes(regimes, values.length);
  const regimeBands = buildRegimeBands(alignedRegimes, scaleX, plot.bottom, plot.top);
  const peak = findExtreme(values, "max");
  const trough = findExtreme(values, "min");

  return {
    width,
    height,
    plot,
    path,
    areaPath,
    points,
    currentPoint: points.at(-1),
    peakPoint: peak ? points[peak.index] : null,
    troughPoint: trough ? points[trough.index] : null,
    yTicks,
    xTicks,
    regimeBands,
  };
}

function buildConfidence(value) {
  return `${Math.round(Math.max(55, Math.min(98, value * 100)))}%`;
}

function buildAnalystSummary(regime, volatility, spread) {
  const regimeLabel = titleCase(regime.replaceAll("_", " "));

  if (volatility > 0.012 || spread > 0.004) {
    return `${regimeLabel} conditions are stressing execution quality and widening the error budget.`;
  }

  return `${regimeLabel} conditions are stable enough for continuous model inspection and postmortem scoring.`;
}

export function buildAgentActivity(run, liveContext = {}) {
  const latestRegime = run.regime_timeline.at(-1) ?? "range_bound";
  const signalStrength = run.diagnostics.average_signal_strength ?? 0;
  const volatility = run.diagnostics.average_volatility ?? 0;
  const spread = run.diagnostics.average_spread_proxy ?? 0;
  const liveDrift = run.diagnostics.live_price_change ?? 0;
  const livePrice = run.diagnostics.live_mid_price ?? 0;
  const exposure = run.diagnostics.live_signal_exposure ?? 0;
  const drawdown = Math.abs(run.metrics.max_drawdown ?? 0);
  const latestTickBps = liveContext.latestTickBps ?? 0;
  const latestTickLabel = `${latestTickBps >= 0 ? "+" : ""}${latestTickBps.toFixed(3)} bps`;
  const rangeBps = liveContext.rangeBps ?? 0;
  const volatilityBps = liveContext.volatilityBps ?? 0;
  const direction = liveContext.direction ?? "flat";
  const tradeCount = liveContext.tradeCount ?? 0;
  const momentumBps = liveContext.momentumBps ?? 0;
  const aggressorBias = liveContext.aggressorBias ?? 0;
  const pacePerMinute = liveContext.pacePerMinute ?? 0;
  const tapeState = liveContext.tapeState ?? "Compressed";
  const biasLabel =
    aggressorBias > 0.08 ? "buyers in control" : aggressorBias < -0.08 ? "sellers in control" : "flow balanced";

  return [
    {
      key: "signal",
      name: AGENT_NAMES.signal,
      status: signalStrength > 0.35 ? (direction === "flat" ? "Tracking" : "Adjusting") : "Scanning",
      confidence: buildConfidence(0.62 + signalStrength * 0.28 + Math.min(0.07, Math.abs(momentumBps) / 8)),
      summary:
        exposure > 0.1
          ? `Holding ${Math.round(exposure * 100)}% exposure while tape is ${tapeState.toLowerCase()} with ${tradeCount} trades and ${biasLabel} around ${livePrice.toFixed(0)}.`
          : `Scanning breakout structure while tape is ${tapeState.toLowerCase()} and printing ${latestTickLabel} on the latest impulse.`,
    },
    {
      key: "regime",
      name: AGENT_NAMES.regime,
      status: latestRegime === "high_volatility_stress" ? "Escalated" : volatilityBps > 0.6 ? "Reclassifying" : "Active",
      confidence: buildConfidence(0.68 + (latestRegime === "range_bound" ? 0.08 : 0.14) + Math.min(0.05, volatilityBps / 20)),
      summary: `Classifying the tape as ${titleCase(latestRegime.replaceAll("_", " "))} while ${tradeCount} trades print ${volatilityBps.toFixed(3)} bps vol and ${momentumBps >= 0 ? "+" : ""}${momentumBps.toFixed(3)} bps momentum.`,
    },
    {
      key: "risk",
      name: AGENT_NAMES.risk,
      status: volatility > 0.012 || spread > 0.004 || drawdown > 0.06 || rangeBps > 1.5 ? "Guarding" : "Nominal",
      confidence: buildConfidence(0.58 + Math.min(0.34, volatility * 16 + spread * 12)),
      summary:
        volatility > 0.012 || spread > 0.004 || rangeBps > 1.5
          ? `Volatility and spread stress are elevated, so size and stop logic are under review while tape pace holds at ${pacePerMinute.toFixed(1)} trades/min.`
          : `Risk envelope is stable. Monitoring live drift at ${(liveDrift * 100).toFixed(3)}% with ${rangeBps.toFixed(3)} bps tape range and ${biasLabel}.`,
    },
    {
      key: "analyst",
      name: AGENT_NAMES.analyst,
      status: "Writing",
      confidence: buildConfidence(0.73 + Math.min(0.18, Math.abs(liveDrift) * 800)),
      summary: `${buildAnalystSummary(latestRegime, volatility, spread)} Live tape is ${tapeState.toLowerCase()} with ${tradeCount} trades, ${pacePerMinute.toFixed(1)} trades/min, and ${biasLabel}.`,
    },
  ];
}

export function buildLabMetrics(run, liveContext = {}) {
  const rangeBps = liveContext.rangeBps ?? 0;
  const volatilityBps = liveContext.volatilityBps ?? 0;
  const tradeCount = liveContext.tradeCount ?? 0;
  const aggressorBias = liveContext.aggressorBias ?? 0;
  const biasValue =
    aggressorBias > 0.08
      ? `${Math.round(aggressorBias * 100)}% buy`
      : aggressorBias < -0.08
        ? `${Math.round(Math.abs(aggressorBias) * 100)}% sell`
        : "Balanced";
  return [
    { label: "Sharpe", value: run.metrics.sharpe.toFixed(2), tone: "up" },
    { label: "Max Drawdown", value: `${(run.metrics.max_drawdown * 100).toFixed(1)}%`, tone: "down" },
    { label: "Live Trades", value: `${tradeCount}`, tone: tradeCount >= 18 ? "up" : "alert" },
    { label: "Flow Bias", value: biasValue, tone: aggressorBias >= 0 ? "up" : "down", hint: `${rangeBps.toFixed(3)} bps range | ${volatilityBps.toFixed(3)} bps vol` },
  ];
}
