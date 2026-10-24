from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass
from datetime import datetime, timezone
from threading import BoundedSemaphore, Lock
from time import monotonic
from typing import Any, Callable, Hashable, Optional

import httpx

CACHE_TTL_SECONDS = 15 * 60
CACHE_MAX_ENTRIES = 128
MAX_ACTIVE_UPSTREAM_REQUESTS = 4


class InvalidSourcePayload(ValueError):
    pass


class SourceRecords(list):
    def __init__(self, records: list[dict[str, Any]], retrieved_at: datetime):
        super().__init__(records)
        self.retrieved_at = retrieved_at


@dataclass
class _CacheEntry:
    records: list[dict[str, Any]]
    retrieved_at: datetime
    expires_at: float


class TimedLruCache:
    def __init__(
        self,
        max_entries: int = CACHE_MAX_ENTRIES,
        ttl_seconds: float = CACHE_TTL_SECONDS,
        clock: Callable[[], float] = monotonic,
    ) -> None:
        self.max_entries = max_entries
        self.ttl_seconds = ttl_seconds
        self.clock = clock
        self._entries: OrderedDict[Hashable, _CacheEntry] = OrderedDict()
        self._lock = Lock()

    def get(self, key: Hashable) -> Optional[SourceRecords]:
        with self._lock:
            entry = self._entries.get(key)
            if entry is None:
                return None
            if entry.expires_at <= self.clock():
                del self._entries[key]
                return None
            self._entries.move_to_end(key)
            return SourceRecords(entry.records, entry.retrieved_at)

    def put(self, key: Hashable, records: list[dict[str, Any]], retrieved_at: datetime) -> None:
        with self._lock:
            self._entries[key] = _CacheEntry(
                records=list(records),
                retrieved_at=retrieved_at,
                expires_at=self.clock() + self.ttl_seconds,
            )
            self._entries.move_to_end(key)
            while len(self._entries) > self.max_entries:
                self._entries.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._entries.clear()


_cache = TimedLruCache()
_upstream_slots = BoundedSemaphore(MAX_ACTIVE_UPSTREAM_REQUESTS)
_stats_lock = Lock()
_upstream_request_count = 0


def fetch_records(
    *,
    cache_key: Hashable,
    url: str,
    params: dict[str, str],
    invalid_payload_message: str,
) -> SourceRecords:
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    global _upstream_request_count
    with _upstream_slots:
        # A second lookup prevents duplicate work when identical requests queued together.
        cached = _cache.get(cache_key)
        if cached is not None:
            return cached
        with _stats_lock:
            _upstream_request_count += 1
        with httpx.Client(timeout=15.0) as client:
            response = client.get(url, params=params)
            response.raise_for_status()
            try:
                payload = response.json()
            except ValueError as error:
                raise InvalidSourcePayload(invalid_payload_message) from error

    if not isinstance(payload, list):
        raise InvalidSourcePayload(invalid_payload_message)

    retrieved_at = datetime.now(timezone.utc)
    records = SourceRecords(payload, retrieved_at)
    _cache.put(cache_key, records, retrieved_at)
    return records


def records_retrieved_at(records: list[dict[str, Any]]) -> datetime:
    return getattr(records, "retrieved_at", datetime.now(timezone.utc))


def clear_source_cache() -> None:
    _cache.clear()


def reset_source_stats() -> None:
    global _upstream_request_count
    with _stats_lock:
        _upstream_request_count = 0


def get_source_stats() -> dict[str, int]:
    with _stats_lock:
        return {"upstream_requests": _upstream_request_count}
