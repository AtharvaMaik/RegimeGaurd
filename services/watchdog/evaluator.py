from services.common.enums import AlertType, RegimeLabel
from services.common.types import WatchdogAlert


def evaluate_watchdog(*, baseline: dict[str, float], telemetry: dict[str, float | str]) -> dict[str, object]:
    return_gap = abs(float(telemetry["current_return"]) - float(baseline["expected_return"]))
    volatility_gap = max(
        0.0,
        float(telemetry["rolling_volatility"]) - float(baseline["expected_volatility"]),
    )
    signal_gap = max(
        0.0,
        float(baseline["expected_signal_strength"]) - float(telemetry["signal_strength"]),
    )
    spread_proxy = float(telemetry["spread_proxy"])
    liquidity_proxy = float(telemetry["liquidity_proxy"])
    anomaly_score = min(1.0, return_gap * 4 + volatility_gap * 5 + signal_gap + spread_proxy + liquidity_proxy)

    triggers: list[str] = []
    alert_type = AlertType.BOT_BEHAVIOR_ANOMALY
    recommendation = "watch_only"
    message = "Telemetry deviates from the backtest baseline."

    if telemetry["regime"] == RegimeLabel.HIGH_VOLATILITY_STRESS.value and volatility_gap > 0.01:
        triggers.append("regime_shift")
        alert_type = AlertType.REGIME_SHIFT_DETECTED
        recommendation = "pause_bot"
        message = "Stress regime detected with volatility far above baseline."
    if signal_gap > 0.35:
        triggers.append("signal_decay")
        alert_type = AlertType.SIGNAL_QUALITY_DETERIORATING
        recommendation = "reduce_size"
        message = "Signal strength decayed relative to the historical baseline."
    if spread_proxy > 0.003 or abs(liquidity_proxy) > 0.2:
        triggers.append("execution_risk")
        alert_type = AlertType.EXECUTION_RISK_ELEVATED
        recommendation = "reduce_size"
        message = "Execution conditions deteriorated because spread and liquidity proxies worsened."
    if return_gap > 0.05 and not triggers:
        triggers.append("pnl_drift")
        alert_type = AlertType.BOT_BEHAVIOR_ANOMALY
        recommendation = "watch_only"

    should_alert = anomaly_score > 0.5 or bool(triggers)
    alert = WatchdogAlert(
        alert_type=alert_type,
        severity="high" if anomaly_score > 0.75 else "medium",
        triggers=triggers or ["anomaly_score"],
        recommendation=recommendation,
        regime=RegimeLabel(str(telemetry["regime"])),
        message=message,
    )
    return {
        "should_alert": should_alert,
        "anomaly_score": anomaly_score,
        "alert": alert,
    }
