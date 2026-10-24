from datetime import datetime, timezone

import httpx
from fastapi.testclient import TestClient

import main
from forecast import select_day_ahead_forecast


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
        ]
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
        ]
    )

    assert result.hours[0].status == "available"
    assert result.hours[0].generation_mw == 7472
    assert result.hours[1].status == "conflict"
    assert result.hours[1].generation_mw is None


def test_route_returns_fixed_scenario(monkeypatch) -> None:
    monkeypatch.setattr(
        main,
        "fetch_windfor_records",
        lambda: [
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


def test_route_reports_upstream_failure(monkeypatch) -> None:
    request = httpx.Request("GET", "https://data.elexon.co.uk")
    monkeypatch.setattr(
        main,
        "fetch_windfor_records",
        lambda: (_ for _ in ()).throw(httpx.ConnectError("offline", request=request)),
    )

    response = TestClient(main.app).get("/api/wind-forecast")

    assert response.status_code == 502
    assert response.json() == {
        "detail": "Unable to retrieve a valid wind forecast from Elexon"
    }
