import pandas as pd

from services.features.indicators import compute_feature_frame


def test_compute_feature_frame_adds_quant_columns() -> None:
    frame = pd.DataFrame(
        {
            "open_time": range(6),
            "open": [100.0, 101.0, 102.0, 101.5, 103.0, 104.0],
            "high": [101.0, 102.0, 103.0, 102.0, 104.0, 105.0],
            "low": [99.0, 100.0, 101.0, 100.5, 102.0, 103.0],
            "close": [100.5, 101.5, 102.5, 101.0, 103.5, 104.5],
            "volume": [20.0, 25.0, 30.0, 40.0, 35.0, 45.0],
        }
    )

    enriched = compute_feature_frame(frame)

    assert {"returns", "rolling_volatility", "momentum", "volume_change", "spread_proxy"}.issubset(
        enriched.columns
    )
    assert enriched["spread_proxy"].iloc[-1] > 0

