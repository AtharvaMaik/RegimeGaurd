import pandas as pd

from services.backtest.metrics import summarize_performance
from services.backtest.strategies import build_signal_frame
from services.common.types import BacktestRequest, BacktestResult
from services.features.indicators import compute_feature_frame
from services.regimes.classifier import classify_regimes


def run_backtest(request: BacktestRequest, candles: pd.DataFrame) -> BacktestResult:
    features = compute_feature_frame(candles)
    signal_curve = build_signal_frame(features, request.strategy, request.lookback_window)
    strategy_returns = features["returns"] * signal_curve.shift(1).fillna(0.0)
    equity_curve = (1 + strategy_returns).cumprod().tolist()
    metrics = summarize_performance(strategy_returns, signal_curve)
    regimes = classify_regimes(features)
    diagnostics = {
        "average_signal_strength": float(signal_curve.abs().mean()),
        "average_volatility": float(features["rolling_volatility"].mean()),
        "average_spread_proxy": float(features["spread_proxy"].mean()),
    }
    return BacktestResult(
        metrics=metrics,
        equity_curve=equity_curve,
        signal_curve=signal_curve.tolist(),
        regime_timeline=regimes,
        diagnostics=diagnostics,
    )

