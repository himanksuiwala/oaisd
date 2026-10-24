from __future__ import annotations

import re
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, time, timedelta, timezone
from math import fsum, sqrt
from typing import Callable, Literal, Optional

import httpx
from pydantic import BaseModel

from actuals import (
    ALIGNMENT_POLICY,
    WindComparisonResponse,
    build_wind_comparison,
    fetch_fuelhh_records,
    select_half_hour_actuals,
)
from forecast import (
    DEFAULT_CUTOFF_TIME,
    RETRIEVAL_LOOKBACK_HOURS,
    fetch_windfor_records,
    select_day_ahead_forecast,
)
from source_data import InvalidSourcePayload, records_retrieved_at

FORECAST_FAILURE_MESSAGE = "Unable to retrieve a valid wind forecast from Elexon"
ACTUAL_FAILURE_MESSAGE = "Unable to retrieve valid actual wind generation from Elexon"
ALL_DAYS_FAILURE_MESSAGE = "Unable to retrieve wind data for any requested decision day"


class RangeAccuracySummary(BaseModel):
    mae_mw: Optional[float]
    bias_mw: Optional[float]
    rmse_mw: Optional[float]
    expected_hours: int
    matched_hours: int
    unmatched_hours: int
    successful_day_unmatched_hours: int
    failed_day_hours: int
    coverage_status: Literal["complete", "partial", "unavailable"]


class DailyAccuracyResult(BaseModel):
    decision_date: date
    decision_time: datetime
    delivery_date: date
    retrieval_status: Literal["success", "failed"]
    failed_source: Optional[Literal["forecast", "actual"]] = None
    failure_message: Optional[str] = None
    comparison: Optional[WindComparisonResponse] = None


class RangeDayCounts(BaseModel):
    expected_days: int
    successful_days: int
    failed_days: int


class WindAccuracyResponse(BaseModel):
    decision_date_from: date
    decision_date_to: date
    cutoff_time: str
    first_delivery_date: date
    last_delivery_date: date
    unit: Literal["MW"] = "MW"
    retrieval_lookback_hours: Literal[24] = RETRIEVAL_LOOKBACK_HOURS
    alignment_policy: Literal["mean_of_two_half_hourly_average_mw"] = ALIGNMENT_POLICY
    analysis_completed_at: datetime
    day_counts: RangeDayCounts
    overall_accuracy: RangeAccuracySummary
    days: list[DailyAccuracyResult]


def parse_accuracy_range(
    decision_date_from: str,
    decision_date_to: str,
    cutoff_time: str = DEFAULT_CUTOFF_TIME,
) -> tuple[date, date, time]:
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", decision_date_from):
        raise ValueError("decision_date_from must use YYYY-MM-DD")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", decision_date_to):
        raise ValueError("decision_date_to must use YYYY-MM-DD")
    if not re.fullmatch(r"\d{2}:\d{2}", cutoff_time):
        raise ValueError("cutoff_time must use HH:mm")
    try:
        start = date.fromisoformat(decision_date_from)
        end = date.fromisoformat(decision_date_to)
        cutoff = time.fromisoformat(cutoff_time)
    except ValueError as error:
        raise ValueError("decision dates or cutoff_time contain an invalid value") from error
    january_start = date(2026, 1, 1)
    january_end = date(2026, 1, 31)
    if not january_start <= start <= january_end:
        raise ValueError("decision_date_from must be in January 2026")
    if not january_start <= end <= january_end:
        raise ValueError("decision_date_to must be in January 2026")
    if start > end:
        raise ValueError("decision_date_from must not be after decision_date_to")
    return start, end, cutoff


def retrieve_daily_accuracy(decision_date: date, cutoff: time) -> DailyAccuracyResult:
    decision_time = datetime.combine(decision_date, cutoff, timezone.utc)
    delivery_date = decision_date + timedelta(days=1)
    try:
        forecast_records = fetch_windfor_records(decision_time)
        forecast = select_day_ahead_forecast(
            forecast_records, decision_time, delivery_date
        )
    except (httpx.HTTPError, InvalidSourcePayload):
        return DailyAccuracyResult(
            decision_date=decision_date,
            decision_time=decision_time,
            delivery_date=delivery_date,
            retrieval_status="failed",
            failed_source="forecast",
            failure_message=FORECAST_FAILURE_MESSAGE,
        )

    try:
        actual_records = fetch_fuelhh_records(delivery_date)
        actuals = select_half_hour_actuals(actual_records, delivery_date)
    except (httpx.HTTPError, InvalidSourcePayload):
        return DailyAccuracyResult(
            decision_date=decision_date,
            decision_time=decision_time,
            delivery_date=delivery_date,
            retrieval_status="failed",
            failed_source="actual",
            failure_message=ACTUAL_FAILURE_MESSAGE,
        )

    comparison = build_wind_comparison(
        forecast, actuals, records_retrieved_at(actual_records)
    )
    return DailyAccuracyResult(
        decision_date=decision_date,
        decision_time=decision_time,
        delivery_date=delivery_date,
        retrieval_status="success",
        comparison=comparison,
    )


def calculate_range_accuracy(days: list[DailyAccuracyResult]) -> RangeAccuracySummary:
    expected_hours = len(days) * 24
    successful = [day for day in days if day.retrieval_status == "success"]
    errors = [
        hour.error_mw
        for day in successful
        for hour in day.comparison.hours
        if day.comparison is not None and hour.error_mw is not None
    ]
    matched_hours = len(errors)
    failed_day_hours = (len(days) - len(successful)) * 24
    successful_day_unmatched_hours = len(successful) * 24 - matched_hours
    unmatched_hours = successful_day_unmatched_hours + failed_day_hours

    if matched_hours == 0:
        mae_mw = bias_mw = rmse_mw = None
        coverage_status = "unavailable"
    else:
        mae_mw = fsum(abs(error) for error in errors) / matched_hours
        bias_mw = fsum(errors) / matched_hours
        rmse_mw = sqrt(fsum(error * error for error in errors) / matched_hours)
        coverage_status = "complete" if matched_hours == expected_hours else "partial"

    return RangeAccuracySummary(
        mae_mw=mae_mw,
        bias_mw=bias_mw,
        rmse_mw=rmse_mw,
        expected_hours=expected_hours,
        matched_hours=matched_hours,
        unmatched_hours=unmatched_hours,
        successful_day_unmatched_hours=successful_day_unmatched_hours,
        failed_day_hours=failed_day_hours,
        coverage_status=coverage_status,
    )


def analyze_accuracy_range(
    start: date,
    end: date,
    cutoff: time,
    load_day: Optional[Callable[[date, time], DailyAccuracyResult]] = None,
) -> WindAccuracyResponse:
    loader = load_day or retrieve_daily_accuracy
    decision_dates = [
        start + timedelta(days=offset) for offset in range((end - start).days + 1)
    ]
    with ThreadPoolExecutor(max_workers=4) as executor:
        days = list(executor.map(lambda day: loader(day, cutoff), decision_dates))

    successful_days = sum(day.retrieval_status == "success" for day in days)
    return WindAccuracyResponse(
        decision_date_from=start,
        decision_date_to=end,
        cutoff_time=cutoff.strftime("%H:%M"),
        first_delivery_date=start + timedelta(days=1),
        last_delivery_date=end + timedelta(days=1),
        analysis_completed_at=datetime.now(timezone.utc),
        day_counts=RangeDayCounts(
            expected_days=len(days),
            successful_days=successful_days,
            failed_days=len(days) - successful_days,
        ),
        overall_accuracy=calculate_range_accuracy(days),
        days=days,
    )
