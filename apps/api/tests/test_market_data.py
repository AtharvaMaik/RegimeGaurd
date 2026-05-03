from services.market_data.binance import (
    build_liquidity_snapshot,
    normalize_klines_payload,
)


def test_normalize_klines_payload_converts_binance_rows() -> None:
    payload = [
        [
            1710000000000,
            "68000.00",
            "68400.00",
            "67950.00",
            "68320.00",
            "123.45",
            1710003599999,
            "8420000.00",
            1000,
            "60.0",
            "4100000.00",
            "0",
        ]
    ]

    frame = normalize_klines_payload(payload)

    assert list(frame.columns)[:6] == ["open_time", "open", "high", "low", "close", "volume"]
    assert frame.iloc[0]["close"] == 68320.0
    assert frame.iloc[0]["volume"] == 123.45


def test_build_liquidity_snapshot_derives_spread_and_imbalance() -> None:
    snapshot = build_liquidity_snapshot(
        {"bidPrice": "68310.00", "bidQty": "4.2", "askPrice": "68320.00", "askQty": "2.8"},
        {
            "bids": [["68310.00", "4.2"], ["68300.00", "3.0"]],
            "asks": [["68320.00", "2.8"], ["68330.00", "3.3"]],
        },
    )

    assert snapshot["mid_price"] == 68315.0
    assert snapshot["spread_proxy"] > 0
    assert -1.0 <= snapshot["liquidity_proxy"] <= 1.0

