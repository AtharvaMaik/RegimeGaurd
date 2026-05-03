from services.common.types import WatchdogAlert


def build_alert_narrative(alert: WatchdogAlert, telemetry: dict[str, float]) -> str:
    volatility = telemetry.get("rolling_volatility", 0.0)
    signal_strength = telemetry.get("signal_strength", 0.0)
    spread_proxy = telemetry.get("spread_proxy", 0.0)
    return (
        f"{alert.message} Realized volatility is now {volatility:.2%}, "
        f"signal strength is {signal_strength:.2f}, and spread proxy widened to {spread_proxy:.2%}. "
        f"Recommended action: {alert.recommendation.replace('_', ' ')}."
    )


def build_backtest_narrative(
    *,
    symbol: str,
    strategy: str,
    metrics: dict[str, float | int],
    diagnostics: dict[str, float | int | list[float] | list[dict[str, object]]],
    current_regime: str,
) -> str:
    sharpe = float(metrics.get("sharpe", 0.0))
    win_rate = float(metrics.get("win_rate", 0.0))
    drawdown = float(metrics.get("max_drawdown", 0.0))
    volatility = float(diagnostics.get("average_volatility", 0.0))
    live_mid = float(diagnostics.get("live_mid_price", 0.0) or 0.0)
    return (
        f"{symbol} {strategy.replace('_', ' ')} is trading in {current_regime.replace('_', ' ')} conditions. "
        f"Sharpe is {sharpe:.2f}, trade win rate is {win_rate:.1%}, max drawdown is {drawdown:.1%}, "
        f"average realized volatility is {volatility:.2%}, and the live mid is {live_mid:,.2f}."
    )


def build_incident_live_narrative(
    *,
    alert_type: str,
    incident_regime: str,
    live_regime: str,
    live_mid_price: float,
    signal_strength: float,
    spread_proxy: float,
) -> str:
    return (
        f"{alert_type.replace('_', ' ')} was raised in {incident_regime.replace('_', ' ')} conditions. "
        f"The live tape is now {live_regime.replace('_', ' ')}, mid price is {live_mid_price:,.2f}, "
        f"signal strength is {signal_strength:.2f}, and spread proxy is {spread_proxy:.2%}."
    )
