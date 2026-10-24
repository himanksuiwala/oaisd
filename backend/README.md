# Backend (FastAPI)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

- Forecast endpoint: `GET /api/wind-forecast`
- Optional query parameters: `decision_date=YYYY-MM-DD` and `cutoff_time=HH:mm` (UTC).
- Defaults: `decision_date=2026-01-15` and `cutoff_time=10:00`.
- Decision dates are restricted to January 2026; invalid inputs return HTTP 422.
- Comparison endpoint: `GET /api/wind-comparison` with the same query parameters and defaults.
- The comparison averages the WIND FUELHH readings at H and H+30 and returns signed forecast-minus-actual error for matched hours.
- The comparison includes MAE, bias, and RMSE calculated from its matched hourly rows, plus complete/partial/unavailable coverage metadata.
- Range endpoint: `GET /api/wind-accuracy?decision_date_from=2026-01-01&decision_date_to=2026-01-31&cutoff_time=10:00`.
- Range metrics pool matched hourly errors. Source access is limited to four concurrent requests and successful validated responses are cached process-locally for 15 minutes (128-entry LRU).
