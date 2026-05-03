from pathlib import Path

from services.common.runtime_store import JsonRuntimeStore


def test_runtime_store_persists_records_to_disk(tmp_path: Path) -> None:
    store = JsonRuntimeStore(tmp_path / "runtime")

    store.upsert("incidents", "incident-1", {"incident_id": "incident-1", "status": "open"})
    reloaded = JsonRuntimeStore(tmp_path / "runtime")

    assert reloaded.get("incidents", "incident-1") == {"incident_id": "incident-1", "status": "open"}


def test_runtime_store_lists_saved_records(tmp_path: Path) -> None:
    store = JsonRuntimeStore(tmp_path / "runtime")

    store.upsert("experiments", "exp-1", {"id": "exp-1", "symbol": "BTCUSDT"})
    store.upsert("experiments", "exp-2", {"id": "exp-2", "symbol": "ETHUSDT"})

    listed = store.list("experiments")

    assert {record["id"] for record in listed} == {"exp-1", "exp-2"}
