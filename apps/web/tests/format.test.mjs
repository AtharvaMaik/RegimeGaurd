import test from "node:test";
import assert from "node:assert/strict";

import { buildSparklinePoints } from "../lib/chart.js";
import { getApiBaseUrl } from "../lib/api.js";
import { buildStatusTone, formatPercent, titleCase } from "../lib/format.js";
import { buildAgentActivity, buildDisplayChartFrame, buildEquityChartModel, buildEquityCurveSeries, buildLabMetrics, buildLiveContext, buildLiveEquitySeries, buildTickStripValues, getChartValuePrecision, normalizeTradeEntries, rollForwardChartFrame, rollForwardTickSeries } from "../lib/lab.js";

test("formatPercent renders a one-decimal percentage", () => {
  assert.equal(formatPercent(0.0812), "8.1%");
});

test("titleCase capitalizes words", () => {
  assert.equal(titleCase("high volatility stress"), "High Volatility Stress");
});

test("buildStatusTone prefixes status classes", () => {
  assert.equal(buildStatusTone("trending_up"), "status-trending_up");
});

test("getApiBaseUrl trims trailing slash", () => {
  assert.equal(getApiBaseUrl("https://example.com/"), "https://example.com");
});

test("buildSparklinePoints spans the full chart width", () => {
  assert.equal(buildSparklinePoints([10, 20, 15], 120, 60), "0.0000,60.0000 60.0000,0.0000 120.0000,30.0000");
});

test("buildSparklinePoints centers a flat series instead of pinning it to the floor", () => {
  assert.equal(buildSparklinePoints([5, 5, 5], 120, 60), "0.0000,30.0000 60.0000,30.0000 120.0000,30.0000");
});

test("buildEquityCurveSeries preserves live precision for the most recent points", () => {
  assert.deepEqual(buildEquityCurveSeries([1, 1.0001, 1.0002], 3), [0, 0.01, 0.02]);
});

test("buildEquityChartModel creates axis ticks and regime bands", () => {
  const model = buildEquityChartModel([0, 1, 0.5, 2], ["range_bound", "range_bound", "trending_up", "trending_up"]);

  assert.equal(model.yTicks.length, 4);
  assert.equal(model.xTicks.at(-1).label, "Live");
  assert.equal(model.regimeBands.length, 2);
  assert.match(model.path, /^M /);
  assert.match(model.path, / C /);
});

test("buildAgentActivity explains what the AI agents are doing", () => {
  const rows = buildAgentActivity({
    metrics: { max_drawdown: -0.08 },
    regime_timeline: ["range_bound", "high_volatility_stress"],
    diagnostics: {
      average_signal_strength: 0.62,
      average_volatility: 0.018,
      average_spread_proxy: 0.007,
      live_mid_price: 78420.12,
      live_price_change: 0.0008,
      live_signal_exposure: 1,
    },
  }, { latestTickBps: 1.25 });

  assert.equal(rows.length, 4);
  assert.equal(rows[0].name, "SIGNAL_AGENT_01");
  assert.match(rows[3].summary, /Range-bound|High-volatility|volatility/i);
});

test("rollForwardChartFrame appends the newest point and shifts the window", () => {
  const next = rollForwardChartFrame(
    { values: [1, 2, 3], regimes: ["a", "b", "c"] },
    [10, 20, 30],
    ["x", "y", "z"],
  );

  assert.deepEqual(next.values, [2, 3, 30]);
  assert.deepEqual(next.regimes, ["b", "c", "z"]);
});

test("rollForwardTickSeries retains a rolling trade-price trail", () => {
  const next = rollForwardTickSeries({ prices: [100, 101, 102] }, [103, 104], 3);

  assert.deepEqual(next.prices, [102, 103, 104]);
});

test("buildTickStripValues normalizes prices into visible bps values", () => {
  assert.deepEqual(buildTickStripValues([100, 100.1, 100.05]), [0, 10, 5]);
});

test("normalizeTradeEntries accepts trade objects and preserves metadata", () => {
  const entries = normalizeTradeEntries([
    { price: "100.1", qty: "0.2", time: 10, is_buyer_maker: true },
    { price: 100.2, qty: 0.1, time: 11, isBuyerMaker: false },
  ]);

  assert.equal(entries.length, 2);
  assert.equal(entries[0].price, 100.1);
  assert.equal(entries[0].isBuyerMaker, true);
});

test("buildLabMetrics includes live metrics that can move each poll", () => {
  const liveContext = { latestTickBps: -0.44, rangeBps: 2.5, volatilityBps: 0.9, direction: "down" };
  const metrics = buildLabMetrics(
    {
      metrics: { sharpe: 1.2, max_drawdown: -0.05, trades: 30 },
      diagnostics: { live_signal_exposure: 0.75, live_spread_proxy: 0.00012 },
    },
    liveContext,
  );

  assert.equal(metrics[0].label, "Sharpe");
  assert.equal(metrics[2].label, "Live Trades");
  assert.equal(metrics[3].label, "Flow Bias");
  assert.match(metrics[3].hint, /bps/);
});

test("buildLiveContext summarizes the live tick trail", () => {
  const context = buildLiveContext([
    { price: 100, qty: 0.2, time: 1, isBuyerMaker: true },
    { price: 100.01, qty: 0.4, time: 2, isBuyerMaker: false },
    { price: 99.99, qty: 0.1, time: 3, isBuyerMaker: true },
    { price: 100.03, qty: 0.6, time: 4, isBuyerMaker: false },
  ]);

  assert.equal(context.direction, "up");
  assert.ok(context.rangeBps > 0);
  assert.ok(context.volatilityBps > 0);
  assert.equal(context.tradeCount, 4);
});

test("buildDisplayChartFrame injects a visible live tail", () => {
  const frame = buildDisplayChartFrame(
    [0, 0.2, 0.1, 0.25, 0.3, 0.28, 0.32, 0.31],
    Array.from({ length: 8 }, () => "range_bound"),
    [
      { price: 100, qty: 0.1, time: 1, isBuyerMaker: true },
      { price: 100.01, qty: 0.2, time: 2, isBuyerMaker: false },
      { price: 99.99, qty: 0.1, time: 3, isBuyerMaker: true },
      { price: 100.015, qty: 0.3, time: 4, isBuyerMaker: false },
    ],
    4,
  );

  assert.equal(frame.values.length, 8);
  assert.ok(frame.liveTailScale >= 10);
  assert.notDeepEqual(frame.values.slice(-4), [0.3, 0.28, 0.32, 0.31]);
});

test("buildLiveEquitySeries compounds a continuous live tape path", () => {
  const values = buildLiveEquitySeries([
    { price: 100, qty: 0.1, time: 1, isBuyerMaker: true },
    { price: 100.1, qty: 0.2, time: 2, isBuyerMaker: false },
    { price: 99.9, qty: 0.2, time: 3, isBuyerMaker: true },
    { price: 100.15, qty: 0.3, time: 4, isBuyerMaker: false },
  ], 1, 4);

  assert.equal(values.length, 4);
  assert.equal(values[0], 0);
  assert.notEqual(values.at(-1), 0);
});

test("buildLiveEquitySeries still moves when price is flat but order flow changes", () => {
  const values = buildLiveEquitySeries([
    { price: 100, qty: 0.1, time: 1, isBuyerMaker: true },
    { price: 100, qty: 0.6, time: 2, isBuyerMaker: false },
    { price: 100, qty: 0.5, time: 3, isBuyerMaker: false },
    { price: 100, qty: 0.2, time: 4, isBuyerMaker: true },
  ], 1, 4);

  assert.equal(values.length, 4);
  assert.notEqual(values.at(-1), 0);
});

test("getChartValuePrecision increases precision for tiny live ranges", () => {
  assert.equal(getChartValuePrecision([0, -0.0017, -0.0008], 2), 4);
  assert.equal(getChartValuePrecision([0, 0.42, -0.2], 2), 2);
});
