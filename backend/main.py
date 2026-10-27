from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from actuals import (
    WindComparisonResponse,
    build_wind_comparison,
    fetch_fuelhh_records,
    select_half_hour_actuals,
)
from forecast import (
    DEFAULT_CUTOFF_TIME,
    DEFAULT_DECISION_DATE,
    ForecastResponse,
    fetch_windfor_records,
    parse_scenario,
    select_day_ahead_forecast,
)
from range_analysis import (
    ALL_DAYS_FAILURE_MESSAGE,
    WindAccuracyResponse,
    analyze_accuracy_range,
    parse_accuracy_range,
)
from source_data import records_retrieved_at

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/test")
def test_endpoint():
    return {"message": "Hello from FastAPI backend"}


@app.get("/api/wind-forecast", response_model=ForecastResponse)
def wind_forecast(
    decision_date: str = DEFAULT_DECISION_DATE,
    cutoff_time: str = DEFAULT_CUTOFF_TIME,
):
    try:
        decision_time, delivery_date = parse_scenario(decision_date, cutoff_time)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    try:
        records = fetch_windfor_records(decision_time)
        return select_day_ahead_forecast(records, decision_time, delivery_date)
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve a valid wind forecast from Elexon",
        ) from error


@app.get("/api/wind-comparison", response_model=WindComparisonResponse)
def wind_comparison(
    decision_date: str = DEFAULT_DECISION_DATE,
    cutoff_time: str = DEFAULT_CUTOFF_TIME,
):
    try:
        decision_time, delivery_date = parse_scenario(decision_date, cutoff_time)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    try:
        forecast_records = fetch_windfor_records(decision_time)
        forecast = select_day_ahead_forecast(
            forecast_records, decision_time, delivery_date
        )
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve a valid wind forecast from Elexon",
        ) from error

    try:
        actual_records = fetch_fuelhh_records(delivery_date)
        actuals = select_half_hour_actuals(actual_records, delivery_date)
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve valid actual wind generation from Elexon",
        ) from error

    return build_wind_comparison(
        forecast, actuals, records_retrieved_at(actual_records)
    )


@app.get("/api/wind-accuracy", response_model=WindAccuracyResponse)
def wind_accuracy(
    decision_date_from: str,
    decision_date_to: str,
    cutoff_time: str = DEFAULT_CUTOFF_TIME,
):
    try:
        start, end, cutoff = parse_accuracy_range(
            decision_date_from, decision_date_to, cutoff_time
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error

    result = analyze_accuracy_range(start, end, cutoff)
    if result.day_counts.successful_days == 0:
        raise HTTPException(status_code=502, detail=ALL_DAYS_FAILURE_MESSAGE)
    return result


# The production container copies the Vite build here. Keep this mount after all
# API routes so that /api requests are handled by FastAPI first.
frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
