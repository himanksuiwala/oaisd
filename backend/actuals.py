from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from math import fsum, sqrt
from typing import Any, Literal, Optional

import httpx
from pydantic import BaseModel

from forecast import Coverage, ForecastResponse, parse_utc

ELEXON_FUELHH_URL = "https://data.elexon.co.uk/bmrs/api/v1/datasets/FUELHH/stream"
ALIGNMENT_POLICY = "mean_of_two_half_hourly_average_mw"


class ActualReading(BaseModel):
    target_time: datetime
    generation_mw: Optional[float]
    publish_time: Optional[datetime]
    status: Literal["available", "missing", "conflict"]


class ActualDay(BaseModel):
    source_record_count: int
    readings: list[ActualReading]


class ComparisonHour(BaseModel):
    target_time: datetime
    forecast_mw: Optional[float]
    forecast_publish_time: Optional[datetime]
    forecast_status: Literal["available", "missing", "conflict"]
    actual_readings: list[ActualReading]
    actual_mw: Optional[float]
    actual_status: Literal["available", "missing", "conflict"]
    error_mw: Optional[float]


class MatchedCoverage(BaseModel):
    expected_hours: Literal[24] = 24
    matched_hours: int
    unmatched_hours: int


class ComparisonCoverage(BaseModel):
    forecast: Coverage
    actual: Coverage
    matched: MatchedCoverage


class AccuracySummary(BaseModel):
    mae_mw: Optional[float]
    bias_mw: Optional[float]
    rmse_mw: Optional[float]
    matched_hours: int
    expected_hours: Literal[24] = 24
    unmatched_hours: int
    coverage_status: Literal["complete", "partial", "unavailable"]


class WindComparisonResponse(BaseModel):
    decision_time: datetime
    delivery_date: date
    unit: Literal["MW"] = "MW"
    forecast_source: Literal["Elexon WINDFOR"] = "Elexon WINDFOR"
    actual_source: Literal["Elexon FUELHH"] = "Elexon FUELHH"
    forecast_source_record_count: int
    actual_source_record_count: int
    retrieval_lookback_hours: Literal[24] = 24
    actual_retrieved_at: datetime
    alignment_policy: Literal["mean_of_two_half_hourly_average_mw"] = ALIGNMENT_POLICY
    coverage: ComparisonCoverage
    accuracy: AccuracySummary
    hours: list[ComparisonHour]


def fetch_fuelhh_records(delivery_date: date) -> list[dict[str, Any]]:
    params = {
        "settlementDateFrom": delivery_date.isoformat(),
        "settlementDateTo": delivery_date.isoformat(),
        "fuelType": "WIND",
    }
    with httpx.Client(timeout=15.0) as client:
        response = client.get(ELEXON_FUELHH_URL, params=params)
        response.raise_for_status()
        payload = response.json()

    if not isinstance(payload, list):
        raise ValueError("Elexon FUELHH returned an unexpected response shape")
    return payload


def select_half_hour_actuals(
    records: list[dict[str, Any]], delivery_date: date
) -> ActualDay:
    delivery_start = datetime.combine(delivery_date, datetime.min.time(), timezone.utc)
    delivery_end = delivery_start + timedelta(days=1)
    candidates: dict[datetime, list[tuple[Optional[datetime], float]]] = {}

    for record in records:
        if record.get("fuelType") != "WIND":
            continue
        try:
            target_time = parse_utc(record["startTime"])
            generation = float(record["generation"])
            publish_value = record.get("publishTime")
            publish_time = parse_utc(publish_value) if publish_value else None
        except (KeyError, TypeError, ValueError):
            continue

        if not delivery_start <= target_time < delivery_end:
            continue
        candidates.setdefault(target_time, []).append((publish_time, generation))

    readings: list[ActualReading] = []
    for half_hour_offset in range(48):
        target_time = delivery_start + timedelta(minutes=30 * half_hour_offset)
        target_candidates = candidates.get(target_time, [])
        if not target_candidates:
            readings.append(
                ActualReading(
                    target_time=target_time,
                    generation_mw=None,
                    publish_time=None,
                    status="missing",
                )
            )
            continue

        publish_times = [item[0] for item in target_candidates if item[0] is not None]
        provenance = max(publish_times) if publish_times else None
        generations = {item[1] for item in target_candidates}
        if len(generations) != 1:
            readings.append(
                ActualReading(
                    target_time=target_time,
                    generation_mw=None,
                    publish_time=provenance,
                    status="conflict",
                )
            )
            continue

        readings.append(
            ActualReading(
                target_time=target_time,
                generation_mw=generations.pop(),
                publish_time=provenance,
                status="available",
            )
        )

    return ActualDay(source_record_count=len(records), readings=readings)


def calculate_accuracy(hours: list[ComparisonHour]) -> AccuracySummary:
    """Calculate daily metrics from valid matched hourly errors only."""
    errors = [hour.error_mw for hour in hours if hour.error_mw is not None]
    matched_hours = len(errors)
    unmatched_hours = 24 - matched_hours

    if matched_hours == 0:
        return AccuracySummary(
            mae_mw=None,
            bias_mw=None,
            rmse_mw=None,
            matched_hours=0,
            unmatched_hours=24,
            coverage_status="unavailable",
        )

    mae_mw = fsum(abs(error) for error in errors) / matched_hours
    bias_mw = fsum(errors) / matched_hours
    rmse_mw = sqrt(fsum(error * error for error in errors) / matched_hours)
    return AccuracySummary(
        mae_mw=mae_mw,
        bias_mw=bias_mw,
        rmse_mw=rmse_mw,
        matched_hours=matched_hours,
        unmatched_hours=unmatched_hours,
        coverage_status="complete" if matched_hours == 24 else "partial",
    )


def build_wind_comparison(
    forecast: ForecastResponse,
    actuals: ActualDay,
    actual_retrieved_at: datetime,
) -> WindComparisonResponse:
    actual_by_time = {reading.target_time: reading for reading in actuals.readings}
    hours: list[ComparisonHour] = []

    for forecast_hour in forecast.hours:
        expected_readings = [
            actual_by_time[forecast_hour.target_time],
            actual_by_time[forecast_hour.target_time + timedelta(minutes=30)],
        ]
        statuses = {reading.status for reading in expected_readings}
        if "conflict" in statuses:
            actual_status = "conflict"
            actual_mw = None
        elif "missing" in statuses:
            actual_status = "missing"
            actual_mw = None
        else:
            actual_status = "available"
            actual_mw = sum(
                reading.generation_mw
                for reading in expected_readings
                if reading.generation_mw is not None
            ) / 2

        if (
            forecast_hour.status == "available"
            and forecast_hour.generation_mw is not None
            and actual_status == "available"
            and actual_mw is not None
        ):
            error_mw = forecast_hour.generation_mw - actual_mw
        else:
            error_mw = None

        hours.append(
            ComparisonHour(
                target_time=forecast_hour.target_time,
                forecast_mw=forecast_hour.generation_mw,
                forecast_publish_time=forecast_hour.publish_time,
                forecast_status=forecast_hour.status,
                actual_readings=expected_readings,
                actual_mw=actual_mw,
                actual_status=actual_status,
                error_mw=error_mw,
            )
        )

    actual_available = sum(hour.actual_status == "available" for hour in hours)
    actual_missing = sum(hour.actual_status == "missing" for hour in hours)
    actual_conflicting = sum(hour.actual_status == "conflict" for hour in hours)
    accuracy = calculate_accuracy(hours)

    return WindComparisonResponse(
        decision_time=forecast.decision_time,
        delivery_date=forecast.delivery_date,
        forecast_source_record_count=forecast.source_record_count,
        actual_source_record_count=actuals.source_record_count,
        retrieval_lookback_hours=forecast.retrieval_lookback_hours,
        actual_retrieved_at=actual_retrieved_at,
        coverage=ComparisonCoverage(
            forecast=forecast.coverage,
            actual=Coverage(
                available_hours=actual_available,
                missing_hours=actual_missing,
                conflicting_hours=actual_conflicting,
            ),
            matched=MatchedCoverage(
                matched_hours=accuracy.matched_hours,
                unmatched_hours=accuracy.unmatched_hours,
            ),
        ),
        accuracy=accuracy,
        hours=hours,
    )
