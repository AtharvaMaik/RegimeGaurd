import pandas as pd

from services.regimes.classifier import classify_regimes


def test_classify_regimes_marks_stress_periods() -> None:
    frame = pd.DataFrame(
        {
            "close": [100, 101, 103, 96, 90, 92],
            "rolling_volatility": [0.01, 0.02, 0.03, 0.08, 0.11, 0.09],
            "momentum": [0.01, 0.01, 0.02, -0.06, -0.08, -0.03],
            "volume_change": [0.02, 0.01, 0.03, 0.2, 0.3, 0.1],
            "drawdown_slope": [0.0, 0.0, -0.01, -0.04, -0.08, -0.03],
            "spread_proxy": [0.01, 0.01, 0.02, 0.04, 0.06, 0.03],
        }
    )

    labels = classify_regimes(frame)

    assert labels[-2] == "high_volatility_stress"

