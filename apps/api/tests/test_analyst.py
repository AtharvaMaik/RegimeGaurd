from services.analyst.summarizer import build_alert_narrative
from services.common.types import WatchdogAlert


def test_build_alert_narrative_mentions_volatility_and_signal_decay() -> None:
    alert = WatchdogAlert(
        alert_type="signal_quality_deteriorating",
        severity="high",
        triggers=["signal_decay", "volatility_jump"],
        recommendation="reduce_size",
        regime="high_volatility_stress",
        message="Signal quality dropped sharply.",
    )

    narrative = build_alert_narrative(
        alert,
        {
            "rolling_volatility": 0.08,
            "signal_strength": 0.21,
            "spread_proxy": 0.04,
        },
    )

    assert "volatility" in narrative.lower()
    assert "signal" in narrative.lower()

