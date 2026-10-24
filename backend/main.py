import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from forecast import ForecastResponse, fetch_windfor_records, select_day_ahead_forecast

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
def wind_forecast():
    try:
        records = fetch_windfor_records()
        return select_day_ahead_forecast(records)
    except (httpx.HTTPError, ValueError) as error:
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve a valid wind forecast from Elexon",
        ) from error
