from enum import Enum


class SupportedSymbol(str, Enum):
    BTCUSDT = "BTCUSDT"
    ETHUSDT = "ETHUSDT"


class StrategyTemplate(str, Enum):
    MOMENTUM_BREAKOUT = "momentum_breakout"
    MEAN_REVERSION = "mean_reversion"
    VOLATILITY_EXPANSION = "volatility_expansion"


class RegimeLabel(str, Enum):
    TRENDING_UP = "trending_up"
    TRENDING_DOWN = "trending_down"
    RANGE_BOUND = "range_bound"
    HIGH_VOLATILITY_STRESS = "high_volatility_stress"


class AlertType(str, Enum):
    REGIME_SHIFT_DETECTED = "regime_shift_detected"
    SIGNAL_QUALITY_DETERIORATING = "signal_quality_deteriorating"
    EXECUTION_RISK_ELEVATED = "execution_risk_elevated"
    BOT_BEHAVIOR_ANOMALY = "bot_behavior_anomaly"

