import pandas as pd
from fastapi.testclient import TestClient

import apps.api.app.main as main_module
from apps.api.app.main import app


client = TestClient(app)


def _build_live_frame() -> pd.DataFrame:
    return pd.DataFrame(
        {
            "open_time": range(20),
            "open": [68000, 68100, 68200, 68300, 68400, 68200, 67900, 67500, 67100, 66900, 67000, 67200, 67400, 67800, 68100, 68400, 68800, 69000, 69200, 69400],
            "high": [68150, 68320, 68490, 68640, 68780, 68650, 68480, 68220, 67980, 67850, 68020, 68310, 68680, 69120, 69640, 70080, 70550, 70980, 71420, 71950],
            "low": [67820, 67890, 67840, 67720, 67580, 67120, 66500, 65800, 65150, 64820, 65050, 65420, 65980, 66620, 67280, 67840, 68410, 68920, 69480, 69920],
            "close": [68080, 68190, 68280, 68410, 68150, 67920, 67520, 67120, 66880, 66980, 67090, 67290, 67580, 67880, 68190, 68580, 68890, 69080, 69380, 69550],
            "volume": [120, 124, 130, 138, 146, 160, 172, 188, 205, 193, 180, 176, 170, 162, 156, 168, 182, 194, 208, 220],
        }
    )


def _patch_live_market(monkeypatch) -> None:
    monkeypatch.setattr(main_module, "fetch_live_candles", lambda symbol, interval, limit=240: _build_live_frame())
    monkeypatch.setattr(
        main_module,
        "fetch_book_ticker",
        lambda symbol: {"bidPrice": "69500.00", "bidQty": "3.4", "askPrice": "69890.00", "askQty": "2.9"},
    )
    monkeypatch.setattr(
        main_module,
        "fetch_order_book",
        lambda symbol, limit=20: {
            "bids": [["69500.00", "3.4"], ["69420.00", "2.1"]],
            "asks": [["69890.00", "2.9"], ["69980.00", "3.2"]],
        },
    )
    monkeypatch.setattr(
        main_module,
        "fetch_recent_trades",
        lambda symbol, limit=24: [
            {"price": "69810.00", "qty": "0.12", "time": 1777749819477, "isBuyerMaker": False},
            {"price": "69822.40", "qty": "0.05", "time": 1777749819848, "isBuyerMaker": False},
            {"price": "69816.20", "qty": "0.08", "time": 1777749819881, "isBuyerMaker": True},
            {"price": "69828.10", "qty": "0.10", "time": 1777749820110, "isBuyerMaker": False},
        ],
    )


def test_healthcheck_returns_ok() -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_cors_preflight_allows_web_app_origin() -> None:
    response = client.options(
        "/api/v1/watchdog/start",
        headers={
            "Origin": "http://127.0.0.1:3001",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:3001"


def test_backtest_endpoint_returns_metrics_and_regimes(monkeypatch) -> None:
    _patch_live_market(monkeypatch)
    response = client.post(
        "/api/v1/backtest",
        json={
            "symbol": "BTCUSDT",
            "strategy": "momentum_breakout",
            "timeframe": "1h",
            "lookback_window": 5,
            "risk_limit": 0.03,
            "stop_loss": 0.02,
            "take_profit": 0.05,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert "metrics" in payload
    assert len(payload["equity_curve"]) > 10
    assert "high_volatility_stress" in payload["regime_timeline"]
    assert "live_mid_price" in payload["diagnostics"]
    assert "live_trade_price" in payload["diagnostics"]
    assert len(payload["diagnostics"]["recent_trade_prices"]) == 4
    assert len(payload["diagnostics"]["recent_trades"]) == 4
    assert len(payload["equity_curve"]) == len(payload["regime_timeline"])


def test_watchdog_endpoints_return_alert_and_incident_details(monkeypatch) -> None:
    _patch_live_market(monkeypatch)
    start = client.post(
        "/api/v1/watchdog/start",
        json={
            "symbol": "ETHUSDT",
            "strategy": "volatility_expansion",
            "timeframe": "15m",
            "lookback_window": 8,
            "risk_limit": 0.03,
            "stop_loss": 0.02,
            "take_profit": 0.04,
        },
    )
    assert start.status_code == 200
    session_id = start.json()["session_id"]

    tick = client.post(f"/api/v1/watchdog/{session_id}/tick")
    assert tick.status_code == 200
    tick_payload = tick.json()
    assert tick_payload["session"]["status"] == "active"
    assert "anomaly_score" in tick_payload["telemetry"]

    incident_id = tick_payload["alerts"][0]["incident_id"]
    incident = client.get(f"/api/v1/incidents/{incident_id}")
    assert incident.status_code == 200
    assert "what_changed" in incident.json()

    live_incident = client.get(f"/api/v1/incidents/{incident_id}/live")
    assert live_incident.status_code == 200
    assert "live" in live_incident.json()
    assert live_incident.json()["live"]["analyst_summary"]


def test_experiments_endpoint_returns_saved_runs(monkeypatch) -> None:
    _patch_live_market(monkeypatch)
    client.post(
        "/api/v1/backtest",
        json={
            "symbol": "BTCUSDT",
            "strategy": "momentum_breakout",
            "timeframe": "1h",
            "lookback_window": 5,
            "risk_limit": 0.03,
            "stop_loss": 0.02,
            "take_profit": 0.05,
        },
    )
    response = client.get("/api/v1/experiments")

    assert response.status_code == 200
    payload = response.json()
    assert payload["experiments"]

    live_response = client.get("/api/v1/experiments/live")
    assert live_response.status_code == 200
    live_payload = live_response.json()
    assert live_payload["experiments"]
    live_experiments = [experiment for experiment in live_payload["experiments"] if experiment["live"]]
    assert live_experiments
    assert live_experiments[0]["live"]["analyst_summary"]
