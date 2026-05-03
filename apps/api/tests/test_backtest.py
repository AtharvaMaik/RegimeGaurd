import pandas as pd

from services.backtest.engine import run_backtest
from services.common.enums import StrategyTemplate
from services.common.types import BacktestRequest


def test_run_backtest_returns_equity_curve_and_metrics() -> None:
    candles = pd.DataFrame(
        {
            "open_time": range(10),
            "open": [100, 101, 102, 103, 104, 105, 104, 103, 104, 105],
            "high": [101, 102, 103, 104, 105, 106, 105, 104, 105, 106],
            "low": [99, 100, 101, 102, 103, 104, 103, 102, 103, 104],
            "close": [100, 101, 102, 103, 104, 105, 104, 103, 104, 106],
            "volume": [10, 11, 12, 13, 14, 13, 12, 11, 12, 14],
        }
    )
    request = BacktestRequest(
        symbol="BTCUSDT",
        strategy=StrategyTemplate.MOMENTUM_BREAKOUT,
        timeframe="1h",
        lookback_window=3,
        risk_limit=0.03,
        stop_loss=0.02,
        take_profit=0.05,
    )

    result = run_backtest(request, candles)

    assert len(result.equity_curve) == len(candles)
    assert result.metrics.total_return != 0
    assert result.metrics.max_drawdown <= 0
    assert result.regime_timeline

