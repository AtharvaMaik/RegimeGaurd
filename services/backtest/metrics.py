import math

import pandas as pd

from services.common.types import BacktestMetrics


def summarize_trade_outcomes(strategy_returns: pd.Series, signal_curve: pd.Series) -> list[float]:
    executed_signal = signal_curve.shift(1).fillna(0.0)
    active_returns = strategy_returns.where(executed_signal != 0, 0.0)
    trade_returns: list[float] = []
    running_return = 0.0
    in_trade = False

    for signal_value, period_return in zip(executed_signal.tolist(), active_returns.tolist()):
        if signal_value != 0:
            running_return = ((1 + running_return) * (1 + float(period_return))) - 1
            in_trade = True
            continue

        if in_trade:
            trade_returns.append(running_return)
            running_return = 0.0
            in_trade = False

    if in_trade:
        trade_returns.append(running_return)

    return trade_returns


def summarize_performance(strategy_returns: pd.Series, signal_curve: pd.Series) -> BacktestMetrics:
    equity_curve = (1 + strategy_returns).cumprod()
    total_return = float(equity_curve.iloc[-1] - 1)
    volatility = float(strategy_returns.std(ddof=0) or 0.0)
    downside = strategy_returns.where(strategy_returns < 0, 0.0)
    downside_volatility = float(downside.std(ddof=0) or 0.0)
    sharpe = float((strategy_returns.mean() / volatility) * math.sqrt(252)) if volatility else 0.0
    sortino = float((strategy_returns.mean() / downside_volatility) * math.sqrt(252)) if downside_volatility else 0.0
    drawdown = equity_curve / equity_curve.cummax() - 1
    active_positions = signal_curve.diff().abs().fillna(signal_curve.abs())
    trade_returns = summarize_trade_outcomes(strategy_returns, signal_curve)
    winning_trades = [trade_return for trade_return in trade_returns if trade_return > 0]
    return BacktestMetrics(
        total_return=total_return,
        sharpe=sharpe,
        sortino=sortino,
        max_drawdown=float(drawdown.min()),
        win_rate=float(len(winning_trades) / len(trade_returns)) if len(trade_returns) else 0.0,
        turnover=float(active_positions.sum()),
        trades=int((active_positions > 0).sum()),
    )
