import pandas as pd

from services.common.enums import StrategyTemplate


def build_signal_frame(frame: pd.DataFrame, strategy: StrategyTemplate, lookback_window: int) -> pd.Series:
    close = frame["close"]
    returns = frame["returns"]
    volatility = frame["rolling_volatility"]

    if strategy is StrategyTemplate.MOMENTUM_BREAKOUT:
        signal = (close > close.rolling(lookback_window, min_periods=1).max().shift(1).fillna(close.iloc[0])).astype(float)
    elif strategy is StrategyTemplate.MEAN_REVERSION:
        moving_average = close.rolling(lookback_window, min_periods=1).mean()
        signal = (close < moving_average * 0.985).astype(float) - (close > moving_average * 1.015).astype(float)
    else:
        vol_threshold = volatility.rolling(lookback_window, min_periods=1).mean().fillna(0.0)
        signal = (volatility > vol_threshold).astype(float) * returns.apply(lambda value: 1.0 if value >= 0 else -1.0)

    return signal.fillna(0.0)

