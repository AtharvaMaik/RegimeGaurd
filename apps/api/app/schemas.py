from typing import Any

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str


class BacktestResponse(BaseModel):
    metrics: dict[str, float | int]
    equity_curve: list[float]
    regime_timeline: list[str]
    diagnostics: dict[str, Any]

