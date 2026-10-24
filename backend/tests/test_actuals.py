from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

import httpx
import pytest
from fastapi.testclient import TestClient

import main
from actuals import ComparisonHour, build_wind_comparison, calculate_accuracy, select_half_hour_actuals
from forecast import select_day_ahead_forecast

DELIVERY_DATE = date(2026, 1, 16)
DECISION_TIME = datetime(2026, 1, 15, 10, 0, tzinfo=timezone.utc)


def forecast_record(
    start_time: str, generation: float, publish_time: str = "2026-01-15T09:30:00Z"
) -> dict:
    return {
        "dataset": "WINDFOR",
        "startTime": start_time,
        "publishTime": publish_time,
        "generation": generation,
    }


def actual_record(
    start_time: str,
    generation: float,
    publish_time: str,
    fuel_type: str = "WIND",
) -> dict:
    return {
        "dataset": "FUELHH",
        "startTime": start_time,
        "publishTime": publish_time,
        "fuelType": fuel_type,
        "generation": generation,
    }


def comparison(
    forecast_generation: float,
    first_actual: float,
    second_actual: float,
):
    forecast = select_day_ahead_forecast(
        [forecast_record("2026-01-16T00:00:00Z", forecast_generation)],
        DECISION_TIME,
        DELIVERY_DATE,
    )
    actuals = select_half_hour_actuals(
        [
            actual_record(
                "2026-01-16T00:00:00Z", first_actual, "2026-01-16T00:30:00Z"
            ),
            actual_record(
                "2026-01-16T00:30:00Z", second_actual, "2026-01-16T01:00:00Z"
            ),
        ],
        DELIVERY_DATE,
    )
    return build_wind_comparison(
        forecast, actuals, datetime(2026, 2, 2, tzinfo=timezone.utc)
    )


def metric_hour(error_mw: float | None) -> ComparisonHour:
    return ComparisonHour(
        target_time=datetime(2026, 1, 16, tzinfo=timezone.utc),
        forecast_mw=None,
        forecast_publish_time=None,
        forecast_status="missing",
        actual_readings=[],
        actual_mw=None,
        actual_status="missing",
        error_mw=error_mw,
    )


def test_averages_two_half_hours_and_calculates_positive_error() -> None:
    result = comparison(12000, 10000, 12000)

    assert result.hours[0].actual_mw == 11000
    assert result.hours[0].error_mw == 1000


def test_negative_error_and_genuine_zero_actual_generation() -> None:
    negative = comparison(10000, 10000, 12000)
    zero = comparison(0, 0, 0)

    assert negative.hours[0].error_mw == -1000
    assert zero.hours[0].actual_mw == 0
    assert zero.hours[0].error_mw == 0
    assert zero.hours[0].actual_status == "available"


def test_missing_or_conflicting_half_hour_makes_actual_and_error_unavailable() -> None:
    forecast = select_day_ahead_forecast(
        [forecast_record("2026-01-16T00:00:00Z", 12000)],
        DECISION_TIME,
        DELIVERY_DATE,
    )
    missing = select_half_hour_actuals(
        [
            actual_record(
                "2026-01-16T00:00:00Z", 10000, "2026-01-16T00:30:00Z"
            )
        ],
        DELIVERY_DATE,
    )
    conflicting = select_half_hour_actuals(
        [
            actual_record(
                "2026-01-16T00:00:00Z", 10000, "2026-01-16T00:30:00Z"
            ),
            actual_record(
                "2026-01-16T00:30:00Z", 12000, "2026-01-16T01:00:00Z"
            ),
            actual_record(
                "2026-01-16T00:30:00Z", 12500, "2026-01-16T01:30:00Z"
            ),
        ],
        DELIVERY_DATE,
    )

    missing_result = build_wind_comparison(forecast, missing, DECISION_TIME)
    conflict_result = build_wind_comparison(forecast, conflicting, DECISION_TIME)

    assert missing_result.hours[0].actual_status == "missing"
    assert missing_result.hours[0].actual_mw is None
    assert missing_result.hours[0].error_mw is None
    assert conflict_result.hours[0].actual_status == "conflict"
    assert conflict_result.hours[0].actual_mw is None
    assert conflict_result.hours[0].error_mw is None


def test_identical_duplicates_collapse_with_latest_publication_provenance() -> None:
    actuals = select_half_hour_actuals(
        [
            actual_record(
                "2026-01-16T00:00:00Z", 10000, "2026-01-16T00:30:00Z"
            ),
            actual_record(
                "2026-01-16T00:00:00Z", 10000, "2026-01-16T01:30:00Z"
            ),
        ],
        DELIVERY_DATE,
    )

    assert actuals.readings[0].status == "available"
    assert actuals.readings[0].generation_mw == 10000
    assert actuals.readings[0].publish_time == datetime(
        2026, 1, 16, 1, 30, tzinfo=timezone.utc
    )


def test_differing_duplicates_conflict_even_when_publication_times_differ() -> None:
    actuals = select_half_hour_actuals(
        [
            actual_record(
                "2026-01-16T00:00:00Z", 10000, "2026-01-16T00:30:00Z"
            ),
            actual_record(
                "2026-01-16T00:00:00Z", 11000, "2026-01-16T01:30:00Z"
            ),
        ],
        DELIVERY_DATE,
    )

    assert actuals.readings[0].status == "conflict"
    assert actuals.readings[0].generation_mw is None


def test_excludes_non_wind_and_timestamps_outside_delivery_day() -> None:
    actuals = select_half_hour_actuals(
        [
            actual_record(
                "2026-01-16T00:00:00Z", 10000, "2026-01-16T00:30:00Z", "GAS"
            ),
            actual_record(
                "2026-01-15T23:30:00Z", 11000, "2026-01-16T00:00:00Z"
            ),
            actual_record(
                "2026-01-17T00:00:00Z", 12000, "2026-01-17T00:30:00Z"
            ),
        ],
        DELIVERY_DATE,
    )

    assert len(actuals.readings) == 48
    assert all(reading.status == "missing" for reading in actuals.readings)


def test_2300_hour_uses_2300_and_2330_readings() -> None:
    forecast = select_day_ahead_forecast(
        [forecast_record("2026-01-16T23:00:00Z", 12000)],
        DECISION_TIME,
        DELIVERY_DATE,
    )
    actuals = select_half_hour_actuals(
        [
            actual_record(
                "2026-01-16T23:00:00Z", 10000, "2026-01-16T23:30:00Z"
            ),
            actual_record(
                "2026-01-16T23:30:00Z", 12000, "2026-01-17T00:00:00Z"
            ),
        ],
        DELIVERY_DATE,
    )

    result = build_wind_comparison(forecast, actuals, DECISION_TIME)

    assert [reading.target_time.hour for reading in result.hours[23].actual_readings] == [
        23,
        23,
    ]
    assert [reading.target_time.minute for reading in result.hours[23].actual_readings] == [
        0,
        30,
    ]
    assert result.hours[23].actual_mw == 11000


def test_matched_coverage_counts_only_valid_forecast_actual_pairs() -> None:
    result = comparison(12000, 10000, 12000)

    assert result.coverage.forecast.available_hours == 1
    assert result.coverage.actual.available_hours == 1
    assert result.coverage.matched.matched_hours == 1
    assert result.coverage.matched.unmatched_hours == 23


def test_january_31_comparison_uses_february_1_actuals(monkeypatch) -> None:
    requested_actual_dates = []
    monkeypatch.setattr(main, "fetch_windfor_records", lambda decision_time: [])
    monkeypatch.setattr(
        main,
        "fetch_fuelhh_records",
        lambda delivery_date: requested_actual_dates.append(delivery_date) or [],
    )

    response = TestClient(main.app).get(
        "/api/wind-comparison?decision_date=2026-01-31&cutoff_time=10:00"
    )

    assert response.status_code == 200
    assert response.json()["delivery_date"] == "2026-02-01"
    assert len(response.json()["hours"]) == 24
    assert requested_actual_dates == [date(2026, 2, 1)]


def test_actual_upstream_failure_is_distinct_and_forecast_endpoint_is_unchanged(
    monkeypatch,
) -> None:
    request = httpx.Request("GET", "https://data.elexon.co.uk")
    monkeypatch.setattr(main, "fetch_windfor_records", lambda decision_time: [])
    monkeypatch.setattr(
        main,
        "fetch_fuelhh_records",
        lambda delivery_date: (_ for _ in ()).throw(
            httpx.ConnectError("offline", request=request)
        ),
    )
    client = TestClient(main.app)

    comparison_response = client.get("/api/wind-comparison")
    forecast_response = client.get("/api/wind-forecast")

    assert comparison_response.status_code == 502
    assert comparison_response.json() == {
        "detail": "Unable to retrieve valid actual wind generation from Elexon"
    }
    assert forecast_response.status_code == 200
    assert len(forecast_response.json()["hours"]) == 24


def test_accuracy_uses_hand_checkable_errors() -> None:
    accuracy = calculate_accuracy([metric_hour(300), metric_hour(-100)])

    assert accuracy.mae_mw == 200
    assert accuracy.bias_mw == 100
    assert accuracy.rmse_mw == pytest.approx(223.60679775)
    assert accuracy.matched_hours == 2
    assert accuracy.unmatched_hours == 22
    assert accuracy.coverage_status == "partial"


def test_perfect_predictions_return_zero_metrics() -> None:
    accuracy = calculate_accuracy([metric_hour(0), metric_hour(0)])

    assert accuracy.mae_mw == 0
    assert accuracy.bias_mw == 0
    assert accuracy.rmse_mw == 0


def test_zero_matched_rows_return_null_metrics_and_unavailable_coverage() -> None:
    accuracy = calculate_accuracy([metric_hour(None) for _ in range(24)])

    assert accuracy.mae_mw is None
    assert accuracy.bias_mw is None
    assert accuracy.rmse_mw is None
    assert accuracy.matched_hours == 0
    assert accuracy.unmatched_hours == 24
    assert accuracy.coverage_status == "unavailable"


def test_one_matched_row_produces_partial_coverage() -> None:
    accuracy = calculate_accuracy([metric_hour(-75)])

    assert accuracy.mae_mw == 75
    assert accuracy.bias_mw == -75
    assert accuracy.rmse_mw == 75
    assert accuracy.coverage_status == "partial"


def test_missing_and_conflicting_rows_are_excluded_from_accuracy() -> None:
    result = comparison(12000, 10000, 12000)

    assert result.accuracy.matched_hours == 1
    assert result.accuracy.mae_mw == 1000
    assert result.accuracy.bias_mw == 1000
    assert result.accuracy.rmse_mw == 1000


def test_genuine_zero_generation_remains_eligible_for_accuracy() -> None:
    result = comparison(300, 0, 0)

    assert result.hours[0].actual_mw == 0
    assert result.accuracy.matched_hours == 1
    assert result.accuracy.mae_mw == 300


def test_accuracy_uses_unrounded_errors() -> None:
    accuracy = calculate_accuracy([metric_hour(0.04), metric_hour(0.06)])

    assert accuracy.mae_mw == pytest.approx(0.05)
    assert accuracy.bias_mw == pytest.approx(0.05)
    assert accuracy.rmse_mw == pytest.approx(0.0509901951)


def test_accuracy_counts_agree_with_matched_coverage() -> None:
    result = comparison(12000, 10000, 12000)

    assert result.accuracy.matched_hours == result.coverage.matched.matched_hours
    assert result.accuracy.unmatched_hours == result.coverage.matched.unmatched_hours
    assert result.accuracy.expected_hours == result.coverage.matched.expected_hours


def test_comparison_api_response_includes_accuracy_summary(monkeypatch) -> None:
    monkeypatch.setattr(
        main,
        "fetch_windfor_records",
        lambda decision_time: [
            forecast_record("2026-01-16T00:00:00Z", 12000),
        ],
    )
    monkeypatch.setattr(
        main,
        "fetch_fuelhh_records",
        lambda delivery_date: [
            actual_record("2026-01-16T00:00:00Z", 10000, "2026-01-16T00:30:00Z"),
            actual_record("2026-01-16T00:30:00Z", 12000, "2026-01-16T01:00:00Z"),
        ],
    )

    response = TestClient(main.app).get("/api/wind-comparison")

    assert response.status_code == 200
    assert response.json()["accuracy"] == {
        "mae_mw": 1000.0,
        "bias_mw": 1000.0,
        "rmse_mw": 1000.0,
        "matched_hours": 1,
        "expected_hours": 24,
        "unmatched_hours": 23,
        "coverage_status": "partial",
    }
