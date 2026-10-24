from __future__ import annotations

import re
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Literal, Optional

import httpx
from pydantic import BaseModel, ConfigDict

ELEXON_WINDFOR_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets/WINDFOR/stream"
DEFAULT_DECISION_DATE = "2026-01-15"
DEFAULT_CUTOFF_TIME = "10:00"
RETRIEVAL_LOOKBACK_HOURS = 24


class ForecastHour(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    target_time: datetime
    generation_mw: Optional[float]
    publish_time: Optional[datetime]
    status: Literal["available", "missing", "conflict"]


class ForecastResponse(BaseModel):
    decision_time: datetime
    delivery_date: date
    unit: Literal["MW"] = "MW"
    source: Literal["Elexon WINDFOR"] = "Elexon WINDFOR"
    source_record_count: int
    retrieval_lookback_hours: Literal[24] = RETRIEVAL_LOOKBACK_HOURS
    coverage: "Coverage"
    hours: list[ForecastHour]


class Coverage(BaseModel):
    expected_hours: Literal[24] = 24
    available_hours: int
    missing_hours: int
    conflicting_hours: int


ForecastResponse.model_rebuild()


def parse_scenario(decision_date: str, cutoff_time: str) -> tuple[datetime, date]:
    """Strictly parse a January 2026 UTC decision and its next-day delivery."""
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", decision_date):
        raise ValueError("decision_date must use YYYY-MM-DD")
    if not re.fullmatch(r"\d{2}:\d{2}", cutoff_time):
        raise ValueError("cutoff_time must use HH:mm")

    try:
        parsed_date = date.fromisoformat(decision_date)
        parsed_time = time.fromisoformat(cutoff_time)
    except ValueError as error:
        raise ValueError("decision_date or cutoff_time is not a valid value") from error

    if not date(2026, 1, 1) <= parsed_date <= date(2026, 1, 31):
        raise ValueError("decision_date must be in January 2026")

    decision_time = datetime.combine(parsed_date, parsed_time, timezone.utc)
    return decision_time, parsed_date + timedelta(days=1)


def fetch_windfor_records(decision_time: datetime) -> list[dict[str, Any]]:
    """Fetch the publications available during the 24 hours before the cutoff."""
    params = {
        "publishDateTimeFrom": (
            decision_time - timedelta(hours=RETRIEVAL_LOOKBACK_HOURS)
        ).isoformat(),
        "publishDateTimeTo": decision_time.isoformat(),
    }
    with httpx.Client(timeout=15.0) as client:
        response = client.get(ELEXON_WINDFOR_URL, params=params)
        response.raise_for_status()
        payload = response.json()

    if not isinstance(payload, list):
        raise ValueError("Elexon WINDFOR returned an unexpected response shape")
    return payload


def select_day_ahead_forecast(
    records: list[dict[str, Any]],
    decision_time: datetime,
    delivery_date: date,
) -> ForecastResponse:
    """Select the latest eligible forecast publication for every delivery hour."""
    delivery_start = datetime.combine(delivery_date, datetime.min.time(), timezone.utc)
    delivery_end = delivery_start + timedelta(days=1)
    candidates: dict[datetime, list[tuple[datetime, float]]] = {}

    for record in records:
        try:
            target_time = _parse_utc(record["startTime"])
            publish_time = _parse_utc(record["publishTime"])
            generation = float(record["generation"])
        except (KeyError, TypeError, ValueError):
            continue

        if not delivery_start <= target_time < delivery_end:
            continue
        if publish_time > decision_time:
            continue
        candidates.setdefault(target_time, []).append((publish_time, generation))

    hours: list[ForecastHour] = []
    for hour_offset in range(24):
        target_time = delivery_start + timedelta(hours=hour_offset)
        target_candidates = candidates.get(target_time, [])
        if not target_candidates:
            hours.append(
                ForecastHour(
                    target_time=target_time,
                    generation_mw=None,
                    publish_time=None,
                    status="missing",
                )
            )
            continue

        selected_publish_time = max(item[0] for item in target_candidates)
        selected_generations = {
            generation
            for publish_time, generation in target_candidates
            if publish_time == selected_publish_time
        }
        if len(selected_generations) != 1:
            hours.append(
                ForecastHour(
                    target_time=target_time,
                    generation_mw=None,
                    publish_time=selected_publish_time,
                    status="conflict",
                )
            )
            continue

        hours.append(
            ForecastHour(
                target_time=target_time,
                generation_mw=selected_generations.pop(),
                publish_time=selected_publish_time,
                status="available",
            )
        )

    available_hours = sum(hour.status == "available" for hour in hours)
    missing_hours = sum(hour.status == "missing" for hour in hours)
    conflicting_hours = sum(hour.status == "conflict" for hour in hours)

    return ForecastResponse(
        decision_time=decision_time,
        delivery_date=delivery_date,
        source_record_count=len(records),
        coverage=Coverage(
            available_hours=available_hours,
            missing_hours=missing_hours,
            conflicting_hours=conflicting_hours,
        ),
        hours=hours,
    )


def _parse_utc(value: str) -> datetime:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Timestamp must include a UTC offset")
    return parsed.astimezone(timezone.utc)
