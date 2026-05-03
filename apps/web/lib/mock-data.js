export const overviewMetrics = [
  { label: "Sharpe", value: "1.84", tone: "up", hint: "Walk-forward adjusted" },
  { label: "Max Drawdown", value: "-9.6%", tone: "down", hint: "Worst regime stress window" },
  { label: "Alert Precision", value: "82%", tone: "alert", hint: "Actionable incidents" },
  { label: "Signal Stability", value: "0.71", tone: "up", hint: "Rolling confidence score" },
];

export const equityPreview = [42, 48, 50, 54, 58, 56, 63, 67, 62, 70, 78, 81];

export const regimeTimeline = [
  "range_bound",
  "trending_up",
  "trending_up",
  "high_volatility_stress",
  "trending_down",
  "range_bound",
];

export const strategyTemplates = [
  {
    name: "Momentum Breakout",
    frame: "BTCUSDT · 1H",
    copy: "Captures directional breaks with higher turnover and tighter stop placement.",
  },
  {
    name: "Mean Reversion",
    frame: "ETHUSDT · 15M",
    copy: "Fades local extremes and performs best when volatility compresses.",
  },
  {
    name: "Volatility Expansion",
    frame: "BTCUSDT · 4H",
    copy: "Leans into regime shifts where realized range expands faster than baseline.",
  },
];

export const liveAlerts = [
  {
    incidentId: "incident-stress-001",
    title: "Regime shift detected",
    regime: "high_volatility_stress",
    summary: "Momentum signal decayed while realized volatility doubled and spread proxy widened.",
    recommendation: "Pause bot or switch to watch-only mode.",
  },
  {
    incidentId: "incident-exec-002",
    title: "Execution risk elevated",
    regime: "trending_down",
    summary: "Liquidity proxy thinned during the selloff and slippage risk moved above threshold.",
    recommendation: "Reduce size and widen alert surveillance.",
  },
];

export const experiments = [
  {
    id: "exp-btc-breakout",
    symbol: "BTCUSDT",
    strategy: "Momentum Breakout",
    sharpe: "1.84",
    maxDrawdown: "-9.6%",
    winRate: "58%",
    note: "Best balance between drawdown control and crisis detection.",
  },
  {
    id: "exp-eth-revert",
    symbol: "ETHUSDT",
    strategy: "Mean Reversion",
    sharpe: "1.29",
    maxDrawdown: "-6.1%",
    winRate: "63%",
    note: "Stable in range-bound periods but weaker during stress transitions.",
  },
];

export const incidentDetails = {
  "incident-stress-001": {
    title: "Regime shift detected",
    whatChanged:
      "Momentum signal decayed while realized volatility doubled and the spread proxy widened into stress territory.",
    triggers: ["signal_decay", "volatility_jump", "execution_risk"],
    action: "Pause bot, cut size by 50%, and wait for trend stability before reactivation.",
    beforeAfter: [
      { label: "Volatility", before: "3.2%", after: "8.1%" },
      { label: "Signal Strength", before: "0.72", after: "0.21" },
      { label: "Spread Proxy", before: "1.3%", after: "4.8%" },
    ],
  },
};

