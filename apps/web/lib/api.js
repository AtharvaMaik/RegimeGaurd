export function getApiBaseUrl(value = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8010") {
  return value.replace(/\/$/, "");
}

export async function getJson(path) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function postJson(path, body) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
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

export const defaultBacktestRequest = {
  symbol: "BTCUSDT",
  strategy: "momentum_breakout",
  timeframe: "1h",
  lookback_window: 24,
  risk_limit: 0.03,
  stop_loss: 0.02,
  take_profit: 0.05,
};

export const defaultWatchdogRequest = {
  symbol: "ETHUSDT",
  strategy: "volatility_expansion",
  timeframe: "15m",
  lookback_window: 24,
  risk_limit: 0.03,
  stop_loss: 0.02,
  take_profit: 0.04,
};
