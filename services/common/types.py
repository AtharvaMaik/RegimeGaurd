from dataclasses import dataclass, field

from pydantic import BaseModel, ConfigDict

from services.common.enums import AlertType, RegimeLabel, StrategyTemplate, SupportedSymbol


class BacktestRequest(BaseModel):
    model_config = ConfigDict(use_enum_values=False)

    symbol: SupportedSymbol
    strategy: StrategyTemplate
    timeframe: str
    lookback_window: int
    risk_limit: float
    stop_loss: float
    take_profit: float


class WatchdogAlert(BaseModel):
    model_config = ConfigDict(use_enum_values=False)

    alert_type: AlertType
    severity: str
    triggers: list[str]
    recommendation: str
    regime: RegimeLabel
    message: str


@dataclass
class BacktestMetrics:
    total_return: float
    sharpe: float
    sortino: float
    max_drawdown: float
    win_rate: float
    turnover: float
    trades: int


@dataclass
class BacktestResult:
    metrics: BacktestMetrics
    equity_curve: list[float]
    signal_curve: list[float]
    regime_timeline: list[str]
    diagnostics: dict[str, float | int | list[float]] = field(default_factory=dict)

