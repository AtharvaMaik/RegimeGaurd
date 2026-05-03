import pandas as pd

from services.common.enums import RegimeLabel


def classify_regimes(frame: pd.DataFrame) -> list[str]:
    labels: list[str] = []
    for row in frame.itertuples():
        if row.rolling_volatility >= 0.025 or row.spread_proxy >= 0.025:
            labels.append(RegimeLabel.HIGH_VOLATILITY_STRESS.value)
        elif row.momentum >= 0.02:
            labels.append(RegimeLabel.TRENDING_UP.value)
        elif row.momentum <= -0.02:
            labels.append(RegimeLabel.TRENDING_DOWN.value)
        else:
            labels.append(RegimeLabel.RANGE_BOUND.value)
    return labels
