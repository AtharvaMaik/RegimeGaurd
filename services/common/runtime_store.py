from __future__ import annotations

import json
from pathlib import Path
from threading import Lock
from typing import Any


class JsonRuntimeStore:
    def __init__(self, base_dir: Path) -> None:
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self._lock = Lock()

    def _path_for(self, collection: str) -> Path:
        return self.base_dir / f"{collection}.json"

    def _load_collection(self, collection: str) -> dict[str, Any]:
        path = self._path_for(collection)
        if not path.exists():
            return {}
        return json.loads(path.read_text(encoding="utf-8"))

    def _save_collection(self, collection: str, payload: dict[str, Any]) -> None:
        path = self._path_for(collection)
        path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")

    def upsert(self, collection: str, key: str, value: dict[str, Any]) -> None:
        with self._lock:
            payload = self._load_collection(collection)
            payload[key] = value
            self._save_collection(collection, payload)

    def get(self, collection: str, key: str) -> dict[str, Any] | None:
        with self._lock:
            return self._load_collection(collection).get(key)

    def list(self, collection: str) -> list[dict[str, Any]]:
        with self._lock:
            payload = self._load_collection(collection)
            return list(payload.values())
