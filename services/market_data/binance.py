from __future__ import annotations

import os
from typing import Any

import httpx
import pandas as pd

from services.common.enums import SupportedSymbol


BINANCE_API_BASE_URL = os.getenv("BINANCE_API_BASE_URL", "https://api.binance.com")


def normalize_klines_payload(payload: list[list[Any]]) -> pd.DataFrame:
    rows = [
        {
            "open_time": int(row[0]),
            "open": float(row[1]),
            "high": float(row[2]),
            "low": float(row[3]),
            "close": float(row[4]),
            "volume": float(row[5]),
            "close_time": int(row[6]),
            "quote_volume": float(row[7]),
            "trade_count": int(row[8]),
        }
        for row in payload
    ]
    return pd.DataFrame(rows)


def build_liquidity_snapshot(
    book_ticker: dict[str, Any],
    depth: dict[str, list[list[str]]],
) -> dict[str, float]:
    bid_price = float(book_ticker["bidPrice"])
    ask_price = float(book_ticker["askPrice"])
    bid_qty = float(book_ticker["bidQty"])
    ask_qty = float(book_ticker["askQty"])
    mid_price = (bid_price + ask_price) / 2
    spread_proxy = (ask_price - bid_price) / mid_price if mid_price else 0.0

    total_bid_depth = sum(float(level[1]) for level in depth.get("bids", []))
    total_ask_depth = sum(float(level[1]) for level in depth.get("asks", []))
    denominator = total_bid_depth + total_ask_depth
    liquidity_proxy = ((total_bid_depth - total_ask_depth) / denominator) if denominator else 0.0

    return {
        "bid_price": bid_price,
        "ask_price": ask_price,
        "bid_qty": bid_qty,
        "ask_qty": ask_qty,
        "mid_price": mid_price,
        "spread_proxy": spread_proxy,
        "liquidity_proxy": liquidity_proxy,
    }


def _get_json(path: str, params: dict[str, Any]) -> Any:
    response = httpx.get(
        f"{BINANCE_API_BASE_URL}{path}",
        params=params,
        timeout=10.0,
        headers={"Accept": "application/json"},
    )
    response.raise_for_status()
    return response.json()


def fetch_live_candles(
    symbol: SupportedSymbol,
    interval: str,
    limit: int = 240,
) -> pd.DataFrame:
    payload = _get_json(
        "/api/v3/klines",
        {"symbol": symbol.value, "interval": interval.lower(), "limit": limit},
    )
    return normalize_klines_payload(payload)


def fetch_book_ticker(symbol: SupportedSymbol) -> dict[str, Any]:
    return _get_json("/api/v3/ticker/bookTicker", {"symbol": symbol.value})


def fetch_order_book(symbol: SupportedSymbol, limit: int = 20) -> dict[str, Any]:
    return _get_json("/api/v3/depth", {"symbol": symbol.value, "limit": limit})


def fetch_recent_trades(symbol: SupportedSymbol, limit: int = 24) -> list[dict[str, Any]]:
    return _get_json("/api/v3/trades", {"symbol": symbol.value, "limit": limit})
