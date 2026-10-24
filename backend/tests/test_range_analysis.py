from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, time, timedelta, timezone
from threading import Lock
from time import sleep

import httpx
import pytest
from fastapi.testclient import TestClient

import main
import range_analysis
import source_data
from actuals import build_wind_comparison, select_half_hour_actuals
from forecast import select_day_ahead_forecast
from range_analysis import (
    DailyAccuracyResult,
    analyze_accuracy_range,
    calculate_range_accuracy,
    parse_accuracy_range,
)


def make_comparison(decision_date: date, errors: list[float | None]):
    delivery_date = decision_date + timedelta(days=1)
    decision_time = datetime.combine(decision_date, time(10), timezone.utc)
    forecast_records = []
    actual_records = []
    for hour, error in enumerate(errors):
        target = datetime.combine(delivery_date, time(hour), timezone.utc)
        actual = 1000.0
        if error is not None:
            forecast_records.append(
                {
                    "startTime": target.isoformat(),
                    "publishTime": (decision_time - timedelta(minutes=30)).isoformat(),
                    "generation": actual + error,
                }
            )
        for minute in (0, 30):
            half_hour = target + timedelta(minutes=minute)
            actual_records.append(
                {
                    "startTime": half_hour.isoformat(),
                    "publishTime": (half_hour + timedelta(minutes=30)).isoformat(),
                    "fuelType": "WIND",
                    "generation": actual,
                }
            )
    forecast = select_day_ahead_forecast(
        forecast_records, decision_time, delivery_date
    )
    actuals = select_half_hour_actuals(actual_records, delivery_date)
    return build_wind_comparison(forecast, actuals, decision_time)


def success_day(decision_date: date, errors: list[float | None]) -> DailyAccuracyResult:
    comparison = make_comparison(decision_date, errors)
    return DailyAccuracyResult(
        decision_date=decision_date,
        decision_time=comparison.decision_time,
        delivery_date=comparison.delivery_date,
        retrieval_status="success",
        comparison=comparison,
    )


def failed_day(decision_date: date) -> DailyAccuracyResult:
    return DailyAccuracyResult(
        decision_date=decision_date,
        decision_time=datetime.combine(decision_date, time(10), timezone.utc),
        delivery_date=decision_date + timedelta(days=1),
        retrieval_status="failed",
        failed_source="forecast",
        failure_message=range_analysis.FORECAST_FAILURE_MESSAGE,
    )


def test_full_january_has_31_ordered_days_and_744_expected_hours() -> None:
    result = analyze_accuracy_range(
        date(2026, 1, 1),
        date(2026, 1, 31),
        time(10),
        load_day=lambda day, cutoff: success_day(day, []),
    )

    assert len(result.days) == 31
    assert result.overall_accuracy.expected_hours == 744
    assert [day.decision_date for day in result.days] == sorted(
        day.decision_date for day in result.days
    )
    assert result.days[-1].delivery_date == date(2026, 2, 1)


def test_one_day_range_matches_daily_comparison() -> None:
    daily = success_day(date(2026, 1, 15), [300, -100])
    result = analyze_accuracy_range(
        date(2026, 1, 15),
        date(2026, 1, 15),
        time(10),
        load_day=lambda day, cutoff: daily,
    )

    assert result.days[0].comparison == daily.comparison
    assert result.overall_accuracy.mae_mw == daily.comparison.accuracy.mae_mw
    assert result.overall_accuracy.bias_mw == daily.comparison.accuracy.bias_mw
    assert result.overall_accuracy.rmse_mw == daily.comparison.accuracy.rmse_mw


@pytest.mark.parametrize(
    "start,end,cutoff",
    [
        ("2026-01-20", "2026-01-10", "10:00"),
        ("2026/01/01", "2026-01-02", "10:00"),
        ("2025-12-31", "2026-01-02", "10:00"),
        ("2026-01-01", "2026-02-01", "10:00"),
        ("2026-01-01", "2026-01-02", "25:00"),
    ],
)
def test_invalid_ranges_return_422(start: str, end: str, cutoff: str) -> None:
    response = TestClient(main.app).get(
        "/api/wind-accuracy",
        params={
            "decision_date_from": start,
            "decision_date_to": end,
            "cutoff_time": cutoff,
        },
    )
    assert response.status_code == 422


def test_range_constructs_cutoff_and_uses_latest_eligible_forecast(monkeypatch) -> None:
    seen = []
    monkeypatch.setattr(
        range_analysis,
        "fetch_windfor_records",
        lambda decision_time: seen.append(decision_time) or [
            {
                "startTime": "2026-01-03T00:00:00Z",
                "publishTime": "2026-01-02T08:30:00Z",
                "generation": 900,
            },
            {
                "startTime": "2026-01-03T00:00:00Z",
                "publishTime": "2026-01-02T09:30:00Z",
                "generation": 1100,
            },
            {
                "startTime": "2026-01-03T00:00:00Z",
                "publishTime": "2026-01-02T10:30:00Z",
                "generation": 1300,
            },
        ],
    )
    monkeypatch.setattr(
        range_analysis,
        "fetch_fuelhh_records",
        lambda delivery_date: [
            {
                "startTime": f"{delivery_date.isoformat()}T00:00:00Z",
                "publishTime": f"{delivery_date.isoformat()}T00:30:00Z",
                "fuelType": "WIND",
                "generation": 1000,
            },
            {
                "startTime": f"{delivery_date.isoformat()}T00:30:00Z",
                "publishTime": f"{delivery_date.isoformat()}T01:00:00Z",
                "fuelType": "WIND",
                "generation": 1000,
            },
        ],
    )

    result = range_analysis.retrieve_daily_accuracy(date(2026, 1, 2), time(10))

    assert seen == [datetime(2026, 1, 2, 10, tzinfo=timezone.utc)]
    assert result.comparison.hours[0].forecast_mw == 1100
    assert result.comparison.hours[0].error_mw == 100


def test_pooled_metrics_weight_hours_not_daily_summaries() -> None:
    days = [
        success_day(date(2026, 1, 1), [300, -100]),
        success_day(date(2026, 1, 2), [600]),
    ]

    result = calculate_range_accuracy(days)

    assert result.mae_mw == pytest.approx(333.3333333333)
    assert result.bias_mw == pytest.approx(266.6666666667)
    assert result.rmse_mw == pytest.approx(391.578004149)
    daily_rmse_average = sum(day.comparison.accuracy.rmse_mw for day in days) / 2
    assert result.rmse_mw != pytest.approx(daily_rmse_average)


def test_failed_day_stays_in_denominator_and_empty_success_is_distinct() -> None:
    days = [success_day(date(2026, 1, 1), []), failed_day(date(2026, 1, 2))]

    result = calculate_range_accuracy(days)

    assert result.expected_hours == 48
    assert result.matched_hours == 0
    assert result.unmatched_hours == 48
    assert result.successful_day_unmatched_hours == 24
    assert result.failed_day_hours == 24
    assert result.coverage_status == "unavailable"


def test_missing_and_conflicting_hours_are_excluded_but_zero_is_matched() -> None:
    day = success_day(date(2026, 1, 1), [0, None, None])
    day.comparison.hours[2].forecast_status = "conflict"
    result = calculate_range_accuracy([day])
    assert result.matched_hours == 1
    assert result.mae_mw == 0
    assert result.coverage_status == "partial"


def test_all_failed_days_return_502(monkeypatch) -> None:
    failed_result = analyze_accuracy_range(
        date(2026, 1, 1),
        date(2026, 1, 1),
        time(10),
        load_day=lambda day, cutoff: failed_day(day),
    )
    monkeypatch.setattr(main, "analyze_accuracy_range", lambda *args: failed_result)

    response = TestClient(main.app).get(
        "/api/wind-accuracy?decision_date_from=2026-01-01&decision_date_to=2026-01-01"
    )
    assert response.status_code == 502
    assert response.json()["detail"] == range_analysis.ALL_DAYS_FAILURE_MESSAGE


def test_day_concurrency_is_bounded_at_four() -> None:
    active = 0
    maximum = 0
    lock = Lock()

    def load(day: date, cutoff: time) -> DailyAccuracyResult:
        nonlocal active, maximum
        with lock:
            active += 1
            maximum = max(maximum, active)
        sleep(0.02)
        with lock:
            active -= 1
        return success_day(day, [])

    analyze_accuracy_range(date(2026, 1, 1), date(2026, 1, 12), time(10), load)
    assert maximum == 4


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


def test_cache_reuse_expiry_key_separation_and_lru_eviction() -> None:
    now = [0.0]
    cache = source_data.TimedLruCache(max_entries=2, ttl_seconds=10, clock=lambda: now[0])
    retrieved = datetime(2026, 1, 1, tzinfo=timezone.utc)
    cache.put("a", [{"value": 1}], retrieved)
    assert cache.get("a").retrieved_at == retrieved
    assert cache.get("b") is None
    now[0] = 11
    assert cache.get("a") is None
    cache.put("a", [], retrieved)
    cache.put("b", [], retrieved)
    cache.get("a")
    cache.put("c", [], retrieved)
    assert cache.get("b") is None
    assert cache.get("a") is not None


def test_shared_upstream_limit_cache_reuse_and_failure_non_caching(monkeypatch) -> None:
    source_data.clear_source_cache()
    source_data.reset_source_stats()
    active = 0
    maximum = 0
    attempts = 0
    lock = Lock()

    class FakeClient:
        def __init__(self, timeout):
            assert timeout == 15.0

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return None

        def get(self, url, params):
            nonlocal active, maximum, attempts
            with lock:
                active += 1
                attempts += 1
                maximum = max(maximum, active)
            sleep(0.02)
            with lock:
                active -= 1
            if params.get("fail") == "yes":
                raise httpx.ConnectError("offline", request=httpx.Request("GET", url))
            return FakeResponse([])

    monkeypatch.setattr(source_data.httpx, "Client", FakeClient)

    with ThreadPoolExecutor(max_workers=8) as executor:
        list(
            executor.map(
                lambda number: source_data.fetch_records(
                    cache_key=("key", number),
                    url="https://example.test",
                    params={"key": str(number)},
                    invalid_payload_message="bad",
                ),
                range(8),
            )
        )
    assert maximum == 4

    before = attempts
    source_data.fetch_records(
        cache_key=("key", 1),
        url="https://example.test",
        params={"key": "1"},
        invalid_payload_message="bad",
    )
    assert attempts == before

    for _ in range(2):
        with pytest.raises(httpx.ConnectError):
            source_data.fetch_records(
                cache_key=("failure",),
                url="https://example.test",
                params={"fail": "yes"},
                invalid_payload_message="bad",
            )
    assert attempts == before + 2
