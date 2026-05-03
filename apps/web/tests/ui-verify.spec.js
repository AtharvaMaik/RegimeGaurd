import fs from "fs";
import path from "path";

import { expect, test } from "@playwright/test";

const WEB_BASE_URL = process.env.WEB_BASE_URL ?? "http://127.0.0.1:3001";
const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8010";
const SCREENSHOT_DIR = path.join(process.cwd(), "artifacts", "ui-check");

function ensureScreenshotDir() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function collectConsole(page) {
  const events = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      events.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    events.push(`pageerror: ${error.message}`);
  });
  return events;
}

test.describe("RegimeGuard live UI verification", () => {
  test("renders primary routes and live incident flow", async ({ page, request }) => {
    ensureScreenshotDir();
    const consoleEvents = await collectConsole(page);

    const backtestPayload = {
      symbol: "BTCUSDT",
      strategy: "momentum_breakout",
      timeframe: "1h",
      lookback_window: 24,
      risk_limit: 0.03,
      stop_loss: 0.02,
      take_profit: 0.05,
    };

    const watchdogPayload = {
      symbol: "ETHUSDT",
      strategy: "volatility_expansion",
      timeframe: "15m",
      lookback_window: 24,
      risk_limit: 0.03,
      stop_loss: 0.02,
      take_profit: 0.04,
    };

    const home = await page.goto(WEB_BASE_URL, { waitUntil: "networkidle" });
    expect(home?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: /backtest a crypto strategy/i })).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "home.png"), fullPage: true });

    await page.goto(`${WEB_BASE_URL}/lab`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /build and score a btc or eth strategy/i })).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "lab.png"), fullPage: true });

    await page.goto(`${WEB_BASE_URL}/experiments`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /compare runs, preserve notes/i })).toBeVisible();
    await expect(page.locator("table")).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "experiments.png"), fullPage: true });

    const startResponse = await request.post(`${API_BASE_URL}/api/v1/watchdog/start`, {
      data: watchdogPayload,
    });
    expect(startResponse.ok()).toBeTruthy();
    const started = await startResponse.json();

    const tickResponse = await request.post(`${API_BASE_URL}/api/v1/watchdog/${started.session_id}/tick`);
    expect(tickResponse.ok()).toBeTruthy();
    const tick = await tickResponse.json();

    await page.goto(`${WEB_BASE_URL}/monitor`, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /monitor price action, regime shifts/i })).toBeVisible();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "monitor.png"), fullPage: true });

    expect(tick.telemetry).toBeTruthy();
    if (tick.alerts.length > 0) {
      const incidentId = tick.alerts[0].incident_id;
      await page.goto(`${WEB_BASE_URL}/incident/${incidentId}`, { waitUntil: "networkidle" });
      await expect(page.locator("h1.page-title")).toBeVisible();
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, "incident.png"), fullPage: true });
    }

    const backtestResponse = await request.post(`${API_BASE_URL}/api/v1/backtest`, {
      data: backtestPayload,
    });
    expect(backtestResponse.ok()).toBeTruthy();

    expect(consoleEvents, consoleEvents.join("\n")).toEqual([]);
  });
});
