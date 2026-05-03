from datetime import datetime, timezone
from uuid import uuid4

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from pydantic import BaseModel

from apps.api.app.config import settings
from apps.api.app.schemas import BacktestResponse, HealthResponse
from services.analyst.summarizer import build_alert_narrative, build_backtest_narrative, build_incident_live_narrative
from services.backtest.engine import run_backtest
from services.common.runtime_store import JsonRuntimeStore
from services.common.types import BacktestRequest
from services.features.indicators import compute_feature_frame
from services.market_data.binance import (
    build_liquidity_snapshot,
    fetch_book_ticker,
    fetch_live_candles,
    fetch_order_book,
    fetch_recent_trades,
)
from services.watchdog.evaluator import evaluate_watchdog
from services.watchdog.incidents import build_incident_snapshot


app = FastAPI(title=settings.api_name, version=settings.api_version)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r"http://(127\.0\.0\.1|localhost):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

RUNTIME_STORE = JsonRuntimeStore(Path(__file__).resolve().parents[3] / "data" / "runtime")


class SummaryRequest(BaseModel):
    message: str
    telemetry: dict[str, float]


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _enrich_backtest_with_live_mark(request: BacktestRequest, candles, result):
    try:
        liquidity = build_liquidity_snapshot(
            fetch_book_ticker(request.symbol),
            fetch_order_book(request.symbol),
        )
        recent_trades = fetch_recent_trades(request.symbol, limit=120)
    except httpx.HTTPError:
        return result

    last_close = float(candles["close"].iloc[-1]) if not candles.empty else liquidity["mid_price"]
    last_signal = next((float(value) for value in reversed(result.signal_curve) if abs(float(value)) > 1e-6), 0.0)
    live_trade_price = float(recent_trades[-1]["price"]) if recent_trades else liquidity["mid_price"]
    live_price_change = ((live_trade_price / last_close) - 1) if last_close else 0.0
    live_strategy_return = live_price_change * last_signal
    live_equity_point = result.equity_curve[-1] * (1 + live_strategy_return) if result.equity_curve else 1.0

    result.equity_curve = [*result.equity_curve, float(live_equity_point)]
    if result.regime_timeline:
        result.regime_timeline = [*result.regime_timeline, result.regime_timeline[-1]]
    result.diagnostics = {
        **result.diagnostics,
        "live_mid_price": float(liquidity["mid_price"]),
        "live_trade_price": float(live_trade_price),
        "recent_trade_prices": [float(trade["price"]) for trade in recent_trades],
        "recent_trades": [
            {
                "price": float(trade["price"]),
                "qty": float(trade.get("qty", 0.0)),
                "time": int(trade.get("time", 0)),
                "is_buyer_maker": bool(trade.get("isBuyerMaker", False)),
            }
            for trade in recent_trades
        ],
        "live_price_change": float(live_price_change),
        "live_signal_exposure": abs(last_signal),
        "live_spread_proxy": float(liquidity["spread_proxy"]),
    }
    return result


def _fetch_live_backtest(request: BacktestRequest):
    try:
        candles = fetch_live_candles(request.symbol, request.timeframe)
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Unable to fetch live Binance candles: {exc}") from exc
    result = run_backtest(request, candles)
    return candles, _enrich_backtest_with_live_mark(request, candles, result)


def _serialize_request(request: BacktestRequest) -> dict[str, object]:
    return request.model_dump(mode="json")


def _build_experiment_record(experiment_id: str, request: BacktestRequest, result) -> dict[str, object]:
    metrics = result.metrics.__dict__
    current_regime = result.regime_timeline[-1] if result.regime_timeline else "range_bound"
    return {
        "id": experiment_id,
        "symbol": request.symbol.value,
        "strategy": request.strategy.value,
        "timeframe": request.timeframe,
        "request": _serialize_request(request),
        "metrics": metrics,
        "diagnostics": result.diagnostics,
        "current_regime": current_regime,
        "analyst_summary": build_backtest_narrative(
            symbol=request.symbol.value,
            strategy=request.strategy.value,
            metrics=metrics,
            diagnostics=result.diagnostics,
            current_regime=current_regime,
        ),
        "note": "Generated from research lab run",
        "created_at": _utcnow_iso(),
        "updated_at": _utcnow_iso(),
    }


def _hydrate_live_experiment(experiment: dict[str, object]) -> dict[str, object]:
    request_payload = experiment.get("request")
    if not request_payload:
        return {**experiment, "live": None}

    request = BacktestRequest(**request_payload)
    _candles, live_result = _fetch_live_backtest(request)
    live_metrics = live_result.metrics.__dict__
    live_regime = live_result.regime_timeline[-1] if live_result.regime_timeline else "range_bound"
    live_analyst_summary = build_backtest_narrative(
        symbol=request.symbol.value,
        strategy=request.strategy.value,
        metrics=live_metrics,
        diagnostics=live_result.diagnostics,
        current_regime=live_regime,
    )
    return {
        **experiment,
        "live": {
            "metrics": live_metrics,
            "diagnostics": live_result.diagnostics,
            "current_regime": live_regime,
            "analyst_summary": live_analyst_summary,
            "refreshed_at": _utcnow_iso(),
        },
    }


def _build_live_incident_view(incident: dict[str, object]) -> dict[str, object]:
    request_payload = incident.get("request")
    if not request_payload:
        return {
            **incident,
            "live": None,
        }

    request = BacktestRequest(**request_payload)
    _candles, live_result = _fetch_live_backtest(request)
    live_regime = live_result.regime_timeline[-1] if live_result.regime_timeline else "range_bound"
    live_diagnostics = live_result.diagnostics
    live_volatility = float(live_diagnostics.get("average_volatility", 0.0))
    current_signal_strength = float(live_diagnostics.get("average_signal_strength", 0.0))
    current_spread_proxy = float(live_diagnostics.get("live_spread_proxy", live_diagnostics.get("average_spread_proxy", 0.0)))
    live_mid_price = float(live_diagnostics.get("live_mid_price", 0.0))
    baseline_state = incident.get("strategy_state", {})
    expected_return = float(baseline_state.get("expected_return", 0.0))
    current_return = float(live_result.metrics.__dict__.get("total_return", 0.0))
    return {
        **incident,
        "live": {
            "symbol": request.symbol.value,
            "strategy": request.strategy.value,
            "current_regime": live_regime,
            "live_mid_price": live_mid_price,
            "signal_strength": current_signal_strength,
            "spread_proxy": current_spread_proxy,
            "metrics": live_result.metrics.__dict__,
            "analyst_summary": build_incident_live_narrative(
                alert_type=str(incident.get("alert_type", "incident")),
                incident_regime=str(baseline_state.get("regime", "range_bound")),
                live_regime=live_regime,
                live_mid_price=live_mid_price,
                signal_strength=current_signal_strength,
                spread_proxy=current_spread_proxy,
            ),
            "comparison": {
                "volatility_delta_vs_expected": live_volatility - float(baseline_state.get("expected_volatility", 0.0)),
                "signal_delta_vs_expected": current_signal_strength - float(baseline_state.get("expected_signal_strength", 0.0)),
                "return_delta_vs_expected": current_return - expected_return,
                "spread_proxy": current_spread_proxy,
            },
            "refreshed_at": _utcnow_iso(),
        },
    }


def _sort_experiments(experiments: list[dict[str, object]]) -> list[dict[str, object]]:
    def sort_key(experiment: dict[str, object]) -> tuple[int, str]:
        has_live_request = 1 if experiment.get("request") else 0
        created_at = str(experiment.get("created_at", ""))
        return (has_live_request, created_at)

    return sorted(experiments, key=sort_key, reverse=True)


@app.get("/api/v1/health", response_model=HealthResponse)
def healthcheck() -> HealthResponse:
    return HealthResponse(status="ok", service=settings.api_name)


@app.post("/api/v1/backtest", response_model=BacktestResponse)
def backtest(request: BacktestRequest) -> BacktestResponse:
    _candles, result = _fetch_live_backtest(request)
    experiment = _build_experiment_record(str(uuid4()), request, result)
    RUNTIME_STORE.upsert("experiments", experiment["id"], experiment)
    return BacktestResponse(
        metrics=result.metrics.__dict__,
        equity_curve=result.equity_curve,
        regime_timeline=result.regime_timeline,
        diagnostics=result.diagnostics,
    )


@app.post("/api/v1/detect-regime")
def detect_regime(request: BacktestRequest) -> dict[str, object]:
    _candles, result = _fetch_live_backtest(request)
    return {
        "symbol": request.symbol.value,
        "current_regime": result.regime_timeline[-1],
        "timeline": result.regime_timeline,
        "diagnostics": result.diagnostics,
    }


@app.post("/api/v1/watchdog/start")
def start_watchdog(request: BacktestRequest) -> dict[str, object]:
    session_id = str(uuid4())
    _candles, backtest_result = _fetch_live_backtest(request)
    session_payload = {
        "session_id": session_id,
        "status": "active",
        "request": request.model_dump(mode="json"),
        "baseline": {
            "expected_return": backtest_result.metrics.total_return / max(len(backtest_result.equity_curve), 1),
            "expected_volatility": backtest_result.diagnostics["average_volatility"],
            "expected_signal_strength": backtest_result.diagnostics["average_signal_strength"],
        },
        "last_incident_id": None,
    }
    RUNTIME_STORE.upsert("watchdog_sessions", session_id, session_payload)
    return session_payload


@app.post("/api/v1/watchdog/{session_id}/tick")
def tick_watchdog(session_id: str) -> dict[str, object]:
    session = RUNTIME_STORE.get("watchdog_sessions", session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Unknown watchdog session")

    request = BacktestRequest(**session["request"])
    try:
        candles = fetch_live_candles(request.symbol, request.timeframe, limit=120)
        liquidity = build_liquidity_snapshot(
            fetch_book_ticker(request.symbol),
            fetch_order_book(request.symbol),
        )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Unable to fetch live Binance market state: {exc}") from exc
    backtest_result = run_backtest(request, candles)
    feature_frame = compute_feature_frame(candles)
    latest_features = feature_frame.iloc[-1]
    recent_equity = backtest_result.equity_curve[-12:] if len(backtest_result.equity_curve) >= 12 else backtest_result.equity_curve
    current_return = (recent_equity[-1] / recent_equity[0] - 1) if len(recent_equity) > 1 and recent_equity[0] else 0.0
    telemetry = {
        "current_return": current_return,
        "rolling_volatility": float(latest_features["rolling_volatility"]),
        "signal_strength": abs(float(backtest_result.signal_curve[-1])) if backtest_result.signal_curve else 0.0,
        "spread_proxy": liquidity["spread_proxy"],
        "liquidity_proxy": liquidity["liquidity_proxy"],
        "regime": backtest_result.regime_timeline[-1],
        "mid_price": liquidity["mid_price"],
    }
    evaluation = evaluate_watchdog(baseline=session["baseline"], telemetry=telemetry)
    alerts: list[dict[str, object]] = []
    if evaluation["should_alert"]:
        incident_id = str(uuid4())
        alert = evaluation["alert"]
        incident = build_incident_snapshot(
            incident_id=incident_id,
            session_id=session_id,
            alert=alert,
            request=_serialize_request(request),
            telemetry=telemetry,
            baseline=session["baseline"],
        )
        incident["narrative"] = build_alert_narrative(
            alert,
            {
                "rolling_volatility": float(telemetry["rolling_volatility"]),
                "signal_strength": float(telemetry["signal_strength"]),
                "spread_proxy": float(telemetry["spread_proxy"]),
            },
        )
        RUNTIME_STORE.upsert("incidents", incident_id, incident)
        session["last_incident_id"] = incident_id
        RUNTIME_STORE.upsert("watchdog_sessions", session_id, session)
        alerts.append(
            {
                "incident_id": incident_id,
                "alert_type": alert.alert_type.value,
                "severity": alert.severity,
                "recommendation": alert.recommendation,
            }
        )
    return {
        "session": session,
        "telemetry": {
            **telemetry,
            "anomaly_score": evaluation["anomaly_score"],
        },
        "alerts": alerts,
    }


@app.get("/api/v1/watchdog/{session_id}/status")
def watchdog_status(session_id: str) -> dict[str, object]:
    session = RUNTIME_STORE.get("watchdog_sessions", session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Unknown watchdog session")
    return session


@app.get("/api/v1/incidents/{incident_id}")
def incident_detail(incident_id: str) -> dict[str, object]:
    incident = RUNTIME_STORE.get("incidents", incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Unknown incident")
    return incident


@app.post("/api/v1/ai-summary")
def ai_summary(request: SummaryRequest) -> dict[str, str]:
    summary = (
        f"{request.message} Volatility is {request.telemetry.get('rolling_volatility', 0.0):.2%}, "
        f"signal strength is {request.telemetry.get('signal_strength', 0.0):.2f}, "
        f"and spread proxy is {request.telemetry.get('spread_proxy', 0.0):.2%}."
    )
    return {"summary": summary}


@app.get("/api/v1/experiments")
def list_experiments() -> dict[str, object]:
    return {"experiments": _sort_experiments(RUNTIME_STORE.list("experiments"))}


@app.get("/api/v1/experiments/live")
def list_live_experiments() -> dict[str, object]:
    experiments = _sort_experiments(RUNTIME_STORE.list("experiments"))
    hydrated = [_hydrate_live_experiment(experiment) for experiment in experiments]
    return {"experiments": hydrated, "refreshed_at": _utcnow_iso()}


@app.get("/api/v1/incidents/{incident_id}/live")
def incident_live_detail(incident_id: str) -> dict[str, object]:
    incident = RUNTIME_STORE.get("incidents", incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Unknown incident")
    return _build_live_incident_view(incident)
