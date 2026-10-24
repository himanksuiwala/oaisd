from datetime import datetime, timezone

import httpx
from fastapi.testclient import TestClient

import main
from forecast import parse_scenario, select_day_ahead_forecast

DEFAULT_DECISION_TIME = datetime(2026, 1, 15, 10, 0, tzinfo=timezone.utc)
DEFAULT_DELIVERY_DATE = datetime(2026, 1, 16, tzinfo=timezone.utc).date()


def record(start_time: str, publish_time: str, generation: float) -> dict:
    return {
        "dataset": "WINDFOR",
        "startTime": start_time,
        "publishTime": publish_time,
        "generation": generation,
    }


def test_selects_latest_publication_at_or_before_cutoff() -> None:
    result = select_day_ahead_forecast(
        [
            record("2026-01-16T00:00:00Z", "2026-01-15T07:30:00Z", 7000),
            record("2026-01-16T00:00:00Z", "2026-01-15T09:30:00Z", 7472),
            record("2026-01-16T00:00:00Z", "2026-01-15T10:30:00Z", 9999),
        ],
        DEFAULT_DECISION_TIME,
        DEFAULT_DELIVERY_DATE,
    )

    first_hour = result.hours[0]
    assert first_hour.generation_mw == 7472
    assert first_hour.publish_time == datetime(2026, 1, 15, 9, 30, tzinfo=timezone.utc)
    assert first_hour.status == "available"
    assert len(result.hours) == 24
    assert all(hour.status == "missing" for hour in result.hours[1:])


def test_collapses_identical_duplicates_and_flags_conflicts() -> None:
    result = select_day_ahead_forecast(
        [
            record("2026-01-16T00:00:00Z", "2026-01-15T09:30:00Z", 7472),
            record("2026-01-16T00:00:00Z", "2026-01-15T09:30:00Z", 7472),
            record("2026-01-16T01:00:00Z", "2026-01-15T09:30:00Z", 7039),
            record("2026-01-16T01:00:00Z", "2026-01-15T09:30:00Z", 7040),
        ],
        DEFAULT_DECISION_TIME,
        DEFAULT_DELIVERY_DATE,
    )

    assert result.hours[0].status == "available"
    assert result.hours[0].generation_mw == 7472
    assert result.hours[1].status == "conflict"
    assert result.hours[1].generation_mw is None


def test_route_returns_fixed_scenario(monkeypatch) -> None:
    monkeypatch.setattr(
        main,
        "fetch_windfor_records",
        lambda decision_time: [
            record("2026-01-16T00:00:00Z", "2026-01-15T09:30:00Z", 7472)
        ],
    )

    response = TestClient(main.app).get("/api/wind-forecast")

    assert response.status_code == 200
    payload = response.json()
    assert payload["decision_time"] == "2026-01-15T10:00:00Z"
    assert payload["delivery_date"] == "2026-01-16"
    assert payload["hours"][0]["generation_mw"] == 7472
    assert len(payload["hours"]) == 24
    assert payload["retrieval_lookback_hours"] == 24
    assert payload["coverage"] == {
        "expected_hours": 24,
        "available_hours": 1,
        "missing_hours": 23,
        "conflicting_hours": 0,
    }


def test_route_reports_upstream_failure(monkeypatch) -> None:
    request = httpx.Request("GET", "https://data.elexon.co.uk")
    monkeypatch.setattr(
        main,
        "fetch_windfor_records",
        lambda decision_time: (_ for _ in ()).throw(
            httpx.ConnectError("offline", request=request)
        ),
    )

    response = TestClient(main.app).get("/api/wind-forecast")

    assert response.status_code == 502
    assert response.json() == {
        "detail": "Unable to retrieve a valid wind forecast from Elexon"
    }


def test_january_boundaries_derive_next_calendar_day(monkeypatch) -> None:
    requested_cutoffs = []
    monkeypatch.setattr(
        main,
        "fetch_windfor_records",
        lambda decision_time: requested_cutoffs.append(decision_time) or [],
    )

    january_first = TestClient(main.app).get(
        "/api/wind-forecast?decision_date=2026-01-01&cutoff_time=00:00"
    )
    january_last = TestClient(main.app).get(
        "/api/wind-forecast?decision_date=2026-01-31&cutoff_time=23:59"
    )

    assert january_first.status_code == 200
    assert january_first.json()["delivery_date"] == "2026-01-02"
    assert january_last.status_code == 200
    assert january_last.json()["delivery_date"] == "2026-02-01"
    assert requested_cutoffs == [
        datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc),
        datetime(2026, 1, 31, 23, 59, tzinfo=timezone.utc),
    ]


def test_rejects_malformed_and_out_of_range_scenarios() -> None:
    client = TestClient(main.app)
    invalid_queries = [
        "decision_date=2026-1-15&cutoff_time=10:00",
        "decision_date=2026-01-32&cutoff_time=10:00",
        "decision_date=2025-12-31&cutoff_time=10:00",
        "decision_date=2026-02-01&cutoff_time=10:00",
        "decision_date=2026-01-15&cutoff_time=9:30",
        "decision_date=2026-01-15&cutoff_time=24:00",
        "decision_date=2026-01-15&cutoff_time=10:00:00",
    ]

    for query in invalid_queries:
        assert client.get(f"/api/wind-forecast?{query}").status_code == 422


def test_changing_cutoff_can_select_a_different_publication() -> None:
    records = [
        record("2026-01-16T00:00:00Z", "2026-01-15T09:30:00Z", 7472),
        record("2026-01-16T00:00:00Z", "2026-01-15T10:30:00Z", 7800),
    ]
    early_cutoff, delivery_date = parse_scenario("2026-01-15", "10:00")
    late_cutoff, _ = parse_scenario("2026-01-15", "11:00")

    early = select_day_ahead_forecast(records, early_cutoff, delivery_date)
    late = select_day_ahead_forecast(records, late_cutoff, delivery_date)

    assert early.hours[0].generation_mw == 7472
    assert early.hours[0].publish_time <= early.decision_time
    assert late.hours[0].generation_mw == 7800
    assert late.hours[0].publish_time <= late.decision_time


def test_empty_result_enumerates_24_missing_hours() -> None:
    result = select_day_ahead_forecast(
        [], DEFAULT_DECISION_TIME, DEFAULT_DELIVERY_DATE
    )

    assert len(result.hours) == 24
    assert result.coverage.available_hours == 0
    assert result.coverage.missing_hours == 24
    assert result.coverage.conflicting_hours == 0
