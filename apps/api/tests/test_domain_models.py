from services.common.enums import AlertType, RegimeLabel, StrategyTemplate, SupportedSymbol
from services.common.types import BacktestRequest, WatchdogAlert


def test_backtest_request_accepts_supported_symbol_and_strategy() -> None:
    request = BacktestRequest(
        symbol=SupportedSymbol.BTCUSDT,
        strategy=StrategyTemplate.MOMENTUM_BREAKOUT,
        timeframe="1h",
        lookback_window=48,
        risk_limit=0.03,
        stop_loss=0.02,
        take_profit=0.05,
    )

    assert request.symbol is SupportedSymbol.BTCUSDT
    assert request.strategy is StrategyTemplate.MOMENTUM_BREAKOUT
    assert request.lookback_window == 48


def test_watchdog_alert_exposes_recommendation_and_triggers() -> None:
    alert = WatchdogAlert(
        alert_type=AlertType.REGIME_SHIFT_DETECTED,
        severity="high",
        triggers=["volatility_jump", "trend_reversal"],
        recommendation="pause_bot",
        regime=RegimeLabel.HIGH_VOLATILITY_STRESS,
        message="Regime moved into stress conditions.",
    )

    assert alert.alert_type is AlertType.REGIME_SHIFT_DETECTED
    assert alert.recommendation == "pause_bot"
    assert "volatility_jump" in alert.triggers

