from __future__ import annotations

from services.analyst.summarizer import build_alert_narrative
from services.common.types import WatchdogAlert


def build_incident_snapshot(
    *,
    incident_id: str,
    session_id: str,
    alert: WatchdogAlert,
    request: dict[str, object],
    telemetry: dict[str, float | str],
    baseline: dict[str, float],
) -> dict[str, object]:
    return {
        "incident_id": incident_id,
        "session_id": session_id,
        "request": request,
        "alert_type": alert.alert_type.value,
        "severity": alert.severity,
        "what_changed": build_alert_narrative(
            alert,
            {
                "rolling_volatility": float(telemetry["rolling_volatility"]),
                "signal_strength": float(telemetry["signal_strength"]),
                "spread_proxy": float(telemetry["spread_proxy"]),
            },
        ),
        "signals_triggered": alert.triggers,
        "strategy_state": {
            "regime": alert.regime.value,
            "expected_return": baseline["expected_return"],
            "current_return": float(telemetry["current_return"]),
            "expected_volatility": baseline["expected_volatility"],
            "current_volatility": float(telemetry["rolling_volatility"]),
            "expected_signal_strength": baseline["expected_signal_strength"],
            "current_signal_strength": float(telemetry["signal_strength"]),
        },
        "recommended_action": alert.recommendation,
        "before_after": {
            "volatility_delta": float(telemetry["rolling_volatility"]) - baseline["expected_volatility"],
            "signal_delta": float(telemetry["signal_strength"]) - baseline["expected_signal_strength"],
            "return_delta": float(telemetry["current_return"]) - baseline["expected_return"],
        },
    }
