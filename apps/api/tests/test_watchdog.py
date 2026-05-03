from services.common.enums import RegimeLabel
from services.watchdog.evaluator import evaluate_watchdog


def test_evaluate_watchdog_returns_alert_when_risk_spikes() -> None:
    baseline = {
        "expected_return": 0.02,
        "expected_volatility": 0.03,
        "expected_signal_strength": 0.7,
    }
    telemetry = {
        "current_return": -0.04,
        "rolling_volatility": 0.09,
        "signal_strength": 0.2,
        "spread_proxy": 0.05,
        "liquidity_proxy": 0.25,
        "regime": RegimeLabel.HIGH_VOLATILITY_STRESS.value,
    }

    result = evaluate_watchdog(baseline=baseline, telemetry=telemetry)

    assert result["should_alert"] is True
    assert result["alert"].recommendation in {"reduce_size", "pause_bot"}
    assert result["anomaly_score"] > 0.5

