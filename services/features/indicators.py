import numpy as np
import pandas as pd


def compute_feature_frame(frame: pd.DataFrame) -> pd.DataFrame:
    enriched = frame.copy()
    enriched["returns"] = enriched["close"].pct_change().fillna(0.0)
    enriched["rolling_volatility"] = enriched["returns"].rolling(window=5, min_periods=1).std().fillna(0.0)
    enriched["momentum"] = enriched["close"].pct_change(periods=3).fillna(0.0)
    enriched["volume_change"] = enriched["volume"].pct_change().replace([np.inf, -np.inf], 0.0).fillna(0.0)
    enriched["spread_proxy"] = ((enriched["high"] - enriched["low"]) / enriched["close"]).fillna(0.0)
    enriched["liquidity_proxy"] = (
        enriched["spread_proxy"] / enriched["volume"].replace(0, np.nan)
    ).fillna(0.0)
    rolling_peak = enriched["close"].cummax().replace(0, np.nan)
    drawdown = ((enriched["close"] / rolling_peak) - 1).fillna(0.0)
    enriched["drawdown"] = drawdown
    enriched["drawdown_slope"] = drawdown.diff().fillna(0.0)
    return enriched

